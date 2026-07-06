import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailWeeklyRecap } from '@/lib/mail'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Vercel Cron — every Monday morning (see vercel.json)
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const now = new Date()
  const startWeek = new Date(now); startWeek.setHours(0, 0, 0, 0)
  const endWeek = new Date(startWeek); endWeek.setDate(endWeek.getDate() + 7); endWeek.setHours(23, 59, 59, 999)

  try {
    const [weekProds, overdueCount, pendingInvoices] = await Promise.all([
      db.production.findMany({
        where: { archived: false, status: { notIn: ['valide'] }, deadline: { gte: startWeek, lte: endWeek } },
        orderBy: { deadline: 'asc' },
        include: { assignedTo: { select: { name: true } } },
      }),
      db.production.count({ where: { archived: false, status: { notIn: ['valide'] }, deadline: { lt: startWeek } } }),
      db.monthlyPayout.count({ where: { invoiceStatus: 'uploaded' } }),
    ])

    await emailWeeklyRecap({
      weekProjects: weekProds.map((p: any) => ({
        title: p.title,
        client: p.client,
        assignee: p.assignedTo?.name || '—',
        deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) : '—',
      })),
      overdueCount,
      pendingInvoices,
    })

    return NextResponse.json({ ok: true, week: weekProds.length, overdue: overdueCount })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
