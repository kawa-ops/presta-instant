import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Ranks providers for a new production: current load (active jobs),
// average cycle time (creation → first delivery, from ProductionEvent),
// and availability on the planned deadline. Pure scoring — no AI needed.

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deadline = new URL(req.url).searchParams.get('deadline') // YYYY-MM-DD

  try {
    const freelancers = await db.user.findMany({
      where: { role: 'freelancer', active: true },
      select: { id: true, name: true, specialty: true, unavailableDates: true },
    })
    if (freelancers.length === 0) return NextResponse.json({ suggestions: [] })

    const ids = freelancers.map((f: any) => f.id)
    const [activeCounts, delivered] = await Promise.all([
      db.production.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: ids }, archived: false, status: { notIn: ['valide'] } },
        _count: { _all: true },
      }),
      // Recent deliveries with their creation date + first 'livre' event
      db.production.findMany({
        where: { assignedToId: { in: ids }, events: { some: { status: 'livre' } } },
        select: { assignedToId: true, createdAt: true, events: { where: { status: 'livre' }, orderBy: { createdAt: 'asc' }, take: 1, select: { createdAt: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 120,
      }),
    ])

    const loadMap: Record<string, number> = {}
    activeCounts.forEach((r: any) => { if (r.assignedToId) loadMap[r.assignedToId] = r._count._all })

    const cycles: Record<string, number[]> = {}
    delivered.forEach((p: any) => {
      const first = p.events?.[0]?.createdAt
      if (!first || !p.assignedToId) return
      const days = (new Date(first).getTime() - new Date(p.createdAt).getTime()) / 86400000
      if (days >= 0 && days < 60) (cycles[p.assignedToId] = cycles[p.assignedToId] || []).push(days)
    })

    const suggestions = freelancers.map((f: any) => {
      const load = loadMap[f.id] || 0
      const c = cycles[f.id] || []
      const avgCycle = c.length > 0 ? c.reduce((a, b) => a + b, 0) / c.length : null
      let off = false
      if (deadline) {
        try { off = JSON.parse(f.unavailableDates || '[]').includes(deadline.slice(0, 10)) } catch {}
      }
      // Score: light load dominates, fast cycle helps, off-day disqualifies softly
      let score = 100 - load * 18 - (avgCycle !== null ? avgCycle * 4 : 10)
      if (off) score -= 100
      const reasons: string[] = []
      reasons.push(load === 0 ? 'aucun projet en cours' : `${load} projet${load > 1 ? 's' : ''} en cours`)
      if (avgCycle !== null) reasons.push(`cycle moyen ${avgCycle < 1 ? '<1' : Math.round(avgCycle)} j`)
      if (f.specialty) reasons.push(f.specialty)
      if (off) reasons.push('🏖 off ce jour-là')
      return { id: f.id, name: f.name, specialty: f.specialty, load, avgCycle, off, score, reason: reasons.join(' · ') }
    }).sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({ suggestions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
