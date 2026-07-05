'use client'
import { useEffect, useState } from 'react'

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

export default function AdminFacturationPage() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await fetch('/api/monthly-payouts').then(r => r.json()).catch(() => [])
    setPayouts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markPaid(id: string) {
    if (!confirm('Marquer cette facture comme payée ?')) return
    setPaying(id)
    await fetch('/api/monthly-payouts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, invoiceStatus: 'paid' }) })
    setPaying(null)
    load()
  }

  // Group by month
  const byMonth: Record<string, any[]> = {}
  payouts.forEach(p => {
    if (!byMonth[p.month]) byMonth[p.month] = []
    byMonth[p.month].push(p)
  })
  const months = Object.keys(byMonth).sort().reverse()

  const totalPending = payouts.filter(p => p.invoiceStatus !== 'paid').reduce((a, p) => a + (p.validatedAmount || 0), 0)
  const totalPaid = payouts.filter(p => p.invoiceStatus === 'paid').reduce((a, p) => a + (p.validatedAmount || 0), 0)
  const invoicesWaiting = payouts.filter(p => p.invoiceStatus === 'uploaded').length

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Facturation</h1>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.18)', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>À payer</p>
          <p style={{ color: '#eab308', fontSize: '1.5rem', fontWeight: 800 }}>{totalPending.toLocaleString('fr-FR')} €</p>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Factures reçues en attente</p>
          <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 800 }}>{invoicesWaiting}</p>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total payé</p>
          <p style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 800 }}>{totalPaid.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : months.length === 0 ? (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem' }}>Aucune facturation pour l&apos;instant — les montants apparaissent quand une prestation d&apos;un prestataire est validée.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {months.map(month => (
            <div key={month}>
              <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{monthLabel(month)}</p>
              <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
                {byMonth[month].map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < byMonth[month].length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 700 }}>{p.freelancer?.name || '—'}</p>
                      <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginTop: 2 }}>{p.projectCount} prestation{p.projectCount > 1 ? 's' : ''} validée{p.projectCount > 1 ? 's' : ''}</p>
                    </div>

                    <p style={{ color: '#f0ebe3', fontSize: '0.95rem', fontWeight: 800 }}>{(p.validatedAmount || 0).toLocaleString('fr-FR')} €</p>

                    {/* Invoice link */}
                    {p.invoiceUrl ? (
                      <a href={p.invoiceUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 7, padding: '6px 12px', color: '#3b82f6', fontSize: '0.72rem', textDecoration: 'none', fontWeight: 600 }}>
                        📄 Facture ↗
                      </a>
                    ) : (
                      <span style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem' }}>Pas de facture</span>
                    )}

                    {/* Status / action */}
                    {p.invoiceStatus === 'paid' ? (
                      <div style={{ textAlign: 'right', minWidth: 110 }}>
                        <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '5px 14px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>✓ Payée</span>
                        {p.paidAt && <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.62rem', marginTop: 4 }}>le {new Date(p.paidAt).toLocaleDateString('fr-FR')}</p>}
                      </div>
                    ) : (
                      <button
                        onClick={() => markPaid(p.id)}
                        disabled={paying === p.id}
                        style={{ background: '#22c55e', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', minWidth: 110, opacity: paying === p.id ? 0.6 : 1 }}
                      >
                        {paying === p.id ? '…' : '✓ Marquer payé'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
