import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailTaskCompleted, emailInvoicePaid } from '@/lib/mail'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prod = await db.production.findUnique({
      where: { id: params.id },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    })
    if (!prod) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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

  const data: any = { updatedAt: new Date() }

  if (isAdmin) {
    const { title, client, brief, sourcesLink, deliveryLink, priority, status, price, deadline, internalNotes, assignedToId, archived } = body
    if (title !== undefined) data.title = title
    if (client !== undefined) data.client = client
    if (brief !== undefined) data.brief = brief
    if (sourcesLink !== undefined) data.sourcesLink = sourcesLink
    if (deliveryLink !== undefined) data.deliveryLink = deliveryLink
    if (priority !== undefined) data.priority = priority
    if (status !== undefined) data.status = status
    if (price !== undefined) data.price = price ? parseFloat(price) : null
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null
    if (internalNotes !== undefined) data.internalNotes = internalNotes
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null
    if (archived !== undefined) data.archived = archived
  } else {
    // Freelancer can only update status and deliveryLink
    if (body.status !== undefined) data.status = body.status
    if (body.deliveryLink !== undefined) data.deliveryLink = body.deliveryLink
  }

  try {
    const prod = await db.production.update({ where: { id: params.id }, data, include: { assignedTo: true } })

    await db.activityLog.create({ data: { actorName: session.user?.name || '?', action: 'a mis à jour', target: prod.title } }).catch(() => {})

    // Notify Lucas when status = livre
    if (body.status === 'livre') {
      emailTaskCompleted(prod.title, prod.assignedTo?.name || 'Prestataire').catch(() => {})
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
