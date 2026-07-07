'use client'
import { useState } from 'react'
import { useCached } from '@/lib/useCached'

const STATUSES = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'revisions', label: 'Retours à faire' },
  { value: 'livre', label: 'À valider' },
  { value: 'envoye_client', label: 'Envoyé client' },
  { value: 'retours_client', label: 'Retours client' },
  { value: 'valide', label: 'Terminé' },
]

const IN: React.CSSProperties = { background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }

function fmt(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }

function F({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}

// Full editor — archives stay 100% editable (accounting fixes, reassignments…)
function ArchiveEditor({ p, freelancers, onSave, saving }: { p: any; freelancers: any[]; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    title: p.title, client: p.client, price: p.price?.toString() || '',
    clientPrice: p.clientPrice?.toString() || '',
    deadline: p.deadline ? p.deadline.split('T')[0] : '',
    productionDate: p.productionDate ? p.productionDate.split('T')[0] : '',
    status: p.status, assignedToId: p.assignedToId || '',
    internalNotes: p.internalNotes || '', deliveryLink: p.deliveryLink || '',
  })
  const s = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const margin = form.clientPrice && form.price ? parseFloat(form.clientPrice) - parseFloat(form.price) : null

  return (
    <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(167,139,250,0.08)', background: 'rgba(16,11,32,0.6)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div><label style={LA}>Titre</label><F value={form.title} onChange={s('title')} /></div>
        <div><label style={LA}>Client</label><F value={form.client} onChange={s('client')} /></div>
        <div><label style={LA}>Prix prestataire (€)</label><F type="number" value={form.price} onChange={s('price')} /></div>
        <div>
          <label style={LA}>Prix client (€)</label>
          <F type="number" value={form.clientPrice} onChange={s('clientPrice')} />
          {margin !== null && !isNaN(margin) && (
            <p style={{ color: margin >= 0 ? '#22c55e' : '#fb7185', fontSize: '0.68rem', marginTop: 4, fontWeight: 700 }}>Marge : {margin.toLocaleString('fr-FR')} €</p>
          )}
        </div>
        <div>
          <label style={LA}>Assigné à</label>
          <select style={IN} value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
            <option value="">Lucas (par défaut)</option>
            {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div><label style={LA}>Date de la prestation</label><F type="date" value={form.productionDate} onChange={s('productionDate')} /></div>
        <div><label style={LA}>Deadline</label><F type="date" value={form.deadline} onChange={s('deadline')} /></div>
        <div>
          <label style={LA}>Statut</label>
          <select style={IN} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {STATUSES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
          </select>
        </div>
        <div><label style={LA}>Lien livraison</label><F value={form.deliveryLink} onChange={s('deliveryLink')} /></div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LA}>Notes internes</label>
          <textarea style={{ ...IN, minHeight: 52, resize: 'vertical' }} value={form.internalNotes} onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))} />
        </div>
      </div>
      <button onClick={() => onSave(form)} disabled={saving} style={{ marginTop: 14, background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}

export default function ArchivesPage() {
  const { data: prodsData, loading, mutate } = useCached<any[]>('archives', '/api/productions?archived=true')
  const { data: freelancersData } = useCached<any[]>('freelancers', '/api/freelancers')
  const prods = Array.isArray(prodsData) ? prodsData : []
  const freelancers = Array.isArray(freelancersData) ? freelancersData : []
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const setProds = (updater: (prev: any[]) => any[]) => mutate(prev => updater(Array.isArray(prev) ? prev : []))

  async function saveProd(id: string, data: any) {
    setSaving(id)
    const res = await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const updated = await res.json()
    if (res.ok) setProds(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    setSaving(null)
  }

  async function unarchive(id: string) {
    setProds(prev => prev.filter(p => p.id !== id))
    fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) }).catch(() => {})
  }

  const q = search.trim().toLowerCase()
  const visible = q ? prods.filter(p => p.title?.toLowerCase().includes(q) || p.client?.toLowerCase().includes(q) || p.assignedTo?.name?.toLowerCase().includes(q)) : prods

  const totalValue = prods.reduce((a, p) => a + (p.price || 0), 0)
  const totalBilled = prods.reduce((a, p) => a + (p.clientPrice || 0), 0)
  const totalMargin = totalBilled - totalValue

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Archives</h1>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.75rem', marginTop: 3 }}>
            {prods.length} prestation{prods.length > 1 ? 's' : ''} · {totalValue.toLocaleString('fr-FR')} € versés aux prestataires
            {totalBilled > 0 && <> · {totalBilled.toLocaleString('fr-FR')} € facturés · <span style={{ color: totalMargin >= 0 ? '#22c55e' : '#fb7185', fontWeight: 700 }}>marge {totalMargin.toLocaleString('fr-FR')} €</span></>}
            {' '}· tout reste modifiable
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Rechercher dans les archives…" style={{ ...IN, maxWidth: 380, padding: '10px 14px' }} />
      </div>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : visible.length === 0 ? (
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem' }}>{q ? 'Aucun résultat' : 'Aucune prestation archivée'}</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, overflow: 'hidden' }}>
          {visible.map(p => (
            <div key={p.id} style={{ borderBottom: '1px solid rgba(167,139,250,0.08)' }}>
              <div
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 20px', cursor: 'pointer', background: expanded === p.id ? 'rgba(240,235,227,0.02)' : 'transparent' }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>{p.title}</p>
                  <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginTop: 2 }}>{p.client} · {p.assignedTo?.name || 'Lucas'} · {fmt(p.deadline)}</p>
                </div>
                {p.price ? <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.8rem', fontWeight: 700 }}>{p.price.toLocaleString('fr-FR')} €</p> : null}
                <span style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 600 }}>✓ Terminé</span>
                <button
                  onClick={e => { e.stopPropagation(); unarchive(p.id) }}
                  style={{ background: 'rgba(240,235,227,0.05)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 7, padding: '6px 12px', color: 'rgba(240,235,227,0.5)', cursor: 'pointer', fontSize: '0.72rem' }}
                >Désarchiver</button>
                <span style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.75rem' }}>{expanded === p.id ? '▲' : '▼'}</span>
              </div>
              {expanded === p.id && (
                <ArchiveEditor p={p} freelancers={freelancers} onSave={data => saveProd(p.id, data)} saving={saving === p.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
