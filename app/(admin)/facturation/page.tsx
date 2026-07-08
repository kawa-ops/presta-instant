'use client'
import { useEffect, useState } from 'react'
import { useCached } from '@/lib/useCached'
import Avatar from '@/components/Avatar'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/statuses'

// Admin billing — global payment management, monthly timeline UX
// (same interaction model as the contractor billing page).

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const glass: React.CSSProperties = {
  background: 'rgba(26,18,48,0.65)', backdropFilter: 'blur(14px)',
  border: '1px solid rgba(167,139,250,0.18)', borderRadius: 16,
}

// Per-production breakdown of one provider's month, with inline
// amount editing and removal (recalculates all totals server-side).
function PayoutDetail({ freelancerId, month, onTotalsChanged }: { freelancerId: string; month: string; onTotalsChanged: () => void }) {
  const [prods, setProds] = useState<any[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const d = await fetch(`/api/facturation/details?freelancerId=${freelancerId}&month=${month}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    setProds(d?.productions || [])
  }
  useEffect(() => { load() }, [freelancerId, month]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(productionId: string, action: 'amount' | 'remove', price?: number) {
    setBusy(productionId)
    const res = await fetch('/api/facturation/details', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productionId, action, price }),
    })
    setBusy(null)
    if (res.ok) {
      setEditing(null)
      if (action === 'remove') setProds(p => (p || []).filter(x => x.id !== productionId))
      else setProds(p => (p || []).map(x => x.id === productionId ? { ...x, price } : x))
      onTotalsChanged()
    } else {
      const d = await res.json().catch(() => null)
      alert(d?.error || 'Erreur')
    }
  }

  if (prods === null) return <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.72rem', padding: '10px 14px' }}>Chargement…</p>
  if (prods.length === 0) return <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.72rem', padding: '10px 14px' }}>Aucune prestation rattachée à ce mois.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '4px 8px 10px' }}>
      {prods.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 9, border: '1px solid rgba(167,139,250,0.08)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</p>
            <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem' }}>{p.client} · {new Date(p.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
          </div>
          <span style={{ background: `${STATUS_COLORS[p.status] || '#8b7fb8'}18`, color: STATUS_COLORS[p.status] || '#8b7fb8', padding: '1px 8px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{STATUS_LABELS[p.status] || p.status}</span>

          {editing === p.id ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input
                autoFocus type="number" min="0" value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') act(p.id, 'amount', parseFloat(editValue)); if (e.key === 'Escape') setEditing(null) }}
                style={{ width: 76, background: 'rgba(12,8,26,0.9)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 7, padding: '4px 8px', color: '#f0ebe3', fontSize: '0.76rem', fontWeight: 800 }}
              />
              <button onClick={() => act(p.id, 'amount', parseFloat(editValue))} disabled={busy === p.id} style={{ background: '#22c55e', color: '#0a0a0a', border: 'none', borderRadius: 7, padding: '4px 9px', fontWeight: 900, cursor: 'pointer', fontSize: '0.7rem' }}>✓</button>
              <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 7, padding: '4px 8px', color: 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
            </span>
          ) : (
            <>
              <p style={{ color: '#c4b5fd', fontSize: '0.82rem', fontWeight: 900, minWidth: 62, textAlign: 'right' }}>{(p.price || 0).toLocaleString('fr-FR')} €</p>
              <button title="Modifier le montant" onClick={() => { setEditing(p.id); setEditValue(String(p.price || 0)) }} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 7, padding: '4px 9px', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.7rem' }}>✎</button>
              <button
                title="Retirer de la facturation"
                disabled={busy === p.id}
                onClick={() => { if (confirm(`Retirer "${p.title}" de la facturation de ce mois ?\n\nLa production n'est pas supprimée — seul le paiement est retiré et les totaux sont recalculés.`)) act(p.id, 'remove') }}
                style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 7, padding: '4px 9px', color: '#fb7185', cursor: 'pointer', fontSize: '0.7rem', opacity: busy === p.id ? 0.5 : 1 }}
              >🗑</button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AdminFacturationPage() {
  const { data: payoutsData, loading, refresh } = useCached<any[]>('apayouts', '/api/monthly-payouts')
  const payouts = Array.isArray(payoutsData) ? payoutsData : []
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [openMonth, setOpenMonth] = useState<string>(currentMonth)
  const [paying, setPaying] = useState<string | null>(null)
  const [openProvider, setOpenProvider] = useState<string | null>(null)

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
                  {open.rows.map(p => {
                    const expanded = openProvider === p.id
                    return (
                    <div key={p.id} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, border: `1px solid ${expanded ? 'rgba(167,139,250,0.3)' : 'rgba(167,139,250,0.1)'}` }}>
                    <div onClick={() => setOpenProvider(expanded ? null : p.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', cursor: 'pointer' }}>
                      <span style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.7rem', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', width: 12 }}>▶</span>
                      <Avatar url={p.freelancer?.profilePicUrl} name={p.freelancer?.name} level={0} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 800 }}>{p.freelancer?.name || '—'}</p>
                        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.7rem' }}>{p.projectCount} prestation{p.projectCount > 1 ? 's' : ''} validée{p.projectCount > 1 ? 's' : ''} — cliquer pour le détail</p>
                      </div>

                      <p style={{ color: '#f0ebe3', fontSize: '0.95rem', fontWeight: 900 }}>{(p.validatedAmount || 0).toLocaleString('fr-FR')} €</p>

                      {p.invoiceUrl ? (
                        <a href={p.invoiceUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ background: 'rgba(165,180,252,0.1)', border: '1px solid rgba(165,180,252,0.25)', borderRadius: 8, padding: '6px 12px', color: '#a5b4fc', fontSize: '0.72rem', textDecoration: 'none', fontWeight: 700 }}>📄 Facture ↗</a>
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
                        <button onClick={e => { e.stopPropagation(); markPaid(p.id) }} disabled={paying === p.id} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 800, cursor: 'pointer', fontSize: '0.74rem', minWidth: 108, opacity: paying === p.id ? 0.6 : 1 }}>
                          {paying === p.id ? '…' : '✓ Marquer payé'}
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <PayoutDetail freelancerId={p.freelancerId || p.freelancer?.id} month={p.month} onTotalsChanged={refresh} />
                    )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
