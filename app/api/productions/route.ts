import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLucasId } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = (session.user as any).role === 'admin'
  const userId = (session.user as any).id

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  // Freelancers can only ever see their own productions
  const assignedToId = isAdmin ? searchParams.get('assignedToId') : userId
  const overdue = searchParams.get('overdue')
  const archived = searchParams.get('archived') === 'true'
  const sortBy = searchParams.get('sortBy') || 'deadline'
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'

  const where: any = { archived }
  if (status) where.status = status
  if (assignedToId) where.assignedToId = assignedToId
  if (overdue === 'true') {
    where.status = { notIn: ['valide'] }
    where.deadline = { lt: new Date() }
  }

  const orderBy: any = {}
  if (['title', 'client', 'deadline', 'price', 'priority', 'status'].includes(sortBy)) {
    orderBy[sortBy] = sortDir
  } else {
    orderBy.deadline = 'asc'
  }

  try {
    let data = await db.production.findMany({
      where,
      orderBy,
      include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } },
    })
    // Internal notes are admin-only — never sent to freelancers
    if (!isAdmin) {
      data = data.map(({ internalNotes, ...rest }: any) => rest)
    }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, client, brief, sourcesLink, priority, status, price, deadline, productionDate, internalNotes } = body
  let { assignedToId } = body

  if (!title?.trim() || !client?.trim()) {
    return NextResponse.json({ error: 'Titre et client requis' }, { status: 400 })
  }

  // Auto-assign to Lucas if no freelancer selected
  const lucasId = await getLucasId()
  if (!assignedToId) assignedToId = lucasId

  try {
    const prod = await db.production.create({
      data: {
        title: title.trim(),
        client: client.trim(),
        brief: brief || null,
        sourcesLink: sourcesLink || null,
        priority: priority || 'normal',
        status: status || 'a_faire',
        price: price !== undefined && price !== null && price !== '' ? parseFloat(price) : null,
        deadline: deadline ? new Date(deadline) : null,
        productionDate: productionDate ? new Date(productionDate) : null,
        internalNotes: internalNotes || null,
        assignedToId: assignedToId || null,
      },
      include: { assignedTo: { select: { id: true, name: true, role: true } } },
    })

    // Fire-and-forget side effects (don't block the response)
    db.activityLog.create({ data: { actorName: session.user?.name || 'Admin', action: 'a créé la prestation', target: prod.title } }).catch(() => {})
    if (assignedToId && assignedToId !== lucasId) {
      db.notification.create({ data: { userId: assignedToId, type: 'new_task', message: `Nouvelle prestation assignée : ${prod.title}`, link: `/espace/prestations` } }).catch(() => {})
    }

    return NextResponse.json(prod, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
