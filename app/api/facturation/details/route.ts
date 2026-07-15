import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureSchema } from '@/lib/ensure'

// Per-production breakdown of a provider's monthly payout, with amount
// editing and removal. Every mutation recomputes the payout totals from
// the production list itself so the amounts can never drift.

export const dynamic = 'force-dynamic'
const db = prisma as any

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) }
}

// All productions credited to this provider's payout for this month.
// Older productions (validated before payoutMonth existed) are backfilled
// from their validation date so history stays browsable.
async function listMonth(freelancerId: string, month: string) {
  const { start, end } = monthRange(month)
  const [tagged, legacy] = await Promise.all([
    db.production.findMany({
      where: { assignedToId: freelancerId, payoutMonth: month },
      select: { id: true, title: true, client: true, price: true, status: true, updatedAt: true, deadline: true },
      orderBy: { updatedAt: 'desc' },
    }),
    db.production.findMany({
      where: { assignedToId: freelancerId, payoutMonth: null, status: 'valide', price: { not: null }, updatedAt: { gte: start, lt: end } },
      select: { id: true, title: true, client: true, price: true, status: true, updatedAt: true, deadline: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ])
  if (legacy.length > 0) {
    await db.production.updateMany({ where: { id: { in: legacy.map((p: any) => p.id) } }, data: { payoutMonth: month } }).catch(() => {})
  }
  return [...tagged, ...legacy]
}

// Recompute the payout row from its productions — single source of truth
async function syncPayout(freelancerId: string, month: string) {
  const prods = await db.production.findMany({
    where: { assignedToId: freelancerId, payoutMonth: month },
    select: { price: true },
  })
  const validatedAmount = prods.reduce((a: number, p: any) => a + (p.price || 0), 0)
  const projectCount = prods.length
  const existing = await db.monthlyPayout.findUnique({ where: { freelancerId_month: { freelancerId, month } } }).catch(() => null)
  if (existing) {
    await db.monthlyPayout.update({ where: { id: existing.id }, data: { validatedAmount, projectCount } })
  } else if (projectCount > 0) {
    await db.monthlyPayout.create({ data: { freelancerId, month, validatedAmount, projectCount } })
  }
  return { validatedAmount, projectCount }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const freelancerId = searchParams.get('freelancerId')
  const month = searchParams.get('month')
  if (!freelancerId || !month) return NextResponse.json({ error: 'freelancerId et month requis' }, { status: 400 })

  try {
    await ensureSchema()
    const productions = await listMonth(freelancerId, month)
    return NextResponse.json({ productions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productionId, action, price } = await req.json()
  if (!productionId || !action) return NextResponse.json({ error: 'productionId et action requis' }, { status: 400 })

  try {
    await ensureSchema()
    const prod = await db.production.findUnique({
      where: { id: productionId },
      select: { id: true, title: true, assignedToId: true, payoutMonth: true, price: true },
    })
    if (!prod || !prod.assignedToId || !prod.payoutMonth) return NextResponse.json({ error: 'Production introuvable ou hors facturation' }, { status: 404 })
    // A removed production ("none") must not be editable — syncPayout would
    // otherwise create a ghost MonthlyPayout row for the month "none"
    if (prod.payoutMonth === 'none') return NextResponse.json({ error: 'Production retirée de la facturation' }, { status: 400 })
    const { assignedToId, payoutMonth } = prod

    if (action === 'amount') {
      const newPrice = parseFloat(price)
      if (isNaN(newPrice) || newPrice < 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      await db.production.update({ where: { id: productionId }, data: { price: newPrice } })
    } else if (action === 'remove') {
      // Detach from billing only — the production itself is untouched
      await db.production.update({ where: { id: productionId }, data: { payoutMonth: 'none' } })
    } else {
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }

    const totals = await syncPayout(assignedToId, payoutMonth)
    return NextResponse.json({ ok: true, ...totals })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
