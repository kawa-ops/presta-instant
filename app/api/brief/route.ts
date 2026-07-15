import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiAvailable, askClaude, extractJson } from '@/lib/ai'

export const dynamic = 'force-dynamic'
const db = prisma as any

// AI Daily Production Brief — analyses the whole production DB and returns
// a prioritized operational briefing in French.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)
  const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1)
  const stale48h = new Date(Date.now() - 48 * 3600 * 1000)

  try {
    const [active, pendingInvoices] = await Promise.all([
      db.production.findMany({
        where: { archived: false, status: { notIn: ['valide'] } },
        include: { assignedTo: { select: { name: true } } },
        orderBy: { deadline: 'asc' },
      }),
      db.monthlyPayout.findMany({ where: { invoiceStatus: 'uploaded' }, include: { freelancer: { select: { name: true } } } }).catch(() => []),
    ])

    const name = (p: any) => p.assignedTo?.name || 'Lucas'
    const priorities: string[] = []
    const actions: string[] = []

    // Overdue
    const overdue = active.filter((p: any) => p.deadline && new Date(p.deadline) < startToday)
    overdue.slice(0, 4).forEach((p: any) => {
      const days = Math.ceil((startToday.getTime() - new Date(p.deadline).getTime()) / 86400000)
      priorities.push(`🔴 "${p.title}" (${p.client}) a ${days} jour${days > 1 ? 's' : ''} de retard — assigné à ${name(p)}.`)
    })

    // Due today / tomorrow
    const dueToday = active.filter((p: any) => p.deadline && new Date(p.deadline) >= startToday && new Date(p.deadline) <= endToday)
    dueToday.forEach((p: any) => priorities.push(`🟡 "${p.title}" doit être livré aujourd'hui (${name(p)}).`))
    const dueTomorrow = active.filter((p: any) => p.deadline && new Date(p.deadline) > endToday && new Date(p.deadline) <= endTomorrow)
    dueTomorrow.forEach((p: any) => priorities.push(`🟠 "${p.title}" doit être livré demain (${name(p)}).`))

    // Deliveries waiting validation
    const toValidate = active.filter((p: any) => p.status === 'livre')
    if (toValidate.length > 0) {
      priorities.push(`🟣 ${toValidate.length} livraison${toValidate.length > 1 ? 's' : ''} en attente de ta validation : ${toValidate.slice(0, 3).map((p: any) => p.title).join(', ')}${toValidate.length > 3 ? '…' : ''}.`)
      toValidate.slice(0, 3).forEach((p: any) => actions.push(`Valider la livraison de ${name(p)} sur "${p.title}".`))
    }

    // Client feedback to process
    const retours = active.filter((p: any) => p.status === 'retours_client')
    retours.forEach((p: any) => {
      priorities.push(`💬 Le client de "${p.title}" a envoyé ses retours — à transmettre.`)
      actions.push(`Traiter les retours client sur "${p.title}" et relancer les modifications.`)
    })

    // Client approvals waiting for final delivery
    const approved = active.filter((p: any) => p.clientApprovedAt)
    approved.forEach((p: any) => {
      priorities.push(`🎉 Le client de "${p.title}" a approuvé la vidéo — livraison finale à envoyer !`)
      actions.push(`Exporter et envoyer la version finale de "${p.title}" (message pré-rédigé dans la fiche).`)
    })

    // Deadline today/tomorrow without any delivery yet
    ;[...dueToday, ...dueTomorrow].filter((p: any) => !p.deliveryLink && p.status !== 'livre').forEach((p: any) => {
      actions.push(`Relancer ${name(p)} : aucune version livrée sur "${p.title}" alors que la deadline approche.`)
    })

    // Stale tasks never started
    const stale = active.filter((p: any) => p.status === 'a_faire' && new Date(p.createdAt) < stale48h)
    if (stale.length > 0) actions.push(`${stale.length} prestation${stale.length > 1 ? 's' : ''} jamais démarrée${stale.length > 1 ? 's' : ''} depuis +48h : ${stale.slice(0, 3).map((p: any) => p.title).join(', ')}${stale.length > 3 ? '…' : ''}.`)

    // Invoices
    if (pendingInvoices.length > 0) {
      priorities.push(`📄 ${pendingInvoices.length} facture${pendingInvoices.length > 1 ? 's' : ''} en attente de paiement (${(pendingInvoices as any[]).map((i: any) => i.freelancer?.name).filter(Boolean).join(', ')}).`)
      actions.push(`Approuver ${pendingInvoices.length > 1 ? 'les factures en attente' : `la facture de ${(pendingInvoices as any[])[0]?.freelancer?.name || '—'}`} dans Facturation.`)
    }

    if (priorities.length === 0) priorities.push('🟢 Aucun retard critique détecté — la production est sous contrôle.')
    if (actions.length === 0) actions.push('Rien d\'urgent : profites-en pour préparer les prochains tournages 🎬')

    // AI layer — if ANTHROPIC_API_KEY is set, Claude rewrites the brief with
    // real prioritisation and risk analysis. Rules above stay as the fallback.
    if (aiAvailable()) {
      const fmtD = (d: any) => d ? new Date(d).toISOString().slice(0, 10) : 'aucune'
      const context = {
        aujourdhui: startToday.toISOString().slice(0, 10),
        productions: active.map((p: any) => ({
          titre: p.title, client: p.client, statut: p.status, deadline: fmtD(p.deadline),
          assigne: name(p), livraison_deposee: !!p.deliveryLink,
          approuve_client: !!p.clientApprovedAt, cree_le: fmtD(p.createdAt),
          derniers_retours: p.lastFeedback ? String(p.lastFeedback).slice(0, 150) : null,
        })),
        factures_en_attente: (pendingInvoices as any[]).map((i: any) => ({ prestataire: i.freelancer?.name, mois: i.month, montant: i.validatedAmount })),
      }
      const aiText = await askClaude(
        `Tu es le directeur de production du studio vidéo "instant." (Toulouse). Chaque matin tu écris le brief opérationnel d'Axel et Lucas, les deux fondateurs.
Règles :
- Français, ton direct et concret, tutoiement.
- "priorities" : 5 à 8 constats classés du plus critique au moins critique, chacun préfixé d'un emoji (🔴 retard critique, 🟡 aujourd'hui, 🟠 demain, 🟣 à valider, 💬 retours client, 🎉 bonne nouvelle, 📄 facturation, 🟢 RAS). Signale les risques non évidents (ex : production en révisions depuis plusieurs jours, prestataire surchargé, deadline proche sans livraison).
- "actions" : 3 à 6 actions concrètes et immédiates, formulées à l'impératif, les plus rentables en premier.
- Réponds UNIQUEMENT avec un JSON valide : {"priorities": string[], "actions": string[]}.`,
        JSON.stringify(context),
        1800
      )
      const ai = extractJson<{ priorities?: string[]; actions?: string[] }>(aiText)
      if (ai && Array.isArray(ai.priorities) && ai.priorities.length > 0 && Array.isArray(ai.actions)) {
        return NextResponse.json(
          { priorities: ai.priorities.slice(0, 8), actions: ai.actions.slice(0, 6), generatedAt: now.toISOString(), ai: true },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      }
    }

    return NextResponse.json(
      { priorities: priorities.slice(0, 8), actions: actions.slice(0, 6), generatedAt: now.toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
