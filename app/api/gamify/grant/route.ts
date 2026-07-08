import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { awardXp, unlockAchievement, ACHIEVEMENTS, thresholdFor } from '@/lib/gamify'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Admin-only: grant bonus XP or unlock a badge for any user (special rewards)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, xp, reason, achievementKey, setLevel } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  // Set an exact level (level & prestige management): adjusts XP to the level's floor
  if (setLevel !== undefined && setLevel !== null) {
    const target = Math.max(0, Math.min(parseInt(setLevel), 99))
    const agg = await db.xpEvent.aggregate({ _sum: { amount: true }, where: { userId } })
    const current = agg._sum.amount || 0
    const delta = thresholdFor(target) - current
    if (delta !== 0) {
      await db.xpEvent.create({ data: { userId, amount: delta, reason: `Ajustement de niveau par ${session.user?.name || 'Admin'} (Niv. ${target})` } })
    }
    return NextResponse.json({ ok: true, level: target })
  }

  try {
    if (achievementKey) {
      if (achievementKey.startsWith('custom_')) {
        // Admin-created achievement: unlock manually
        const customId = achievementKey.replace('custom_', '')
        const def = await db.customAchievement.findUnique({ where: { id: customId } })
        if (!def) return NextResponse.json({ error: 'Succès inconnu' }, { status: 400 })
        const existing = await db.achievement.findUnique({ where: { userId_key: { userId, key: achievementKey } } }).catch(() => null)
        if (!existing) {
          await db.achievement.create({ data: { userId, key: achievementKey } })
          await db.xpEvent.create({ data: { userId, amount: def.xp, reason: `Succès : ${def.label}` } }).catch(() => {})
          await db.notification.create({ data: { userId, type: 'achievement', message: `${def.emoji} Succès débloqué : ${def.label} (+${def.xp} XP)`, link: '/espace/profil' } }).catch(() => {})
        }
      } else {
        if (!ACHIEVEMENTS[achievementKey]) return NextResponse.json({ error: 'Succès inconnu' }, { status: 400 })
        await unlockAchievement(userId, achievementKey)
      }
    }
    if (xp && parseInt(xp) !== 0) {
      // Admin adjustment bypasses the daily cap; negative values allowed for corrections
      const amount = Math.max(-5000, Math.min(parseInt(xp), 5000))
      await db.xpEvent.create({ data: { userId, amount, reason: reason || (amount > 0 ? `🎁 Bonus offert par ${session.user?.name || 'Admin'}` : `Ajustement par ${session.user?.name || 'Admin'}`) } })
      if (amount > 0) {
        await db.notification.create({ data: { userId, type: 'achievement', message: `🎁 ${session.user?.name || 'Admin'} t'a offert +${amount} XP${reason ? ` — ${reason}` : ''} !`, link: '/espace' } }).catch(() => {})
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
