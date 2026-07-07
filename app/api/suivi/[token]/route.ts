import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { waProduction } from '@/lib/whatsapp'
import { getLucasId } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Public client actions, gated by the secret share token.
// action: 'approve' → client validates the current version
// action: 'feedback' → client sends revision requests
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const prod = await db.production.findUnique({
    where: { shareToken: params.token },
    select: { id: true, title: true, client: true, assignedToId: true },
  }).catch(() => null)
  if (!prod) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })

  const { action, comments } = await req.json()

  try {
    const admins = await db.user.findMany({ where: { role: 'admin' } }).catch(() => [])
    const notifyAdmins = (message: string) => {
      for (const a of admins) {
        db.notification.create({ data: { userId: a.id, type: 'workflow', message, link: '/productions' } }).catch(() => {})
      }
    }

    if (action === 'approve') {
      await db.production.update({ where: { id: prod.id }, data: { clientApprovedAt: new Date() } })
      db.comment.create({ data: { productionId: prod.id, authorName: `Client (${prod.client})`, authorRole: 'client', body: '✅ Le client a approuvé cette version.' } }).catch(() => {})
      notifyAdmins(`✅ Le client (${prod.client}) a approuvé "${prod.title}"`)
      waProduction(`✅ Le client a approuvé la vidéo !\n\nProjet : ${prod.title}\nClient : ${prod.client}\n\nÀ confirmer avec le client avant livraison finale.`).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    if (action === 'feedback') {
      if (!comments?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })
      const body = comments.trim().slice(0, 3000)
      await db.production.update({ where: { id: prod.id }, data: { status: 'retours_client', lastFeedback: body } })
      db.productionEvent.create({ data: { productionId: prod.id, status: 'retours_client' } }).catch(() => {})
      db.comment.create({ data: { productionId: prod.id, authorName: `Client (${prod.client})`, authorRole: 'client', body } }).catch(() => {})
      notifyAdmins(`💬 Retours client sur "${prod.title}"`)
      // Notify the assigned freelancer too
      const lucasId = await getLucasId()
      if (prod.assignedToId && prod.assignedToId !== lucasId) {
        db.notification.create({ data: { userId: prod.assignedToId, type: 'workflow', message: `💬 Retours client reçus sur "${prod.title}"`, link: '/espace/prestations' } }).catch(() => {})
      }
      waProduction(`💬 Le client a envoyé ses retours\n\nProjet : ${prod.title}\nClient : ${prod.client}\n\nRetours :\n${body}`).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
