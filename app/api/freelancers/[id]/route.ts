import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.phone !== undefined) data.phone = body.phone
  if (body.siret !== undefined) data.siret = body.siret
  if (body.specialty !== undefined) data.specialty = body.specialty
  if (body.address !== undefined) data.address = body.address
  if (body.active !== undefined) data.active = body.active
  // Email change: also the login — checked for uniqueness first
  if (body.email !== undefined && body.email.trim()) {
    const email = body.email.trim().toLowerCase()
    const taken = await db.user.findFirst({ where: { email, id: { not: params.id } } }).catch(() => null)
    if (taken) return NextResponse.json({ error: 'Cet email est déjà utilisé par un autre compte' }, { status: 400 })
    data.email = email
  }
  if (body.rates !== undefined) data.rates = typeof body.rates === 'string' ? body.rates : JSON.stringify(body.rates)
  if (body.password) {
    if (body.password.length < 6) return NextResponse.json({ error: 'Mot de passe trop court (min 6 caractères)' }, { status: 400 })
    data.password = await bcrypt.hash(body.password, 10)
  }

  try {
    const user = await db.user.update({ where: { id: params.id }, data, select: { id: true, name: true, email: true, phone: true, specialty: true, active: true } })
    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await db.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
