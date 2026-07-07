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
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)
  const startTomorrow = new Date(startToday); startTomorrow.setDate(startTomorrow.getDate() + 1)
  const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1)
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  // Monday of the current week
  const startWeek = new Date(startToday)
  startWeek.setDate(startWeek.getDate() - ((startWeek.getDay() + 6) % 7))

  const activeWhere = { archived: false, status: { notIn: ['valide'] } }
  const adminId = (session.user as any).id

  try {
    const [
      inProgress, overdue, dueToday, dueTomorrow, completedMonth,
      activeFreelancers, totalProds, recentActivity, urgentProds, recentProds, notifications
    ] = await Promise.all([
      db.production.count({ where: activeWhere }),
      db.production.count({ where: { ...activeWhere, deadline: { lt: startToday } } }),
      db.production.count({ where: { ...activeWhere, deadline: { gte: startToday, lte: endToday } } }),
      db.production.count({ where: { ...activeWhere, deadline: { gte: startTomorrow, lte: endTomorrow } } }),
      db.production.count({ where: { status: 'valide', updatedAt: { gte: startMonth } } }),
      db.user.count({ where: { role: 'freelancer', active: true } }),
      db.production.count({ where: { archived: false } }),
      db.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
      db.production.findMany({ where: { ...activeWhere, deadline: { lte: endToday } }, orderBy: { deadline: 'asc' }, take: 6, include: { assignedTo: { select: { id: true, name: true } } } }),
      db.production.findMany({ where: { archived: false }, orderBy: { createdAt: 'desc' }, take: 5, include: { assignedTo: { select: { id: true, name: true } } } }),
      db.notification.findMany({ where: { userId: adminId, read: false }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ])

    const completedWeek = await db.production.count({ where: { status: 'valide', updatedAt: { gte: startWeek } } }).catch(() => 0)

    return NextResponse.json(
      { inProgress, overdue, dueToday, dueTomorrow, completedMonth, completedWeek, activeFreelancers, totalProds, recentActivity, urgentProds, recentProds, notifications },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
