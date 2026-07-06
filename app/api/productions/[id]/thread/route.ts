import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLucasId } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

async function canAccess(session: any, productionId: string) {
  const isAdmin = (session.user as any).role === 'admin'
  if (isAdmin) return true
  const prod = await db.production.findUnique({ where: { id: productionId }, select: { assignedToId: true } })
  return prod?.assignedToId === (session.user as any).id
}

// Versions + comments for one production — loaded lazily when a row expands
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canAccess(session, params.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const [versions, comments] = await Promise.all([
      db.deliveryVersion.findMany({ where: { productionId: params.id }, orderBy: { version: 'desc' } }),
      db.comment.findMany({ where: { productionId: params.id }, orderBy: { createdAt: 'asc' } }),
    ])
    return NextResponse.json({ versions, comments })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Post a comment on the production thread
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canAccess(session, params.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

  const isAdmin = (session.user as any).role === 'admin'
  const authorName = session.user?.name || '?'

  try {
    const comment = await db.comment.create({
      data: { productionId: params.id, authorName, authorRole: isAdmin ? 'admin' : 'freelancer', body: body.trim() },
    })

    // Notify the other side (fire-and-forget)
    const prod = await db.production.findUnique({ where: { id: params.id }, select: { title: true, assignedToId: true } })
    if (prod) {
      const lucasId = await getLucasId()
      if (isAdmin && prod.assignedToId && prod.assignedToId !== lucasId) {
        db.notification.create({ data: { userId: prod.assignedToId, type: 'workflow', message: `💬 ${authorName} a commenté "${prod.title}"`, link: '/espace/prestations' } }).catch(() => {})
      } else if (!isAdmin) {
        db.user.findMany({ where: { role: 'admin' } }).then((admins: any[]) => {
          for (const a of admins) {
            db.notification.create({ data: { userId: a.id, type: 'workflow', message: `💬 ${authorName} a commenté "${prod.title}"`, link: '/productions' } }).catch(() => {})
          }
        }).catch(() => {})
      }
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
