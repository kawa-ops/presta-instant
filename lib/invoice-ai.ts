import { prisma } from '@/lib/prisma'
import { aiAvailable, askClaudePdf, extractJson } from '@/lib/ai'

const db = prisma as any

// Sanity-checks an uploaded invoice PDF against the expected payout amount.
// Fire-and-forget: never blocks the upload, silent no-op without API key.
export async function checkInvoiceAmount(payoutId: string) {
  try {
    if (!aiAvailable()) return
    const payout = await db.monthlyPayout.findUnique({
      where: { id: payoutId },
      include: { freelancer: { select: { name: true } } },
    })
    if (!payout?.invoiceUrl) return

    // Only PDFs, max 4 MB (same cap as the upload route)
    const res = await fetch(payout.invoiceUrl)
    if (!res.ok) return
    const type = res.headers.get('content-type') || ''
    if (!type.includes('pdf') && !payout.invoiceUrl.toLowerCase().includes('.pdf')) return
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 4 * 1024 * 1024) return

    const text = await askClaudePdf(
      `Tu extrais le montant total d'une facture. Réponds UNIQUEMENT avec un JSON : {"total": number|null} — le montant total TTC (ou HT si pas de TVA) en euros, null si illisible.`,
      'Quel est le montant total de cette facture ?',
      buf.toString('base64')
    )
    const parsed = extractJson<{ total?: number | null }>(text)
    const found = typeof parsed?.total === 'number' ? parsed.total : null
    if (found === null) return

    const expected = payout.validatedAmount || 0
    if (Math.abs(found - expected) > 1) {
      const msg = `⚠️ Facture de ${payout.freelancer?.name || '?'} (${payout.month}) : montant ${found.toLocaleString('fr-FR')} € ≠ attendu ${expected.toLocaleString('fr-FR')} €`
      const admins = await db.user.findMany({ where: { role: 'admin' }, select: { id: true } }).catch(() => [])
      for (const a of admins) {
        db.notification.create({ data: { userId: a.id, type: 'invoice_uploaded', message: msg, link: '/facturation' } }).catch(() => {})
      }
    }
  } catch {}
}
