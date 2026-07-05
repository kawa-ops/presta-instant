'use client'
import { useEffect, useState } from 'react'

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function getMonths() {
  const months = []
  for (let m = 0; m < 12; m++) {
    const key = `2026-${String(m + 1).padStart(2, '0')}`
    months.push({ key, label: `${MONTHS_FR[m]} 2026` })
  }
  return months.reverse()
}

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' as const }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }

function InvoiceUrlInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Lien Google Drive, Dropbox vers le PDF…" />
}

export default function FreelancerFacturationPage() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [invoiceUrls, setInvoiceUrls] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await fetch('/api/monthly-payouts').then(r => r.json()).catch(() => [])
    setPayouts(Array.isArray(data) ? data : [])
    const urls: Record<string, string> = {}
    if (Array.isArray(data)) data.forEach((p: any) => { urls[p.id] = p.invoiceUrl || '' })
    setInvoiceUrls(urls)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function depositInvoice(payoutId: string) {
    const url = invoiceUrls[payoutId]
    if (!url?.trim()) return
    setUploading(payoutId)
    await fetch('/api/monthly-payouts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: payoutId, invoiceUrl: url }) })
    setUploading(null)
    setSuccess(payoutId)
    setTimeout(() => setSuccess(null), 3000)
    load()
  }

  async function ensureMonth(monthKey: string) {
    await fetch('/api/monthly-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: monthKey }) })
    load()
  }

  const months = getMonths()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const payoutMap: Record<string, any> = {}
  payouts.forEach(p => { payoutMap[p.month] = p })

  const totalEarned = payouts.reduce((a, p) => a + (p.validatedAmount || 0), 0)
  const totalPaid = payouts.filter(p => p.invoiceStatus === 'paid').reduce((a, p) => a + (p.validatedAmount || 0), 0)

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Facturation</h1>
        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.78rem', marginTop: 4 }}>Déposez vos factures mensuelles ici. Axel sera notifié à chaque dépôt.</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total généré</p>
          <p style={{ color: '#a78bfa', fontSize: '1.4rem', fontWeight: 800 }}>{totalEarned.toLocaleString('fr-FR')} €</p>
        </div>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total reçu</p>
          <p style={{ color: '#22c55e', fontSize: '1.4rem', fontWeight: 800 }}>{totalPaid.toLocaleString('fr-FR')} €</p>
        </div>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>En attente</p>
          <p style={{ color: '#eab308', fontSize: '1.4rem', fontWeight: 800 }}>{(totalEarned - totalPaid).toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {months.map(({ key, label }) => {
            const payout = payoutMap[key]
            const isCurrent = key === currentMonth
            const isPast = key < currentMonth
            const hasActivity = payout && (payout.validatedAmount > 0 || payout.invoiceUrl)

            if (!hasActivity && !isCurrent && !isPast) return null

            return (
              <div key={key} style={{ background: '#141414', border: `1px solid ${isCurrent ? 'rgba(167,139,250,0.25)' : '#222'}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ color: '#f0ebe3', fontSize: '0.88rem', fontWeight: 700 }}>{label}</p>
                      {isCurrent && <span style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', padding: '1px 8px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 600 }}>Ce mois</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 6, flexWrap: 'wrap' }}>
                      <p style={{ color: payout?.validatedAmount > 0 ? '#22c55e' : 'rgba(240,235,227,0.25)', fontSize: '0.78rem' }}>
                        Montant validé : <strong>{(payout?.validatedAmount || 0).toLocaleString('fr-FR')} €</strong>
                      </p>
                      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.78rem' }}>
                        Prestations : <strong>{payout?.projectCount || 0}</strong>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* Invoice status */}
                    {payout?.invoiceStatus === 'paid' ? (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>✓ Payée</span>
                        {payout.paidAt && <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', marginTop: 3 }}>{new Date(payout.paidAt).toLocaleDateString('fr-FR')}</p>}
                      </div>
                    ) : payout?.invoiceStatus === 'uploaded' ? (
                      <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>● Facture déposée</span>
                    ) : payout?.validatedAmount > 0 ? (
                      <span style={{ background: 'rgba(234,179,8,0.08)', color: '#eab308', padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>○ Facture à déposer</span>
                    ) : null}
                  </div>
                </div>

                {/* Invoice upload section */}
                {payout && payout.invoiceStatus !== 'paid' && payout.validatedAmount > 0 && (
                  <div style={{ padding: '0 20px 16px', borderTop: '1px solid #1a1a1a', paddingTop: 14 }}>
                    {success === payout.id && (
                      <p style={{ color: '#22c55e', fontSize: '0.75rem', marginBottom: 8 }}>✓ Facture déposée — Axel a été notifié</p>
                    )}
                    <label style={LA}>Lien de la facture PDF</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <InvoiceUrlInput
                          value={invoiceUrls[payout.id] || ''}
                          onChange={v => setInvoiceUrls(u => ({ ...u, [payout.id]: v }))}
                        />
                      </div>
                      <button
                        onClick={() => depositInvoice(payout.id)}
                        disabled={uploading === payout.id}
                        style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap', opacity: uploading === payout.id ? 0.6 : 1 }}
                      >
                        {uploading === payout.id ? 'Dépôt…' : 'Déposer la facture'}
                      </button>
                    </div>
                    {payout.invoiceUrl && payout.invoiceStatus === 'uploaded' && (
                      <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', marginTop: 6 }}>
                        Facture actuelle : <a href={payout.invoiceUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>voir le document ↗</a>
                      </p>
                    )}
                  </div>
                )}

                {/* No payout yet for current month — create it */}
                {!payout && isCurrent && (
                  <div style={{ padding: '0 20px 14px' }}>
                    <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.75rem' }}>Aucune prestation validée ce mois pour l&apos;instant.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
