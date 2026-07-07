import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { levelFromXp, rankFor } from '@/lib/gamify'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Studio ranking — playful, collaboration-first (levels + productions, no money)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [xpByUser, users, validatedByUser] = await Promise.all([
      db.xpEvent.groupBy({ by: ['userId'], _sum: { amount: true } }),
      db.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true, profilePicUrl: true } }),
      db.production.groupBy({ by: ['assignedToId'], where: { status: 'valide' }, _count: true }),
    ])

    const xpMap: Record<string, number> = {}
    xpByUser.forEach((r: any) => { xpMap[r.userId] = r._sum.amount || 0 })
    const prodMap: Record<string, number> = {}
    validatedByUser.forEach((r: any) => { if (r.assignedToId) prodMap[r.assignedToId] = r._count })

    const board = users
      .map((u: any) => {
        const xp = xpMap[u.id] || 0
        const level = levelFromXp(xp)
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          profilePicUrl: u.profilePicUrl || null,
          xp, level,
          prestige: Math.floor(level / 20),
          rank: rankFor(level, u.role),
          productions: prodMap[u.id] || 0,
          isMe: u.id === (session.user as any).id,
        }
      })
      .sort((a: any, b: any) => b.xp - a.xp)
      .slice(0, 8)

    return NextResponse.json(board, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
