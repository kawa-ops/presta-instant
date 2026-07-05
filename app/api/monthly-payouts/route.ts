import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailInvoiceUploaded, emailInvoicePaid } from '@/lib/mail'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET(req: NextRequest) {
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
    })
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, invoiceUrl, invoiceStatus, paidAt } = body
  const isAdmin = (session.user as any).role === 'admin'

  const data: any = {}
  if (invoiceUrl !== undefined) data.invoiceUrl = invoiceUrl
  if (invoiceUrl && !isAdmin) data.invoiceStatus = 'uploaded'
  if (isAdmin && invoiceStatus !== undefined) {
    data.invoiceStatus = invoiceStatus
    if (invoiceStatus === 'paid') data.paidAt = new Date()
  }
  if (isAdmin && paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null

  try {
    const row = await db.monthlyPayout.update({ where: { id }, data, include: { freelancer: { select: { name: true, email: true } } } })

    if (isAdmin && invoiceStatus === 'paid') {
      db.notification.create({ data: { userId: row.freelancerId, type: 'invoice_paid', message: `Votre facture de ${row.month} a été payée`, link: '/espace/facturation' } }).catch(() => {})
      emailInvoicePaid(row.freelancer.name, row.freelancer.email, row.validatedAmount).catch(() => {})
    }

    if (!isAdmin && invoiceUrl) {
      emailInvoiceUploaded(row.freelancer.name, row.month).catch(() => {})
      db.user.findMany({ where: { role: 'admin' } }).then((admins: any[]) => {
        for (const a of admins) {
          db.notification.create({ data: { userId: a.id, type: 'invoice_uploaded', message: `${row.freelancer.name} a déposé sa facture de ${row.month}`, link: '/facturation' } }).catch(() => {})
        }
      }).catch(() => {})
    }

    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { freelancerId, month } = await req.json()
  const fid = (session.user as any).role === 'admin' && freelancerId ? freelancerId : (session.user as any).id

  try {
    const existing = await db.monthlyPayout.findUnique({ where: { freelancerId_month: { freelancerId: fid, month } } }).catch(() => null)
    if (existing) return NextResponse.json(existing)
    const row = await db.monthlyPayout.create({ data: { freelancerId: fid, month } })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
