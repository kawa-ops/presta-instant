import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { waProduction } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Vercel Cron — end-of-day summary at 18h (see vercel.json)
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999)
  const startTomorrow = new Date(startToday); startTomorrow.setDate(startTomorrow.getDate() + 1)
  const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1)

  try {
    const [completedToday, pendingValidations, retoursClient, overdue, tomorrow] = await Promise.all([
      db.production.count({ where: { status: 'valide', updatedAt: { gte: startToday } } }),
      db.production.count({ where: { archived: false, status: 'livre' } }),
      db.production.count({ where: { archived: false, status: 'retours_client' } }),
      db.production.count({ where: { archived: false, status: { notIn: ['valide'] }, deadline: { lt: startToday } } }),
      db.production.findMany({
        where: { archived: false, status: { notIn: ['valide'] }, deadline: { gte: startTomorrow, lte: endTomorrow } },
        include: { assignedTo: { select: { name: true } } },
        take: 5,
      }),
    ])

    const lines: string[] = [`🌙 Résumé de la journée`]
    lines.push('')
    lines.push(`✅ ${completedToday} projet${completedToday > 1 ? 's' : ''} terminé${completedToday > 1 ? 's' : ''} aujourd'hui${completedToday >= 3 ? ' — belle journée ! 💪' : ''}`)
    if (pendingValidations > 0) lines.push(`🟣 ${pendingValidations} livraison${pendingValidations > 1 ? 's' : ''} en attente de validation`)
    if (retoursClient > 0) lines.push(`💬 ${retoursClient} retour${retoursClient > 1 ? 's' : ''} client à traiter`)
    if (overdue > 0) lines.push(`⚠ ${overdue} projet${overdue > 1 ? 's' : ''} en retard`)
    if (tomorrow.length > 0) {
      lines.push('')
      lines.push(`📅 Demain :`)
      tomorrow.forEach((p: any) => lines.push(`• ${p.title} (${p.assignedTo?.name || 'Lucas'})`))
    }
    if (pendingValidations === 0 && retoursClient === 0 && overdue === 0 && tomorrow.length === 0) {
      lines.push('')
      lines.push('🧘 Rien en attente — soirée tranquille.')
    }

    await waProduction(lines.join('\n'))
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
