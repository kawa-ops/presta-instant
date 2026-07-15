'use client'
import { useEffect, useState } from 'react'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/statuses'

// Vue par client — groups every production (active + archived) by the
// `client` field: volume, revenue, provider cost, margin, last delivery.

const glass: React.CSSProperties = {
  background: 'rgba(26,18,48,0.65)', backdropFilter: 'blur(14px)',
  border: '1px solid rgba(167,139,250,0.18)', borderRadius: 16,
}

function fmt(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }

export default function ClientsPage() {
  const [prods, setProds] = useState<any[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/productions').then(r => r.json()).catch(() => []),
      fetch('/api/productions?archived=true').then(r => r.json()).catch(() => []),
    ]).then(([a, b]) => setProds([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]))
  }, [])

  const byClient: Record<string, any[]> = {}
  ;(prods || []).forEach(p => {
    const c = (p.client || 'Sans client').trim() || 'Sans client'
    if (!byClient[c]) byClient[c] = []
    byClient[c].push(p)
  })

  const clients = Object.entries(byClient).map(([name, list]) => {
    const active = list.filter(p => p.status !== 'valide').length
    const delivered = list.filter(p => p.status === 'valide').length
    const revenue = list.reduce((a, p) => a + (p.clientPrice || 0), 0)
    const cost = list.reduce((a, p) => a + (p.price || 0), 0)
    const lastDelivery = list.filter(p => p.status === 'valide').map(p => p.updatedAt).sort().pop() || null
    return { name, list: list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')), active, delivered, revenue, cost, margin: revenue - cost, lastDelivery }
  }).sort((a, b) => b.revenue - a.revenue || b.list.length - a.list.length)

  const totalRevenue = clients.reduce((a, c) => a + c.revenue, 0)
  const totalMargin = clients.reduce((a, c) => a + c.margin, 0)

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Clients</h1>
        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.75rem', marginTop: 3 }}>Vue business par client — clique pour le détail des productions</p>
      </div>

      {/* Global summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ ...glass, padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Clients</p>
          <p style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 900 }}>{clients.length}</p>
        </div>
        <div style={{ ...glass, padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>CA total</p>
          <p style={{ color: '#a78bfa', fontSize: '1.4rem', fontWeight: 900 }}>{totalRevenue.toLocaleString('fr-FR')} €</p>
        </div>
        <div style={{ ...glass, padding: '14px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Marge totale</p>
          <p style={{ color: totalMargin >= 0 ? '#22c55e' : '#fb7185', fontSize: '1.4rem', fontWeight: 900 }}>{totalMargin.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {prods === null ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : clients.length === 0 ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Aucune production</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clients.map(c => {
            const expanded = open === c.name
            return (
              <div key={c.name} style={{ ...glass, borderColor: expanded ? 'rgba(167,139,250,0.35)' : 'rgba(167,139,250,0.18)', overflow: 'hidden' }}>
                <div onClick={() => setOpen(expanded ? null : c.name)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.7rem', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', width: 12 }}>▶</span>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <p style={{ color: '#f0ebe3', fontSize: '0.92rem', fontWeight: 800 }}>{c.name}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem' }}>Dernière livraison : {fmt(c.lastDelivery)}</p>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 68 }}>
                    <p style={{ color: '#a5b4fc', fontSize: '0.95rem', fontWeight: 900 }}>{c.active}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.6rem' }}>actives</p>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 68 }}>
                    <p style={{ color: '#22c55e', fontSize: '0.95rem', fontWeight: 900 }}>{c.delivered}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.6rem' }}>livrées</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <p style={{ color: '#a78bfa', fontSize: '0.9rem', fontWeight: 900 }}>{c.revenue.toLocaleString('fr-FR')} €</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.6rem' }}>CA client</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.9rem', fontWeight: 800 }}>{c.cost.toLocaleString('fr-FR')} €</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.6rem' }}>coût presta</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <p style={{ color: c.margin >= 0 ? '#22c55e' : '#fb7185', fontSize: '0.9rem', fontWeight: 900 }}>{c.margin.toLocaleString('fr-FR')} €</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.6rem' }}>marge</p>
                  </div>
                </div>

                {expanded && (
                  <div style={{ borderTop: '1px solid rgba(167,139,250,0.12)' }}>
                    {c.list.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px 9px 48px', borderBottom: '1px solid rgba(167,139,250,0.06)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</p>
                          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem' }}>{p.assignedTo?.name || '—'} · {fmt(p.updatedAt)}</p>
                        </div>
                        <span style={{ background: `${STATUS_COLORS[p.status] || '#8b7fb8'}18`, color: STATUS_COLORS[p.status] || '#8b7fb8', padding: '1px 8px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{STATUS_LABELS[p.status] || p.status}</span>
                        {p.clientPrice ? <span style={{ color: '#a78bfa', fontSize: '0.72rem', fontWeight: 800, minWidth: 66, textAlign: 'right' }}>{p.clientPrice.toLocaleString('fr-FR')} €</span> : <span style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem', minWidth: 66, textAlign: 'right' }}>—</span>}
                      </div>
                    ))}
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
