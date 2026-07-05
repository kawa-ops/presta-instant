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
      "productionDate" TIMESTAMP(3),
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
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "productionDate" TIMESTAMP(3)`,
    // Force optional columns to be nullable (in case original setup made them NOT NULL)
    `ALTER TABLE "Production" ALTER COLUMN brief DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN "sourcesLink" DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN "deliveryLink" DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN "internalNotes" DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN price DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN deadline DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN "productionDate" DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN "assignedToId" DROP NOT NULL`,
  ]
  for (const s of cols) { try { await db.$executeRawUnsafe(s) } catch {} }
}

async function getLucasId() {
  const lucas = await db.user.findFirst({ where: { email: 'lucas.rawinstant@gmail.com' } }).catch(() => null)
  return lucas?.id || null
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const assignedToId = searchParams.get('assignedToId')
  const overdue = searchParams.get('overdue')
  const archived = searchParams.get('archived') === 'true'
  const sortBy = searchParams.get('sortBy') || 'deadline'
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'

  const where: any = { archived }
  if (status) where.status = status
  if (assignedToId) where.assignedToId = assignedToId
  if (overdue === 'true') {
    where.status = { notIn: ['valide', 'archive'] }
    where.deadline = { lt: new Date() }
  }

  const orderBy: any = {}
  if (['title', 'client', 'deadline', 'price', 'priority', 'status'].includes(sortBy)) {
    orderBy[sortBy] = sortDir
  } else {
    orderBy.deadline = 'asc'
  }

  try {
    const data = await db.production.findMany({
      where,
      orderBy,
      include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } },
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
  const { title, client, brief, sourcesLink, priority, status, price, deadline, productionDate, internalNotes } = body
  let { assignedToId } = body

  if (!title?.trim() || !client?.trim()) {
    return NextResponse.json({ error: 'Titre et client requis' }, { status: 400 })
  }

  // Auto-assign to Lucas if no freelancer selected
  if (!assignedToId) {
    assignedToId = await getLucasId()
  }

  try {
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    // Insert without productionDate first (avoids schema mismatch)
    await db.$executeRawUnsafe(
      `INSERT INTO "Production" (id, title, client, brief, "sourcesLink", priority, status, price, deadline, "internalNotes", "assignedToId", archived, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,NOW(),NOW())`,
      id,
      title.trim(),
      client.trim(),
      brief || null,
      sourcesLink || null,
      priority || 'normal',
      status || 'a_faire',
      price && price !== '' ? parseFloat(price) : null,
      deadline ? new Date(deadline) : null,
      internalNotes || null,
      assignedToId || null,
    )
    // Then set productionDate via UPDATE (column added via ALTER TABLE)
    if (productionDate) {
      await db.$executeRawUnsafe(`UPDATE "Production" SET "productionDate" = $1 WHERE id = $2`, new Date(productionDate), id).catch(() => {})
    }
    const prod = await db.production.findUnique({ where: { id }, include: { assignedTo: { select: { id: true, name: true, role: true } } } })

    await db.activityLog.create({ data: { actorName: session.user?.name || 'Admin', action: 'a créé la prestation', target: title } }).catch(() => {})

    if (assignedToId) {
      const lucas = await getLucasId()
      if (assignedToId !== lucas) {
        await db.notification.create({ data: { userId: assignedToId, type: 'new_task', message: `Nouvelle prestation assignée : ${title}`, link: `/espace/prestations` } }).catch(() => {})
      }
    }

    return NextResponse.json(prod, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
