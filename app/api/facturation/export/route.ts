import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await db.monthlyPayout.findMany({
      orderBy: [{ month: 'desc' }],
      include: { freelancer: { select: { name: true, email: true, siret: true } } },
    })

    const header = ['Mois', 'Prestataire', 'Email', 'SIRET', 'Montant validé (€)', 'Nb prestations', 'Facture déposée', 'Statut paiement', 'Date paiement']
    const lines = rows.map((r: any) => [
      monthLabel(r.month),
      r.freelancer?.name || '',
      r.freelancer?.email || '',
      r.freelancer?.siret || '',
      (r.validatedAmount || 0).toString().replace('.', ','),
      r.projectCount || 0,
      r.invoiceUrl ? 'Oui' : 'Non',
      r.invoiceStatus === 'paid' ? 'Payé' : r.invoiceStatus === 'uploaded' ? 'En attente' : 'À déposer',
      r.paidAt ? new Date(r.paidAt).toLocaleDateString('fr-FR') : '',
    ])

    const csv = [header, ...lines]
      .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    return new NextResponse('﻿' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="facturation-instant-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
