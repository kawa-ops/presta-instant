import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLucasId } from '@/lib/ensure'

export const dynamic = 'force-dynamic'
const db = prisma as any

// One-shot import of Lucas's Notion production board (validated 2026-07-06).
const JOBS = [
  { title: 'MAS DES CANELLES', client: 'Elodie', type: 'Photo/Vidéo', status: 'a_faire' },
  { title: 'ANNIVERSAIRE SYLVAIN', client: 'Rose THR', type: 'Montage vidéo', status: 'a_faire' },
  { title: 'VIDEOS SAINT PIERRE', client: 'RK', type: 'Montage vidéo', status: 'a_faire' },
  { title: 'MULTICAM ON BIKE (3h)', client: 'Djon Bike', type: 'Montage vidéo', status: 'a_faire' },
  { title: 'TWERK AND VIBES', client: 'OCLUB', type: 'Photo/Vidéo', status: 'a_faire' },
  { title: 'VIDEO YOUTUBE MATCO', client: 'MATCO', type: 'Montage vidéo', status: 'a_faire' },
  { title: 'TEASER DELTA FESTIVAL', client: 'Red Bull', type: 'Montage vidéo', status: 'a_faire' },
  { title: 'EPISODES YTB LA CLEF', client: 'La Clef', type: 'Montage vidéo', status: 'revisions' },
  { title: 'BARBER COMMUNITY', client: 'Barber Community', type: 'Montage vidéo', status: 'a_faire' },
  { title: 'WHITE PARTY', client: 'OCLUB', type: 'Photo/Vidéo', status: 'a_faire' },
  { title: 'MATCH FRANCE', client: 'Voile Blanche', type: 'Photo/Vidéo', status: 'a_faire' },
  { title: 'MONTAGE REEL SGE', client: 'SGE', type: 'Montage vidéo', status: 'a_faire' },
  { title: 'SOIREE ETUDIANTE', client: 'RedClub', type: 'Photo/Vidéo', status: 'a_faire' },
  { title: 'SOIREE VERTE', client: 'Carré Vert', type: 'Photo/Vidéo', status: 'a_faire' },
  { title: 'FLASHBACK 2.0', client: 'Voile Blanche', type: 'Photo/Vidéo', status: 'a_faire' },
]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lucasId = await getLucasId()
  if (!lucasId) return NextResponse.json({ error: 'Compte Lucas introuvable' }, { status: 500 })

  let created = 0
  let skipped = 0
  try {
    for (const job of JOBS) {
      // Idempotent: skip if the same title already exists
      const existing = await db.production.findFirst({ where: { title: job.title } })
      if (existing) { skipped++; continue }
      await db.production.create({
        data: {
          title: job.title,
          client: job.client,
          status: job.status,
          priority: 'normal',
          internalNotes: `Type : ${job.type}`,
          assignedToId: lucasId,
          archived: false,
        },
      })
      created++
    }
    await db.activityLog.create({ data: { actorName: session.user?.name || 'Admin', action: 'a importé le board Notion', target: `${created} prestations` } }).catch(() => {})
    return NextResponse.json({ ok: true, created, skipped, message: `${created} prestations importées${skipped ? `, ${skipped} déjà existantes (ignorées)` : ''}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, created }, { status: 500 })
  }
}
