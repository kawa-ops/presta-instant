import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Stockage non configuré (BLOB_READ_WRITE_TOKEN manquant)' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Formats acceptés : PDF, PNG, JPG' }, { status: 400 })
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop lourd (max 4 Mo)' }, { status: 400 })

  const userId = (session.user as any).id
  const path = `uploads/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  try {
    // Public store: direct URL
    const blob = await put(path, file, { access: 'public' })
    return NextResponse.json({ url: blob.url })
  } catch (e: any) {
    // Private store: upload privately, serve through the authenticated proxy
    if (/private/i.test(e?.message || '')) {
      try {
        const blob = await put(path, file, { access: 'private' as any })
        return NextResponse.json({ url: `/api/file?u=${encodeURIComponent(blob.url)}` })
      } catch (e2: any) {
        return NextResponse.json({ error: e2.message }, { status: 500 })
      }
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
