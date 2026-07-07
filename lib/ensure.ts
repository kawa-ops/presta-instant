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
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS rates TEXT`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "lastFeedback" TEXT`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "clientPrice" DOUBLE PRECISION`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "shareToken" TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Production_shareToken_key" ON "Production"("shareToken")`,
    `CREATE TABLE IF NOT EXISTS "DeliveryVersion" (
      id TEXT PRIMARY KEY,
      "productionId" TEXT NOT NULL REFERENCES "Production"(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      version INT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "clientApprovedAt" TIMESTAMP(3)`,
    `ALTER TABLE "Production" ADD COLUMN IF NOT EXISTS "finalLink" TEXT`,
    `CREATE TABLE IF NOT EXISTS "ProductionEvent" (
      id TEXT PRIMARY KEY,
      "productionId" TEXT NOT NULL REFERENCES "Production"(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "XpEvent" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      amount INT NOT NULL,
      reason TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "Achievement" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      key TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      UNIQUE("userId", key)
    )`,
    `CREATE TABLE IF NOT EXISTS "Comment" (
      id TEXT PRIMARY KEY,
      "productionId" TEXT NOT NULL REFERENCES "Production"(id) ON DELETE CASCADE,
      "authorName" TEXT NOT NULL,
      "authorRole" TEXT NOT NULL,
      body TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`,
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
