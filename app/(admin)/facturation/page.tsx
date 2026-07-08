'use client'
import { useState } from 'react'
import { useCached } from '@/lib/useCached'
import Avatar from '@/components/Avatar'

// Admin billing — global payment management, monthly timeline UX
// (same interaction model as the contractor billing page).

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const glass: React.CSSProperties = {
  background: 'rgba(26,18,48,0.65)', backdropFilter: 'blur(14px)',
  border: '1px solid rgba(167,139,250,0.18)', borderRadius: 16,
}

export default function AdminFacturationPage() {
  const { data: payoutsData, loading, refresh } = useCached<any[]>('apayouts', '/api/monthly-payouts')
  const payouts = Array.isArray(payoutsData) ? payoutsData : []
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [openMonth, setOpenMonth] = useState<string>(currentMonth)
  const [paying, setPaying] = useState<string | null>(null)

  const byMonth: Record<string, any[]> = {}
  payouts.forEach(p => { if (!byMonth[p.month]) byMonth[p.month] = []; byMonth[p.month].push(p) })

  const months = Array.from({ length: 12 }, (_, m) => {
    const key = `2026-${String(m + 1).padStart(2, '0')}`
    const rows = byMonth[key] || []
    const total = rows.reduce((a, p) => a + (p.validatedAmount || 0), 0)
    const unpaid = rows.filter(p => p.invoiceStatus !== 'paid')
    const toPay = unpaid.reduce((a, p) => a + (p.validatedAmount || 0), 0)
    const waiting = rows.filter(p => p.invoiceStatus === 'uploaded').length
    let status: 'done' | 'current' | 'action' | 'future'
    if (rows.length > 0 && unpaid.length === 0) status = 'done'
    else if (toPay > 0 || waiting > 0) status = 'action'
    else if (key === currentMonth) status = 'current'
    else if (key < currentMonth) status = 'done'
    else status = 'future'
    return { key, label: MONTHS_FR[m], rows, total, toPay, waiting, status }
  })

  const STYLES = {
    done:    { border: 'rgba(34,197,94,0.25)',   bg: 'rgba(34,197,94,0.05)',   dot: '#22c55e' },
    current: { border: 'rgba(167,139,250,0.35)', bg: 'rgba(167,139,250,0.07)', dot: '#a78bfa' },
    action:  { border: 'rgba(236,72,153,0.35)',  bg: 'rgba(236,72,153,0.07)',  dot: '#ec4899' },
    future:  { border: 'rgba(167,139,250,0.1)',  bg: 'transparent',            dot: '#5b5273' },
  }

  async function markPaid(id: string) {
    if (!confirm('Marquer cette facture comme payée ?')) return
    setPaying(id)
    await fetch('/api/monthly-payouts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, invoiceStatus: 'paid' }) })
    setPaying(null)
    refresh()
  }

  const totalPendingAll = payouts.filter(p => p.invoiceStatus !== 'paid').reduce((a, p) => a + (p.validatedAmount || 0), 0)
  const totalPaidAll = payouts.filter(p => p.invoiceStatus === 'paid').reduce((a, p) => a + (p.validatedAmount || 0), 0)
  const open = months.find(m => m.key === openMonth)

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Facturation</h1>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.75rem', marginTop: 3 }}>Gestion globale des paiements prestataires — clique sur un mois</p>
        </div>
        <a href="/api/facturation/export" style={{ background: 'rgba(240,235,227,0.05)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '8px 16px', color: 'rgba(240,235,227,0.6)', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>⬇ Exporter CSV</a>
      </div>

      {/* Global summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ ...glass, background: 'rgba(236,72,153,0.06)', borderColor: 'rgba(236,72,153,0.25)', padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>À payer (total)</p>
          <p style={{ color: '#ec4899', fontSize: '1.5rem', fontWeight: 900 }}>{totalPendingAll.toLocaleString('fr-FR')} €</p>
        </div>
        <div style={{ ...glass, background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.25)', padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total payé</p>
          <p style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 900 }}>{totalPaidAll.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : (
        <>
          {/* Monthly timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {months.map(m => {
              const st = STYLES[m.status]
              const isOpen = openMonth === m.key
              return (
                <button key={m.key} onClick={() => setOpenMonth(m.key)} style={{
                  ...glass, background: st.bg, borderColor: isOpen ? st.dot : st.border,
                  padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                  opacity: m.status === 'future' ? 0.45 : 1, transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot }} />
                    <p style={{ color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 800 }}>{m.label}</p>
                  </div>
                  <p style={{ color: st.dot, fontSize: '0.66rem', fontWeight: 700 }}>
                    {m.status === 'done' ? '✓ Complété' : m.status === 'action' ? `${m.toPay.toLocaleString('fr-FR')} € à payer` : m.key === currentMonth ? 'Mois en cours' : 'À venir'}
                  </p>
                  <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.78rem', fontWeight: 800, marginTop: 3 }}>{m.total.toLocaleString('fr-FR')} €</p>
                </button>
              )
            })}
          </div>

          {/* Month detail panel */}
          {open && (
            <div style={{ ...glass, borderColor: `${STYLES[open.status].dot}50`, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ color: '#f0ebe3', fontSize: '1.05rem', fontWeight: 900 }}>{open.label} 2026</p>
                <div style={{ display: 'flex', gap: 18 }}>
                  <p style={{ color: '#ec4899', fontSize: '0.85rem', fontWeight: 800 }}>{open.toPay.toLocaleString('fr-FR')} € à payer</p>
                  <p style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 800 }}>{(open.total - open.toPay).toLocaleString('fr-FR')} € payés</p>
                </div>
              </div>

              {open.rows.length === 0 ? (
                <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                  Aucun paiement prestataire pour ce mois — montant : 0 €
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {open.rows.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 12, border: '1px solid rgba(167,139,250,0.1)' }}>
                      <Avatar url={p.freelancer?.profilePicUrl} name={p.freelancer?.name} level={0} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 800 }}>{p.freelancer?.name || '—'}</p>
                        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.7rem' }}>{p.projectCount} prestation{p.projectCount > 1 ? 's' : ''} validée{p.projectCount > 1 ? 's' : ''}</p>
                      </div>

                      <p style={{ color: '#f0ebe3', fontSize: '0.95rem', fontWeight: 900 }}>{(p.validatedAmount || 0).toLocaleString('fr-FR')} €</p>

                      {p.invoiceUrl ? (
                        <a href={p.invoiceUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(165,180,252,0.1)', border: '1px solid rgba(165,180,252,0.25)', borderRadius: 8, padding: '6px 12px', color: '#a5b4fc', fontSize: '0.72rem', textDecoration: 'none', fontWeight: 700 }}>📄 Facture ↗</a>
                      ) : p.invoiceStatus === 'uploaded' ? (
                        <span style={{ color: '#e879f9', fontSize: '0.7rem', fontWeight: 700 }}>Sans facture</span>
                      ) : (
                        <span style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.7rem' }}>En attente</span>
                      )}

                      {p.invoiceStatus === 'paid' ? (
                        <div style={{ textAlign: 'right', minWidth: 108 }}>
                          <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', padding: '5px 14px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800 }}>✓ Payée</span>
                          {p.paidAt && <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.62rem', marginTop: 4 }}>le {new Date(p.paidAt).toLocaleDateString('fr-FR')}</p>}
                        </div>
                      ) : (
                        <button onClick={() => markPaid(p.id)} disabled={paying === p.id} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 800, cursor: 'pointer', fontSize: '0.74rem', minWidth: 108, opacity: paying === p.id ? 0.6 : 1 }}>
                          {paying === p.id ? '…' : '✓ Marquer payé'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
