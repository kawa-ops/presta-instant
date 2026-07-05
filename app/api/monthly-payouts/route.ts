import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MonthlyPayout" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "freelancerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      "validatedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "projectCount" INT NOT NULL DEFAULT 0,
      "invoiceUrl" TEXT,
      "invoiceStatus" TEXT NOT NULL DEFAULT 'pending',
      "paidAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      UNIQUE("freelancerId", month)
    )
  `).catch(() => {})
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isAdmin = (session.user as any).role === 'admin'
  const freelancerId = isAdmin ? searchParams.get('freelancerId') : (session.user as any).id

  try {
    const rows = await db.monthlyPayout.findMany({
      where: freelancerId ? { freelancerId } : {},
      orderBy: { month: 'desc' },
      include: { freelancer: { select: { id: true, name: true } } },
    }).catch(() => [])
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  await ensureTable()
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, invoiceUrl, invoiceStatus, paidAt } = body
  const isAdmin = (session.user as any).role === 'admin'

  const data: any = { updatedAt: new Date() }
  if (invoiceUrl !== undefined) data.invoiceUrl = invoiceUrl
  if (invoiceUrl && !isAdmin) data.invoiceStatus = 'uploaded'
  if (isAdmin && invoiceStatus !== undefined) data.invoiceStatus = invoiceStatus
  if (isAdmin && paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null

  try {
    const row = await db.monthlyPayout.update({ where: { id }, data, include: { freelancer: { select: { name: true } } } })

    if (isAdmin && invoiceStatus === 'paid') {
      await db.notification.create({ data: { userId: row.freelancerId, type: 'invoice_paid', message: `Votre facture de ${row.month} a été payée`, link: '/espace/facturation' } }).catch(() => {})
    }

    if (!isAdmin && invoiceUrl) {
      // Notify admins
      const admins = await db.user.findMany({ where: { role: 'admin' } }).catch(() => [])
      for (const admin of admins) {
        await db.notification.create({ data: { userId: admin.id, type: 'invoice_uploaded', message: `${row.freelancer.name} a déposé sa facture de ${row.month}`, link: '/facturation' } }).catch(() => {})
      }
    }

    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { freelancerId, month } = await req.json()
  const fid = freelancerId || (session.user as any).id

  try {
    const row = await db.monthlyPayout.upsert({
      where: { freelancerId_month: { freelancerId: fid, month } },
      update: {},
      create: { freelancerId: fid, month, validatedAmount: 0, projectCount: 0, invoiceStatus: 'pending' },
    }).catch(async () => {
      // upsert may fail if unique constraint name differs, fallback to findOrCreate
      const existing = await db.monthlyPayout.findFirst({ where: { freelancerId: fid, month } })
      if (existing) return existing
      return db.monthlyPayout.create({ data: { freelancerId: fid, month, validatedAmount: 0, projectCount: 0, invoiceStatus: 'pending' } })
    })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
