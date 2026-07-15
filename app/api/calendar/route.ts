import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureSchema } from '@/lib/ensure'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Generates (once) the personal ICS-feed URL for the session user.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    await ensureSchema()
    const user = await db.user.findUnique({ where: { id: userId }, select: { calendarToken: true } })
    let token = user?.calendarToken
    if (!token) {
      token = randomBytes(24).toString('base64url')
      await db.user.update({ where: { id: userId }, data: { calendarToken: token } })
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://presta.instantmov.fr'
    return NextResponse.json({ url: `${base}/api/calendar/${userId}/${token}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
