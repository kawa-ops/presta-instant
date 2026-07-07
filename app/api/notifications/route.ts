import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const unreadOnly = new URL(req.url).searchParams.get('unread') === 'true'

  try {
    const notifs = await db.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json(notifs)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { id } = await req.json()

  try {
    if (id) {
      await db.notification.update({ where: { id }, data: { read: true } })
    } else {
      await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
    }

    // Inbox Zéro: once a day, reward clearing every notification
    const { awardXp } = await import('@/lib/gamify')
    const remaining = await db.notification.count({ where: { userId, read: false } }).catch(() => 1)
    if (remaining === 0) {
      const startDay = new Date(); startDay.setHours(0, 0, 0, 0)
      const already = await db.xpEvent.findFirst({ where: { userId, reason: 'Inbox vidée', createdAt: { gte: startDay } } }).catch(() => null)
      if (!already) awardXp(userId, 10, 'Inbox vidée').catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
