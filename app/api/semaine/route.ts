import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 7); end.setHours(23, 59, 59, 999)
  const horizon = new Date(start); horizon.setDate(horizon.getDate() + 35); horizon.setHours(23, 59, 59, 999)

  try {
    const [thisWeek, overdue, upcoming] = await Promise.all([
      db.production.findMany({
        where: { archived: false, status: { notIn: ['valide'] }, deadline: { gte: start, lte: end } },
        orderBy: { deadline: 'asc' },
        include: { assignedTo: { select: { name: true } } },
      }),
      db.production.findMany({
        where: { archived: false, status: { notIn: ['valide'] }, deadline: { lt: start } },
        orderBy: { deadline: 'asc' },
        include: { assignedTo: { select: { name: true } } },
      }),
      // Next 4 weeks after the current one — full detail for the planning grid
      db.production.findMany({
        where: { archived: false, status: { notIn: ['valide'] }, deadline: { gt: end, lte: horizon } },
        orderBy: { deadline: 'asc' },
        include: { assignedTo: { select: { name: true } } },
      }),
    ])
    return NextResponse.json({ thisWeek, overdue, upcoming }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
