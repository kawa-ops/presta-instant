import { prisma } from '@/lib/prisma'

const db = prisma as any

// Single source of truth for provider payouts: the MonthlyPayout row is
// always RECOMPUTED from the productions tagged with payoutMonth, never
// incremented. Call this after anything that can change the month's total
// (validation, price edit, removal, deletion).
export async function syncPayout(freelancerId: string, month: string) {
  if (!freelancerId || !month || month === 'none') return { validatedAmount: 0, projectCount: 0 }
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
