import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const users = await db.user.findMany({
      where: { role: 'freelancer' },
      select: { id: true, name: true, email: true, phone: true, siret: true, specialty: true, address: true, profilePicUrl: true, active: true, createdAt: true, rates: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(users)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email, password, phone, siret, specialty } = await req.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email } }).catch(() => null)
  if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 400 })

  const hashed = await bcrypt.hash(password, 10)
  try {
    const user = await db.user.create({
      data: { name, email, password: hashed, role: 'freelancer', active: true, phone: phone || null, siret: siret || null, specialty: specialty || null },
      select: { id: true, name: true, email: true, phone: true, siret: true, specialty: true, active: true },
    })
    await db.activityLog.create({ data: { actorName: session.user?.name || 'Admin', action: 'a créé le compte prestataire', target: name } }).catch(() => {})
    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
