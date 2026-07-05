import { prisma } from '@/lib/prisma'

const db = prisma as any

// Run schema migrations only once per lambda instance instead of on every request.
let done = false

export async function ensureSchema() {
  if (done) return
  const stmts = [
    // Production columns
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "productionDate" TIMESTAMP(3)`,
    `ALTER TABLE "Production" ALTER COLUMN price DROP NOT NULL`,
    `ALTER TABLE "Production" ALTER COLUMN price DROP DEFAULT`,
    // User columns
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS address TEXT`,
    // Invoice columns
    `ALTER TABLE "Invoice" ALTER COLUMN "fileUrl" DROP NOT NULL`,
    `ALTER TABLE "Invoice" ALTER COLUMN amount DROP NOT NULL`,
    // MonthlyPayout table
    `CREATE TABLE IF NOT EXISTS "MonthlyPayout" (
      id TEXT PRIMARY KEY,
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
    )`,
  ]
  for (const s of stmts) { try { await db.$executeRawUnsafe(s) } catch {} }
  done = true
}

export async function getLucasId(): Promise<string | null> {
  const lucas = await db.user.findFirst({ where: { email: 'lucas.rawinstant@gmail.com' } }).catch(() => null)
  return lucas?.id || null
}
