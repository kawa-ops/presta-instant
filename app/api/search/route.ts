import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Global search (cmd+K) — admin: all productions + providers;
// freelancer: only their own productions.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = (session.user as any).role === 'admin'
  const userId = (session.user as any).id

  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ productions: [], freelancers: [] })

  try {
    const prodWhere: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { client: { contains: q, mode: 'insensitive' } },
      ],
    }
    if (!isAdmin) prodWhere.assignedToId = userId

    const [productions, freelancers] = await Promise.all([
      db.production.findMany({
        where: prodWhere,
        select: { id: true, title: true, client: true, status: true, archived: true, assignedTo: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      isAdmin
        ? db.user.findMany({
            where: { role: 'freelancer', name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, specialty: true },
            take: 5,
          })
        : Promise.resolve([]),
    ])
    return NextResponse.json({ productions, freelancers })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
