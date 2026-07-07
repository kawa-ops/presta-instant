import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { awardXp, unlockAchievement, ACHIEVEMENTS } from '@/lib/gamify'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Admin-only: grant bonus XP or unlock a badge for any user (special rewards)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, xp, reason, achievementKey } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  try {
    if (achievementKey) {
      if (!ACHIEVEMENTS[achievementKey]) return NextResponse.json({ error: 'Succès inconnu' }, { status: 400 })
      await unlockAchievement(userId, achievementKey)
    }
    if (xp && xp > 0) {
      // Bonus XP bypasses the daily cap: it's an explicit admin reward
      await db.xpEvent.create({ data: { userId, amount: Math.min(parseInt(xp), 1000), reason: reason || `🎁 Bonus offert par ${session.user?.name || 'Admin'}` } })
      await db.notification.create({ data: { userId, type: 'achievement', message: `🎁 ${session.user?.name || 'Admin'} t'a offert +${Math.min(parseInt(xp), 1000)} XP${reason ? ` — ${reason}` : ''} !`, link: '/espace' } }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
