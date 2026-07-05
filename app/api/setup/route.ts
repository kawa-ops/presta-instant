import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Create tables
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'freelancer',
        active BOOLEAN NOT NULL DEFAULT true,
        phone TEXT, siret TEXT, specialty TEXT, "profilePicUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Production" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        client TEXT NOT NULL,
        brief TEXT,
        "sourcesLink" TEXT,
        "deliveryLink" TEXT,
        priority TEXT NOT NULL DEFAULT 'normale',
        status TEXT NOT NULL DEFAULT 'a_faire',
        price DOUBLE PRECISION NOT NULL DEFAULT 0,
        deadline TIMESTAMP(3),
        "internalNotes" TEXT,
        "assignedToId" TEXT REFERENCES "User"(id),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "freelancerId" TEXT NOT NULL REFERENCES "User"(id),
        "productionId" TEXT REFERENCES "Production"(id),
        "fileUrl" TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL REFERENCES "User"(id),
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT false,
        link TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "actorName" TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create admin accounts if they don't exist
    const admins = [
      { name: 'Axel', email: 'kawa@instantmov.fr', password: 'Instant2026!' },
      { name: 'Lucas', email: 'lucas.rawinstant@gmail.com', password: 'Instant2026!' },
    ]
    for (const admin of admins) {
      const exists = await prisma.user.findUnique({ where: { email: admin.email } })
      if (!exists) {
        await prisma.user.create({
          data: {
            name: admin.name,
            email: admin.email,
            password: await bcrypt.hash(admin.password, 10),
            role: 'admin',
          },
        })
      }
    }

    return NextResponse.json({ ok: true, message: 'Setup terminé — comptes admin créés (Instant2026!)' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
