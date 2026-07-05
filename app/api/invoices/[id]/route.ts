import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailInvoicePaid } from '@/lib/mail'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()
  try {
    const invoice = await db.invoice.update({
      where: { id: params.id },
      data: { status, paidAt: status === 'paid' ? new Date() : null, updatedAt: new Date() },
      include: { freelancer: { select: { name: true, email: true } } },
    })
    if (status === 'paid') {
      emailInvoicePaid(invoice.freelancer.name, invoice.freelancer.email, invoice.amount).catch(() => {})
    }
    return NextResponse.json(invoice)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await db.invoice.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
