import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailTaskCompleted } from '@/lib/mail'
import { waProduction } from '@/lib/whatsapp'
import { getLucasId } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = (session.user as any).role === 'admin'
  const userId = (session.user as any).id
  try {
    const prod = await db.production.findUnique({
      where: { id: params.id },
      include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } },
    })
    if (!prod) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isAdmin) {
      if (prod.assignedToId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const { internalNotes, clientPrice, ...rest } = prod
      return NextResponse.json(rest)
    }
    return NextResponse.json(prod)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const isAdmin = (session.user as any).role === 'admin'
  const userId = (session.user as any).id
  const data: any = {}

  // Freelancers may only touch productions assigned to them, and only
  // move them through their own workflow steps.
  if (!isAdmin) {
    const owned = await db.production.findUnique({ where: { id: params.id }, select: { assignedToId: true } })
    if (!owned || owned.assignedToId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const ALLOWED_FREELANCER_STATUSES = ['en_cours', 'livre']
    if (body.status !== undefined && !ALLOWED_FREELANCER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Statut non autorisé' }, { status: 403 })
    }
  }

  if (isAdmin) {
    const fields = ['title', 'client', 'brief', 'sourcesLink', 'deliveryLink', 'priority', 'status', 'internalNotes', 'archived']
    fields.forEach(f => { if (body[f] !== undefined) data[f] = body[f] })
    // Revision request: store the comments and send the task back to the freelancer
    if (body.feedback) {
      data.lastFeedback = body.feedback
      if (body.status === undefined) data.status = 'revisions'
    }
    if (body.price !== undefined) data.price = body.price !== null && body.price !== '' ? parseFloat(body.price) : null
    if (body.clientPrice !== undefined) data.clientPrice = body.clientPrice !== null && body.clientPrice !== '' ? parseFloat(body.clientPrice) : null
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
    if (body.productionDate !== undefined) data.productionDate = body.productionDate ? new Date(body.productionDate) : null
    if (body.assignedToId !== undefined) {
      data.assignedToId = body.assignedToId || await getLucasId()
    }
  } else {
    // Freelancers can only update status and delivery link
    if (body.status !== undefined) data.status = body.status
    if (body.deliveryLink !== undefined) data.deliveryLink = body.deliveryLink
  }

  try {
    // Read previous state: status (payout double-count guard) + deliveryLink (version history)
    const before = await db.production.findUnique({ where: { id: params.id }, select: { status: true, deliveryLink: true } })

    const prod = await db.production.update({
      where: { id: params.id },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    })

    // Fire-and-forget side effects
    db.activityLog.create({ data: { actorName: session.user?.name || '?', action: 'a mis à jour', target: prod.title } }).catch(() => {})

    // Keep a version history of every distinct delivery link (V1, V2, V3…)
    if (data.deliveryLink && data.deliveryLink !== before?.deliveryLink) {
      db.deliveryVersion.count({ where: { productionId: params.id } }).then((count: number) =>
        db.deliveryVersion.create({ data: { productionId: params.id, url: data.deliveryLink, version: count + 1 } })
      ).catch(() => {})
    }

    if (body.status === 'livre') {
      emailTaskCompleted(prod.title, prod.assignedTo?.name || 'Prestataire').catch(() => {})
      waProduction(`🎬 ${prod.assignedTo?.name || 'Un prestataire'} a livré "${prod.title}" — en attente de ta validation.`).catch(() => {})
      // Notify admins in-app
      db.user.findMany({ where: { role: 'admin' } }).then((admins: any[]) => {
        for (const a of admins) {
          db.notification.create({ data: { userId: a.id, type: 'task_completed', message: `${prod.assignedTo?.name || 'Un prestataire'} a livré : ${prod.title}`, link: '/productions' } }).catch(() => {})
        }
      }).catch(() => {})
    }

    // Workflow notifications to the assigned freelancer
    const lucasIdForNotif = await getLucasId()
    const notifyFreelancer = (message: string) => {
      if (prod.assignedToId && prod.assignedToId !== lucasIdForNotif) {
        db.notification.create({ data: { userId: prod.assignedToId, type: 'workflow', message, link: '/espace/prestations' } }).catch(() => {})
      }
    }
    if (isAdmin && body.feedback) {
      notifyFreelancer(`✎ Retours de Lucas sur "${prod.title}" : ${body.feedback}`)
    } else if (isAdmin && body.status === 'envoye_client') {
      notifyFreelancer(`✓ "${prod.title}" a été approuvé et envoyé au client`)
    } else if (isAdmin && body.status === 'retours_client') {
      notifyFreelancer(`💬 Retours client reçus sur "${prod.title}"`)
      waProduction(`💬 Retours client reçus sur "${prod.title}".`).catch(() => {})
    }

    // Accumulate into monthly payout when admin validates a freelancer's paid production
    // (only on transition to 'valide', never twice)
    // Payout credit requires an ADMIN validation — never a self-set status
    if (isAdmin && body.status === 'valide' && before?.status !== 'valide' && prod.assignedToId && prod.price) {
      const lucasId = lucasIdForNotif
      if (prod.assignedToId !== lucasId) {
        const month = new Date().toISOString().slice(0, 7)
        const existing = await db.monthlyPayout.findUnique({
          where: { freelancerId_month: { freelancerId: prod.assignedToId, month } },
        }).catch(() => null)
        if (existing) {
          await db.monthlyPayout.update({
            where: { id: existing.id },
            data: { validatedAmount: existing.validatedAmount + prod.price, projectCount: existing.projectCount + 1 },
          }).catch(() => {})
        } else {
          await db.monthlyPayout.create({
            data: { freelancerId: prod.assignedToId, month, validatedAmount: prod.price, projectCount: 1 },
          }).catch(() => {})
        }
        db.notification.create({ data: { userId: prod.assignedToId, type: 'task_validated', message: `Prestation validée : ${prod.title} (+${prod.price.toLocaleString('fr-FR')} €)`, link: '/espace/facturation' } }).catch(() => {})
      }
    }

    return NextResponse.json(prod)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await db.production.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
