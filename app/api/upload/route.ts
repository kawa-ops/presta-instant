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

  try {
    const userId = (session.user as any).id
    const blob = await put(`factures/${userId}/${Date.now()}-${file.name}`, file, { access: 'public' })
    return NextResponse.json({ url: blob.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
