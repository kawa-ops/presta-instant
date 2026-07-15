import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiAvailable, askClaude } from '@/lib/ai'

// Drafts a client-facing message (delivery / feedback ack / delay notice)
// in the studio's tone. Static templates when the API key is absent.

export const dynamic = 'force-dynamic'
const db = prisma as any

const KINDS: Record<string, string> = {
  delivery: 'annonce de livraison de la vidéo (avec invitation à donner ses retours ou approuver)',
  ack: 'accusé de réception des retours du client (on confirme que les modifications sont lancées)',
  delay: "annonce d'un léger retard de livraison (avec excuse sincère et nouvelle échéance à préciser par l'expéditeur)",
}

const FALLBACK: Record<string, (t: string, c: string) => string> = {
  delivery: (t) => `Hello ! 👋\n\nTa vidéo "${t}" est prête ! Tu peux la visionner et nous faire tes retours (ou l'approuver) directement depuis ton lien de suivi.\n\nOn attend ton feu vert !\nL'équipe instant.`,
  ack: (t) => `Hello ! 👋\n\nBien reçu tes retours sur "${t}" — l'équipe est déjà dessus. On te partage la nouvelle version très vite.\n\nMerci pour ta réactivité !\nL'équipe instant.`,
  delay: (t) => `Hello ! 👋\n\nPetit point sur "${t}" : on a besoin d'un peu plus de temps pour te livrer une version à la hauteur. Nouvelle échéance : [à compléter].\n\nDésolés pour le contretemps, et merci pour ta compréhension.\nL'équipe instant.`,
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productionId, kind } = await req.json()
  if (!productionId || !KINDS[kind]) return NextResponse.json({ error: 'productionId et kind (delivery|ack|delay) requis' }, { status: 400 })

  try {
    const prod = await db.production.findUnique({
      where: { id: productionId },
      select: { title: true, client: true, deadline: true, lastFeedback: true, status: true },
    })
    if (!prod) return NextResponse.json({ error: 'Production introuvable' }, { status: 404 })

    if (aiAvailable()) {
      const text = await askClaude(
        `Tu écris les messages clients du studio de production vidéo "instant." (Toulouse). Ton : tutoiement professionnel, direct, chaleureux, jamais pompeux, emojis sobres (1-2 max). Signature : "L'équipe instant.". Réponds UNIQUEMENT avec le message, sans commentaire ni objet.`,
        `Rédige un message de type : ${KINDS[kind]}.\nProjet : "${prod.title}" pour le client ${prod.client}.${prod.lastFeedback && kind === 'ack' ? `\nDerniers retours du client : ${String(prod.lastFeedback).slice(0, 400)}` : ''}${kind === 'delay' && prod.deadline ? `\nDeadline initiale : ${new Date(prod.deadline).toLocaleDateString('fr-FR')}` : ''}\nLongueur : 4 à 8 lignes.`,
        500
      )
      if (text) return NextResponse.json({ message: text, ai: true })
    }
    return NextResponse.json({ message: FALLBACK[kind](prod.title, prod.client), ai: false })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
