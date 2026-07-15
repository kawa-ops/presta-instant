import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { emailInvoiceUploaded } from '@/lib/mail'
import { waAccounting } from '@/lib/whatsapp'

// Auto-generated French invoice (PDF) for a provider's monthly payout.
// Regenerable while the payout is unpaid; attached as invoiceUrl.

export const dynamic = 'force-dynamic'
const db = prisma as any

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function euro(n: number) {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  if ((session.user as any).role === 'admin') return NextResponse.json({ error: 'Réservé aux prestataires' }, { status: 403 })

  const month = new URL(req.url).searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'Paramètre month requis (YYYY-MM)' }, { status: 400 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Stockage non configuré' }, { status: 500 })

  try {
    const [user, payout, prods] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, siret: true, address: true, phone: true } }),
      db.monthlyPayout.findUnique({ where: { freelancerId_month: { freelancerId: userId, month } } }).catch(() => null),
      db.production.findMany({
        where: { assignedToId: userId, payoutMonth: month },
        select: { title: true, client: true, price: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
      }),
    ])
    if (!payout || prods.length === 0) return NextResponse.json({ error: 'Aucune prestation validée pour ce mois' }, { status: 404 })
    if (payout.invoiceStatus === 'paid') return NextResponse.json({ error: 'Facture déjà payée — non modifiable' }, { status: 400 })

    const total = prods.reduce((a: number, p: any) => a + (p.price || 0), 0)
    const [y, m] = month.split('-').map(Number)
    const monthLabel = `${MONTHS_FR[m - 1]} ${y}`
    const invoiceNumber = `${month.replace('-', '')}-${userId.slice(-6).toUpperCase()}`
    const today = new Date().toLocaleDateString('fr-FR')

    // ---------- Build the PDF ----------
    const doc = await PDFDocument.create()
    const page = doc.addPage([595, 842]) // A4 portrait
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)
    const ink = rgb(0.1, 0.1, 0.12)
    const gray = rgb(0.45, 0.45, 0.5)
    let yPos = 790

    const draw = (text: string, x: number, opts: { size?: number; f?: any; color?: any } = {}) => {
      page.drawText(text, { x, y: yPos, size: opts.size || 10, font: opts.f || font, color: opts.color || ink })
    }

    draw('FACTURE', 50, { size: 24, f: bold })
    draw(`N° ${invoiceNumber}`, 430, { size: 11, f: bold })
    yPos -= 16
    draw(`Date d'émission : ${today}`, 430, { size: 9, color: gray })
    yPos -= 40

    // Issuer (provider)
    draw('ÉMETTEUR', 50, { size: 8, f: bold, color: gray })
    yPos -= 14
    draw(user?.name || '', 50, { size: 11, f: bold })
    yPos -= 13
    for (const line of (user?.address || 'Adresse non renseignée').split('\n').slice(0, 3)) {
      draw(line, 50, { size: 9 }); yPos -= 12
    }
    if (user?.siret) { draw(`SIRET : ${user.siret}`, 50, { size: 9 }); yPos -= 12 }
    if (user?.email) { draw(user.email, 50, { size: 9, color: gray }); yPos -= 12 }

    // Client (the studio)
    let yClient = 720
    const drawAt = (text: string, x: number, yy: number, opts: { size?: number; f?: any; color?: any } = {}) => {
      page.drawText(text, { x, y: yy, size: opts.size || 10, font: opts.f || font, color: opts.color || ink })
    }
    drawAt('FACTURÉ À', 350, yClient, { size: 8, f: bold, color: gray }); yClient -= 14
    drawAt('instant.', 350, yClient, { size: 11, f: bold }); yClient -= 13
    drawAt('Production vidéo & photo', 350, yClient, { size: 9 }); yClient -= 12
    drawAt('Toulouse, France', 350, yClient, { size: 9 }); yClient -= 12
    drawAt('hello@instantmov.fr', 350, yClient, { size: 9, color: gray })

    yPos = Math.min(yPos, 640) - 20
    draw(`Prestations de post-production — ${monthLabel}`, 50, { size: 11, f: bold })
    yPos -= 24

    // Table header
    page.drawRectangle({ x: 50, y: yPos - 4, width: 495, height: 18, color: rgb(0.93, 0.92, 0.95) })
    draw('Prestation', 56, { size: 8.5, f: bold })
    draw('Client', 300, { size: 8.5, f: bold })
    draw('Montant HT', 470, { size: 8.5, f: bold })
    yPos -= 20

    for (const p of prods) {
      if (yPos < 160) break // keep it single-page; totals stay correct
      const title = p.title.length > 42 ? p.title.slice(0, 41) + '…' : p.title
      const client = (p.client || '').length > 24 ? p.client.slice(0, 23) + '…' : (p.client || '')
      draw(title, 56, { size: 9 })
      draw(client, 300, { size: 9, color: gray })
      draw(euro(p.price || 0), 470, { size: 9 })
      yPos -= 16
    }

    yPos -= 8
    page.drawLine({ start: { x: 50, y: yPos }, end: { x: 545, y: yPos }, thickness: 0.7, color: rgb(0.8, 0.78, 0.85) })
    yPos -= 20
    draw('TOTAL HT', 380, { size: 11, f: bold })
    draw(euro(total), 470, { size: 11, f: bold })
    yPos -= 16
    draw('TVA non applicable, art. 293 B du CGI', 380, { size: 8, color: gray })

    // Footer
    drawAt('Paiement à réception — virement bancaire.', 50, 100, { size: 8, color: gray })
    drawAt(`Facture générée automatiquement via presta.instantmov.fr le ${today}.`, 50, 88, { size: 8, color: gray })

    const bytes = await doc.save()

    // ---------- Upload & attach ----------
    const path = `invoices/${userId}/${month}-facture.pdf`
    const blob = await put(path, Buffer.from(bytes), { access: 'public', contentType: 'application/pdf', addRandomSuffix: true } as any)

    await db.monthlyPayout.update({ where: { id: payout.id }, data: { invoiceUrl: blob.url, invoiceStatus: 'uploaded' } })

    // Same signals as a manual invoice upload
    emailInvoiceUploaded(user?.name || 'Prestataire', month).catch(() => {})
    waAccounting(`📄 ${user?.name || 'Un prestataire'} a généré sa facture de ${month} (${total.toLocaleString('fr-FR')} €) — à valider.`).catch(() => {})
    db.user.findMany({ where: { role: 'admin' } }).then((admins: any[]) => {
      for (const a of admins) {
        db.notification.create({ data: { userId: a.id, type: 'invoice_uploaded', message: `${user?.name || 'Un prestataire'} a généré sa facture de ${month}`, link: '/facturation' } }).catch(() => {})
      }
    }).catch(() => {})

    return NextResponse.json({ url: blob.url, total })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
