import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailDeadlineReminder } from '@/lib/mail'
import { ensureSchema } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Called by Vercel Cron every morning (see vercel.json)
export async function GET(req: NextRequest) {
  await ensureSchema()

  const startTomorrow = new Date()
  startTomorrow.setDate(startTomorrow.getDate() + 1)
  startTomorrow.setHours(0, 0, 0, 0)
  const endTomorrow = new Date(startTomorrow)
  endTomorrow.setHours(23, 59, 59, 999)

  try {
    const prods = await db.production.findMany({
      where: {
        archived: false,
        status: { notIn: ['valide'] },
        deadline: { gte: startTomorrow, lte: endTomorrow },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    })

    if (prods.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    // Email Lucas with the full list
    await emailDeadlineReminder(prods.map((p: any) => ({ title: p.title, client: p.client, assignee: p.assignedTo?.name || '—' })))

    // In-app notification for each assigned freelancer
    for (const p of prods) {
      if (p.assignedToId) {
        await db.notification.create({
          data: { userId: p.assignedToId, type: 'deadline_reminder', message: `Rappel : "${p.title}" doit être livré demain`, link: '/espace/prestations' },
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, sent: prods.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
