import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Generates (once) and returns the public client-tracking link
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const prod = await db.production.findUnique({ where: { id: params.id }, select: { shareToken: true } })
    if (!prod) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let token = prod.shareToken
    if (!token) {
      token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
      await db.production.update({ where: { id: params.id }, data: { shareToken: token } })
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://presta.instantmov.fr'
    return NextResponse.json({ url: `${base}/suivi/${token}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
