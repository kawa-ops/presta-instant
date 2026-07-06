import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Wipes all demo/production data while keeping user accounts and features intact.
// Admin-only, triggered manually once.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [invoices, payouts, notifications, activity, productions] = await Promise.all([
      db.invoice.deleteMany({}),
      db.monthlyPayout.deleteMany({}),
      db.notification.deleteMany({}),
      db.activityLog.deleteMany({}),
      db.production.deleteMany({}),
    ])
    return NextResponse.json({
      ok: true,
      message: 'Base réinitialisée — comptes conservés',
      deleted: {
        productions: productions.count,
        payouts: payouts.count,
        invoices: invoices.count,
        notifications: notifications.count,
        activity: activity.count,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
