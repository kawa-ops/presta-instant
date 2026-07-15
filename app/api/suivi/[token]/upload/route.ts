import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

// Client file drop on the public portal (rushes, logos, briefs) —
// gated by the share token, 4 MB max, 10 files max per production.
// Each file becomes an auto comment in the thread + admin notification.

export const dynamic = 'force-dynamic'
const db = prisma as any

const ALLOWED = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'application/zip', 'application/x-zip-compressed',
]
const FILE_MARKER = '📎 Fichier envoyé par le client'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const prod = await db.production.findUnique({
    where: { shareToken: params.token },
    select: { id: true, title: true, client: true },
  }).catch(() => null)
  if (!prod) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Stockage non configuré' }, { status: 500 })
  }

  // Simple rate limit: max 10 client files per production, ever
  const already = await db.comment.count({ where: { productionId: prod.id, authorRole: 'client', body: { startsWith: FILE_MARKER } } }).catch(() => 0)
  if (already >= 10) return NextResponse.json({ error: 'Limite de 10 fichiers atteinte pour ce projet — contactez le studio directement.' }, { status: 429 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Formats acceptés : PDF, image, ZIP' }, { status: 400 })
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop lourd (max 4 Mo) — pour des rushes volumineux, utilisez WeTransfer et collez le lien dans vos retours.' }, { status: 400 })

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
    const blob = await put(`client-uploads/${prod.id}/${Date.now()}-${safeName}`, file, { access: 'public' })

    await db.comment.create({
      data: { productionId: prod.id, authorName: `Client (${prod.client})`, authorRole: 'client', body: `${FILE_MARKER} : ${safeName}\n${blob.url}` },
    })
    db.user.findMany({ where: { role: 'admin' } }).then((admins: any[]) => {
      for (const a of admins) {
        db.notification.create({ data: { userId: a.id, type: 'workflow', message: `📎 Le client (${prod.client}) a envoyé un fichier sur "${prod.title}" : ${safeName}`, link: '/productions' } }).catch(() => {})
      }
    }).catch(() => {})

    return NextResponse.json({ ok: true, url: blob.url, name: safeName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
