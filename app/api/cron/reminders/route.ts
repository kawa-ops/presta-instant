import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailDeadlineReminder } from '@/lib/mail'
import { waProduction, waFreelancer } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Called by Vercel Cron every morning (see vercel.json)
export async function GET(req: NextRequest) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" when the env var is set
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    // Morning WhatsApp digest (once a day, actionable only)
    const overdueCount = await db.production.count({
      where: { archived: false, status: { notIn: ['valide'] }, deadline: { lt: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }).catch(() => 0)
    const lines = prods.slice(0, 5).map((p: any) => `• ${p.title} (${p.assignedTo?.name || 'Lucas'})`).join('\n')
    waProduction(`☀️ Brief du matin\n\n${prods.length} à livrer demain :\n${lines}${overdueCount > 0 ? `\n\n⚠ ${overdueCount} prestation${overdueCount > 1 ? 's' : ''} en retard` : ''}`).catch(() => {})

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
  } finally {
    // Nudge freelancers whose assigned task is still "À faire" 48h after creation
    try {
      const cutoff = new Date(Date.now() - 48 * 3600 * 1000)
      const stale = await db.production.findMany({
        where: { archived: false, status: 'a_faire', createdAt: { lt: cutoff }, assignedToId: { not: null } },
        include: { assignedTo: { select: { id: true, email: true } } },
      })
      for (const p of stale) {
        if (p.assignedTo?.email === 'lucas.rawinstant@gmail.com') continue
        // One nudge per production max — skip if already sent
        const already = await db.notification.findFirst({ where: { userId: p.assignedToId, type: 'nudge', message: { contains: p.title } } }).catch(() => null)
        if (already) continue
        await db.notification.create({
          data: { userId: p.assignedToId, type: 'nudge', message: `Rappel : "${p.title}" n'a pas encore été démarré`, link: '/espace/prestations' },
        }).catch(() => {})
      }
    } catch {}

    // Escalation ladder — one alert per production per tier (dedup via the
    // paired in-app notification, same pattern as the nudge above)
    try {
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
      const endTmr = new Date(startToday); endTmr.setDate(endTmr.getDate() + 1); endTmr.setHours(23, 59, 59, 999)

      // Tier 1 — deadline tomorrow, still not delivered → direct WhatsApp to the freelancer
      const dueSoon = await db.production.findMany({
        where: { archived: false, status: { in: ['a_faire', 'en_cours'] }, deliveryLink: null, deadline: { gte: startToday, lte: endTmr }, assignedToId: { not: null } },
        include: { assignedTo: { select: { id: true, name: true, phone: true, email: true } } },
      })
      for (const p of dueSoon) {
        if (p.assignedTo?.email === 'lucas.rawinstant@gmail.com') continue
        const already = await db.notification.findFirst({ where: { userId: p.assignedToId, type: 'escalade_demain', message: { contains: p.title } } }).catch(() => null)
        if (already) continue
        await db.notification.create({
          data: { userId: p.assignedToId, type: 'escalade_demain', message: `⏰ "${p.title}" doit être livré demain et rien n'a encore été déposé`, link: '/espace/prestations' },
        }).catch(() => {})
        if (p.assignedTo?.phone) {
          waFreelancer(p.assignedTo.phone, `⏰ Bonjour ${p.assignedTo.name}, rappel : "${p.title}" doit être livré demain et aucun lien de livraison n'a encore été déposé. Tu peux livrer depuis ton espace instant.`).catch(() => {})
        }
      }

      // Tier 2 — deadline passed, still not delivered → suggest reassignment to the admins
      const lateProds = await db.production.findMany({
        where: { archived: false, status: { in: ['a_faire', 'en_cours'] }, deliveryLink: null, deadline: { lt: startToday }, assignedToId: { not: null } },
        include: { assignedTo: { select: { name: true } } },
      })
      const admins = lateProds.length > 0 ? await db.user.findMany({ where: { role: 'admin' }, select: { id: true } }).catch(() => []) : []
      for (const p of lateProds) {
        const already = await db.notification.findFirst({ where: { type: 'escalade_retard', message: { contains: p.title } } }).catch(() => null)
        if (already) continue
        for (const a of admins) {
          await db.notification.create({
            data: { userId: a.id, type: 'escalade_retard', message: `⚠️ "${p.title}" (${p.assignedTo?.name || '—'}) a dépassé sa deadline sans livraison — suggérer une réassignation ?`, link: '/productions' },
          }).catch(() => {})
        }
      }

      // Client follow-up — sent to client 48h+ ago, still no approval → remind the admins
      const cutoff48 = new Date(Date.now() - 48 * 3600 * 1000)
      const waitingClient = await db.production.findMany({
        where: { archived: false, status: 'envoye_client', clientApprovedAt: null, updatedAt: { lt: cutoff48 } },
        select: { id: true, title: true, client: true },
      })
      const admins2 = waitingClient.length > 0 ? await db.user.findMany({ where: { role: 'admin' }, select: { id: true } }).catch(() => []) : []
      for (const p of waitingClient) {
        // Max one reminder every 2 days per production
        const recent = await db.notification.findFirst({
          where: { type: 'relance_client', message: { contains: p.title }, createdAt: { gte: cutoff48 } },
        }).catch(() => null)
        if (recent) continue
        for (const a of admins2) {
          await db.notification.create({
            data: { userId: a.id, type: 'relance_client', message: `📨 Le client de "${p.title}" (${p.client}) n'a pas encore relu — pense à relancer`, link: '/productions' },
          }).catch(() => {})
        }
        waProduction(`📨 Relance client : "${p.title}" (${p.client}) est chez le client depuis 48h+ sans validation — pense à relancer.`).catch(() => {})
      }
    } catch {}
  }
}
