import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailTaskCompleted } from '@/lib/mail'
import { ensureSchema, getLucasId } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema()
  try {
    const prod = await db.production.findUnique({
      where: { id: params.id },
      include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } },
    })
    if (!prod) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(prod)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema()
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const isAdmin = (session.user as any).role === 'admin'
  const data: any = {}

  if (isAdmin) {
    const fields = ['title', 'client', 'brief', 'sourcesLink', 'deliveryLink', 'priority', 'status', 'internalNotes', 'archived']
    fields.forEach(f => { if (body[f] !== undefined) data[f] = body[f] })
    if (body.price !== undefined) data.price = body.price !== null && body.price !== '' ? parseFloat(body.price) : null
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
    const prod = await db.production.update({
      where: { id: params.id },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    })

    // Fire-and-forget side effects
    db.activityLog.create({ data: { actorName: session.user?.name || '?', action: 'a mis à jour', target: prod.title } }).catch(() => {})

    if (body.status === 'livre') {
      emailTaskCompleted(prod.title, prod.assignedTo?.name || 'Prestataire').catch(() => {})
      // Notify admins in-app
      db.user.findMany({ where: { role: 'admin' } }).then((admins: any[]) => {
        for (const a of admins) {
          db.notification.create({ data: { userId: a.id, type: 'task_completed', message: `${prod.assignedTo?.name || 'Un prestataire'} a livré : ${prod.title}`, link: '/productions' } }).catch(() => {})
        }
      }).catch(() => {})
    }

    // Accumulate into monthly payout when admin validates a freelancer's paid production
    if (body.status === 'valide' && prod.assignedToId && prod.price) {
      const lucasId = await getLucasId()
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
