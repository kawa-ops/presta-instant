import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailTaskCompleted } from '@/lib/mail'

export const dynamic = 'force-dynamic'
const db = prisma as any

async function getLucasId() {
  const lucas = await db.user.findFirst({ where: { email: 'lucas.rawinstant@gmail.com' } }).catch(() => null)
  return lucas?.id || null
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const isAdmin = (session.user as any).role === 'admin'
  const data: any = { updatedAt: new Date() }

  if (isAdmin) {
    const fields = ['title', 'client', 'brief', 'sourcesLink', 'deliveryLink', 'priority', 'status', 'internalNotes', 'archived']
    fields.forEach(f => { if (body[f] !== undefined) data[f] = body[f] })
    if (body.price !== undefined) data.price = body.price ? parseFloat(body.price) : null
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
    if (body.productionDate !== undefined) data.productionDate = body.productionDate ? new Date(body.productionDate) : null
    if (body.assignedToId !== undefined) {
      data.assignedToId = body.assignedToId || await getLucasId()
    }
  } else {
    if (body.status !== undefined) data.status = body.status
    if (body.deliveryLink !== undefined) data.deliveryLink = body.deliveryLink
  }

  try {
    const prod = await db.production.update({
      where: { id: params.id },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    })
    await db.activityLog.create({ data: { actorName: session.user?.name || '?', action: 'a mis à jour', target: prod.title } }).catch(() => {})
    if (body.status === 'livre') {
      emailTaskCompleted(prod.title, prod.assignedTo?.name || 'Prestataire').catch(() => {})
    }
    // Update monthly payout when status = valide
    if (body.status === 'valide' && prod.assignedToId && prod.price) {
      const lucasId = await getLucasId()
      if (prod.assignedToId !== lucasId) {
        const month = new Date().toISOString().slice(0, 7) // "2026-07"
        await db.$executeRawUnsafe(`
          INSERT INTO "MonthlyPayout" ("id", "freelancerId", month, "validatedAmount", "projectCount", "updatedAt")
          VALUES (gen_random_uuid()::text, $1, $2, $3, 1, NOW())
          ON CONFLICT ("freelancerId", month) DO UPDATE
          SET "validatedAmount" = "MonthlyPayout"."validatedAmount" + $3,
              "projectCount" = "MonthlyPayout"."projectCount" + 1,
              "updatedAt" = NOW()
        `, prod.assignedToId, month, prod.price || 0).catch(() => {})
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
