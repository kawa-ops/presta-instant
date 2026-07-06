'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Timeline from '@/components/Timeline'
import Thread from '@/components/Thread'

const STATUS_COLORS: Record<string, string> = { a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308', revisions: '#f97316', livre: '#a78bfa', envoye_client: '#38bdf8', retours_client: '#f43f5e', valide: '#22c55e' }
const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', revisions: 'Retours à faire', livre: 'En validation', envoye_client: 'Envoyé client', retours_client: 'Retours client', valide: 'Validé' }

function fmt(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%' }

function DeliveryInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Lien Drive, Dropbox, WeTransfer…" />
}

export default function MesPrestationsPage() {
  const { data: session } = useSession()
  const [prods, setProds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deliveryLinks, setDeliveryLinks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const userId = (session?.user as any)?.id
    if (!userId) { setLoading(false); return }
    const data = await fetch(`/api/productions?assignedToId=${userId}`).then(r => r.json())
    const list = Array.isArray(data) ? data : []
    setProds(list)
    const links: Record<string, string> = {}
    list.forEach((p: any) => { links[p.id] = p.deliveryLink || '' })
    setDeliveryLinks(links)
    setLoading(false)
  }

  useEffect(() => { if (session) load() }, [session])

  async function updateStatus(id: string, status: string) {
    setSaving(id)
    await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setSaving(null)
    load()
  }

  async function saveDelivery(id: string) {
    if (!deliveryLinks[id]?.trim()) {
      alert('Ajoute le lien de livraison (Drive, Dropbox, WeTransfer…) avant de marquer comme livré.')
      return
    }
    setSaving(id + '_d')
    await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryLink: deliveryLinks[id], status: 'livre' }) })
    setSaving(null)
    load()
  }

  const active = prods.filter(p => !['valide'].includes(p.status))
  const done = prods.filter(p => p.status === 'valide')

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Mes prestations</h1>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : prods.length === 0 ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Aucune prestation assignée</p>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>En cours ({active.length})</p>
              <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
                {active.map(p => {
                  const isOverdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== 'valide'
                  return (
                    <div key={p.id}>
                      <div onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: expanded === p.id ? 'rgba(240,235,227,0.03)' : 'transparent' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>{p.title}</p>
                          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginTop: 3 }}>{p.client}</p>
                        </div>
                        {p.price ? <span style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 800 }}>{p.price.toLocaleString('fr-FR')} €</span> : null}
                        <span style={{ background: `${STATUS_COLORS[p.status]}15`, color: STATUS_COLORS[p.status], padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span>
                        <span style={{ color: isOverdue ? '#ef4444' : 'rgba(240,235,227,0.35)', fontSize: '0.75rem', fontWeight: isOverdue ? 600 : 400 }}>{fmt(p.deadline)}</span>
                        <span style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.75rem' }}>{expanded === p.id ? '▲' : '▼'}</span>
                      </div>

                      {expanded === p.id && (
                        <div style={{ padding: '16px 20px 20px', borderBottom: '1px solid #1a1a1a', background: '#111' }}>
                          {/* Production timeline */}
                          <div style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                            <Timeline status={p.status} isFreelance={true} />
                          </div>

                          {/* Revision feedback from Lucas */}
                          {p.status === 'revisions' && p.lastFeedback && (
                            <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                              <p style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>✎ Retours de Lucas</p>
                              <p style={{ color: 'rgba(240,235,227,0.85)', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{p.lastFeedback}</p>
                            </div>
                          )}

                          {p.brief && (
                            <div style={{ marginBottom: 16 }}>
                              <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Brief</p>
                              <p style={{ color: 'rgba(240,235,227,0.7)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{p.brief}</p>
                            </div>
                          )}
                          {p.sourcesLink && (
                            <div style={{ marginBottom: 16 }}>
                              <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Sources</p>
                              <a href={p.sourcesLink} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.8rem' }}>{p.sourcesLink}</a>
                            </div>
                          )}
                          <div style={{ marginBottom: 14 }}>
                            <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Livrer le travail</p>
                            <DeliveryInput value={deliveryLinks[p.id] || ''} onChange={v => setDeliveryLinks(l => ({ ...l, [p.id]: v }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveDelivery(p.id)} disabled={saving === p.id + '_d'} style={{ background: '#a78bfa', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>
                              {saving === p.id + '_d' ? 'Envoi…' : p.status === 'revisions' ? '⬆ Envoyer la nouvelle version' : '✓ Marquer comme livré'}
                            </button>
                            {p.status === 'a_faire' && (
                              <button onClick={() => updateStatus(p.id, 'en_cours')} disabled={saving === p.id} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '8px 16px', color: '#3b82f6', cursor: 'pointer', fontSize: '0.78rem' }}>
                                Démarrer
                              </button>
                            )}
                          </div>

                          {/* Discussion avec Lucas + historique des versions */}
                          <Thread productionId={p.id} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Validées ({done.length})</p>
              <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
                {done.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid #1a1a1a' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.82rem' }}>{p.title}</p>
                      <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.7rem' }}>{p.client}</p>
                    </div>
                    {p.price ? <span style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem', fontWeight: 700 }}>{p.price.toLocaleString('fr-FR')} €</span> : null}
                    <span style={{ color: '#22c55e', fontSize: '0.72rem', fontWeight: 600 }}>✓ Validé</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
