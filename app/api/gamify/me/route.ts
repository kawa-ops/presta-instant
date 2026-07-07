import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { levelFromXp, thresholdFor, rankFor, computeStreak, ACHIEVEMENTS } from '@/lib/gamify'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role

  const startDay = new Date(); startDay.setHours(0, 0, 0, 0)
  const startWeek = new Date(startDay); startWeek.setDate(startWeek.getDate() - ((startWeek.getDay() + 6) % 7))

  try {
    const [totalAgg, studioAgg, achievements, recentEvents, streak, todayAgg, weekAgg, approvals, validated, totalAssigned] = await Promise.all([
      db.xpEvent.aggregate({ _sum: { amount: true }, where: { userId } }),
      db.xpEvent.aggregate({ _sum: { amount: true } }),
      db.achievement.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      db.xpEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      computeStreak(userId),
      db.xpEvent.aggregate({ _sum: { amount: true }, where: { userId, createdAt: { gte: startDay } } }),
      db.xpEvent.aggregate({ _sum: { amount: true }, where: { userId, createdAt: { gte: startWeek } } }),
      db.xpEvent.count({ where: { userId, reason: 'Approbation client' } }),
      role === 'admin'
        ? db.production.count({ where: { status: 'valide' } })
        : db.production.count({ where: { assignedToId: userId, status: 'valide' } }),
      role === 'admin'
        ? db.production.count()
        : db.production.count({ where: { assignedToId: userId } }),
    ])
    const me = await db.user.findUnique({ where: { id: userId }, select: { profilePicUrl: true } }).catch(() => null)

    const xp = totalAgg._sum.amount || 0
    const level = levelFromXp(xp)
    const currentThreshold = thresholdFor(level)
    const nextThreshold = thresholdFor(level + 1)
    const progress = Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100)

    const studioXp = studioAgg._sum.amount || 0

    // Prestige: one tier every 20 levels — purely cosmetic
    const prestige = Math.floor(level / 20)

    return NextResponse.json({
      xp, level, progress,
      xpInLevel: xp - currentThreshold,
      xpForNext: nextThreshold - currentThreshold,
      rank: rankFor(level, role),
      nextRank: rankFor(level + 1, role) !== rankFor(level, role) ? rankFor(level + 1, role) : null,
      streak,
      prestige,
      profilePicUrl: me?.profilePicUrl || null,
      xpToday: todayAgg._sum.amount || 0,
      xpWeek: weekAgg._sum.amount || 0,
      approvals,
      validated,
      completionRate: totalAssigned > 0 ? Math.round((validated / totalAssigned) * 100) : 0,
      studioLevel: levelFromXp(studioXp),
      achievements: achievements.map((a: any) => ({ key: a.key, ...ACHIEVEMENTS[a.key], unlockedAt: a.createdAt })).filter((a: any) => a.label),
      locked: Object.entries(ACHIEVEMENTS)
        .filter(([k]) => !achievements.some((a: any) => a.key === k))
        .map(([key, def]) => ({ key, ...def })),
      recentEvents,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
