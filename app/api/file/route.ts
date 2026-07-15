import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Authenticated proxy for private Blob files.
// The store stays private; only logged-in users can read files, streamed
// server-side with the store token (never exposed to the browser).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const u = req.nextUrl.searchParams.get('u')
  if (!u) return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  // Strict host check — substring matching is SSRF-bypassable
  // (e.g. https://evil.com/x.blob.vercel-storage.com would leak the token)
  let parsed: URL
  try {
    parsed = new URL(u)
  } catch {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.blob.vercel-storage.com')) {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  try {
    const upstream = await fetch(u, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    if (!upstream.ok) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
