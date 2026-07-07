import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

// One-off cleanup of Robin's test data (July 2026 tests):
// - delete the "SADECROUS" test production (archived + validated count)
// - delete Robin's July payout
// - reset Robin's XP events and achievements
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const robin = await db.user.findFirst({ where: { name: { contains: 'Robin', mode: 'insensitive' }, role: 'freelancer' } })

    const deletedProds = await db.production.deleteMany({ where: { title: { contains: 'SADECROUS', mode: 'insensitive' } } })

    let deletedPayouts = { count: 0 }, deletedXp = { count: 0 }, deletedAch = { count: 0 }
    if (robin) {
      deletedPayouts = await db.monthlyPayout.deleteMany({ where: { freelancerId: robin.id } })
      deletedXp = await db.xpEvent.deleteMany({ where: { userId: robin.id } })
      deletedAch = await db.achievement.deleteMany({ where: { userId: robin.id } })
    }

    return NextResponse.json({
      ok: true,
      robinFound: !!robin,
      deleted: {
        productions: deletedProds.count,
        payouts: deletedPayouts.count,
        xpEvents: deletedXp.count,
        achievements: deletedAch.count,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
