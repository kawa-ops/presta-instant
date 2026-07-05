import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureSchema } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET() {
  await ensureSchema()
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, siret: true, specialty: true, address: true } })
    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  await ensureSchema()
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const { name, phone, siret, address } = await req.json()
  const data: any = {}
  if (name !== undefined) data.name = name
  if (phone !== undefined) data.phone = phone
  if (siret !== undefined) data.siret = siret
  if (address !== undefined) data.address = address
  try {
    const user = await db.user.update({ where: { id: userId }, data, select: { id: true, name: true, email: true, phone: true, siret: true, address: true } })
    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
