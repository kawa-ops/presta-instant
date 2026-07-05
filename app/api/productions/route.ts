import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const db = prisma as any

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Production" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title TEXT NOT NULL,
      client TEXT NOT NULL,
      brief TEXT,
      "sourcesLink" TEXT,
      "deliveryLink" TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'a_faire',
      price DOUBLE PRECISION,
      deadline TIMESTAMP(3),
      "internalNotes" TEXT,
      "assignedToId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
      archived BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )
  `).catch(() => {})

  const cols = [
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS brief TEXT`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "sourcesLink" TEXT`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "deliveryLink" TEXT`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION`,
  ]
  for (const s of cols) { try { await db.$executeRawUnsafe(s) } catch {} }
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const assignedToId = searchParams.get('assignedToId')
  const overdue = searchParams.get('overdue')
  const archived = searchParams.get('archived') === 'true'

  const where: any = { archived }
  if (status) where.status = status
  if (assignedToId) where.assignedToId = assignedToId
  if (overdue === 'true') {
    where.status = { notIn: ['valide', 'archive'] }
    where.deadline = { lt: new Date() }
  }

  try {
    const data = await db.production.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, client, brief, sourcesLink, deliveryLink, priority, status, price, deadline, internalNotes, assignedToId } = body

  try {
    const prod = await db.production.create({
      data: {
        title, client,
        brief: brief || null,
        sourcesLink: sourcesLink || null,
        deliveryLink: deliveryLink || null,
        priority: priority || 'normal',
        status: status || 'a_faire',
        price: price ? parseFloat(price) : null,
        deadline: deadline ? new Date(deadline) : null,
        internalNotes: internalNotes || null,
        assignedToId: assignedToId || null,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    })

    await db.activityLog.create({ data: { actorName: session.user?.name || 'Admin', action: 'a créé la prestation', target: title } }).catch(() => {})

    if (assignedToId) {
      await db.notification.create({ data: { userId: assignedToId, type: 'new_task', message: `Nouvelle prestation assignée : ${title}`, link: `/espace/prestations` } }).catch(() => {})
    }

    return NextResponse.json(prod, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
