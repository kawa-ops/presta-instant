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

  const isAdmin = (session.user as any).role === 'admin'
  const userId = (session.user as any).id

  try {
    const where = isAdmin ? {} : { freelancerId: userId }
    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        freelancer: { select: { id: true, name: true, email: true } },
        production: { select: { id: true, title: true, client: true } },
      },
    })
    return NextResponse.json(invoices)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { productionId, fileUrl, amount } = body
  const freelancerId = (session.user as any).id

  try {
    const invoice = await db.invoice.create({
      data: { freelancerId, productionId: productionId || null, fileUrl: fileUrl || null, amount: amount ? parseFloat(amount) : null, status: 'pending' },
      include: { freelancer: { select: { name: true } }, production: { select: { title: true } } },
    })
    emailInvoiceUploaded(invoice.freelancer.name, new Date().toISOString().slice(0, 7)).catch(() => {})
    return NextResponse.json(invoice, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
