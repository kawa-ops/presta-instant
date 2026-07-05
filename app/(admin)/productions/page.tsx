'use client'
import { useEffect, useState, useCallback } from 'react'

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'a_faire', label: 'À faire', color: '#6b7280' },
  { value: 'en_cours', label: 'En cours', color: '#3b82f6' },
  { value: 'en_attente', label: 'En attente', color: '#eab308' },
  { value: 'livre', label: 'Livré', color: '#a78bfa' },
  { value: 'valide', label: 'Validé', color: '#22c55e' },
]

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
  { value: 'high', label: 'Haute', color: '#f97316' },
  { value: 'normal', label: 'Normale', color: '#6b7280' },
  { value: 'low', label: 'Basse', color: '#374151' },
]

function statusColor(s: string) { return STATUSES.find(x => x.value === s)?.color || '#6b7280' }
function statusLabel(s: string) { return STATUSES.find(x => x.value === s)?.label || s }
function priorityColor(p: string) { return PRIORITIES.find(x => x.value === p)?.color || '#6b7280' }
function priorityLabel(p: string) { return PRIORITIES.find(x => x.value === p)?.label || p }

function fmt(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%' }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }

function TitleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Titre" />
}
function ClientInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Client" />
}
function BriefInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea style={{ ...IN, minHeight: 60, resize: 'vertical' }} value={value} onChange={e => onChange(e.target.value)} placeholder="Brief / instructions" />
}
function SourcesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Lien sources (WeTransfer, Drive…)" />
}
function NotesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea style={{ ...IN, minHeight: 50, resize: 'vertical' }} value={value} onChange={e => onChange(e.target.value)} placeholder="Notes internes" />
}

function ProdDetail({ prod, freelancers, onSave, saving }: { prod: any; freelancers: any[]; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    title: prod.title, client: prod.client, brief: prod.brief || '', sourcesLink: prod.sourcesLink || '',
    deliveryLink: prod.deliveryLink || '', priority: prod.priority, status: prod.status,
    price: prod.price?.toString() || '', deadline: prod.deadline ? prod.deadline.split('T')[0] : '',
    internalNotes: prod.internalNotes || '', assignedToId: prod.assignedToId || '',
  })

  const s = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ padding: '16px 20px 20px', borderBottom: '1px solid #1a1a1a', background: '#111' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label style={LA}>Titre</label><TitleInput value={form.title} onChange={s('title')} /></div>
        <div><label style={LA}>Client</label><ClientInput value={form.client} onChange={s('client')} /></div>
        <div style={{ gridColumn: '1/-1' }}><label style={LA}>Brief</label><BriefInput value={form.brief} onChange={s('brief')} /></div>
        <div><label style={LA}>Lien sources</label><SourcesInput value={form.sourcesLink} onChange={s('sourcesLink')} /></div>
        <div><label style={LA}>Lien livraison</label><input style={IN} value={form.deliveryLink} onChange={e => setForm(f => ({ ...f, deliveryLink: e.target.value }))} placeholder="Drive, Dropbox…" /></div>
        <div>
          <label style={LA}>Statut</label>
          <select style={IN} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {STATUSES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={LA}>Priorité</label>
          <select style={IN} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={LA}>Prestataire</label>
          <select style={IN} value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
            <option value="">Non assigné</option>
            {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div><label style={LA}>Deadline</label><input type="date" style={IN} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
        <div><label style={LA}>Budget (€)</label><input type="number" style={IN} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
        <div style={{ gridColumn: '1/-1' }}><label style={LA}>Notes internes</label><NotesInput value={form.internalNotes} onChange={s('internalNotes')} /></div>
      </div>
      <button onClick={() => onSave(form)} disabled={saving} style={{ marginTop: 14, background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}

export default function ProductionsPage() {
  const [prods, setProds] = useState<any[]>([])
  const [freelancers, setFreelancers] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [newForm, setNewForm] = useState({ title: '', client: '', brief: '', sourcesLink: '', priority: 'normal', status: 'a_faire', price: '', deadline: '', internalNotes: '', assignedToId: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const qs = filterStatus ? `?status=${filterStatus}` : ''
    const [p, f] = await Promise.all([
      fetch(`/api/productions${qs}`).then(r => r.json()),
      fetch('/api/freelancers').then(r => r.json()),
    ])
    setProds(Array.isArray(p) ? p : [])
    setFreelancers(Array.isArray(f) ? f : [])
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  async function createProd() {
    if (!newForm.title || !newForm.client) return
    setSaving('new')
    await fetch('/api/productions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newForm) })
    setShowNew(false)
    setNewForm({ title: '', client: '', brief: '', sourcesLink: '', priority: 'normal', status: 'a_faire', price: '', deadline: '', internalNotes: '', assignedToId: '' })
    setSaving(null)
    load()
  }

  async function updateProd(id: string, data: any) {
    setSaving(id)
    await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setSaving(null)
    load()
  }

  async function deleteProd(id: string) {
    if (!confirm('Supprimer cette prestation ?')) return
    await fetch(`/api/productions/${id}`, { method: 'DELETE' })
    load()
  }

  const isOverdue = (p: any) => p.deadline && new Date(p.deadline) < new Date() && !['valide', 'archive'].includes(p.status)

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Post-productions</h1>
        <button onClick={() => setShowNew(true)} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>+ Nouvelle</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filterStatus === s.value ? (s.color || '#f0ebe3') : '#2a2a2a'}`, background: filterStatus === s.value ? `${s.color || '#f0ebe3'}15` : 'transparent', color: filterStatus === s.value ? (s.color || '#f0ebe3') : 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.75rem' }}>
            {s.label}
          </button>
        ))}
      </div>

      {showNew && (
        <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <p style={{ color: '#f0ebe3', fontWeight: 700, marginBottom: 16 }}>Nouvelle prestation</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={LA}>Titre *</label><TitleInput value={newForm.title} onChange={v => setNewForm(f => ({ ...f, title: v }))} /></div>
            <div><label style={LA}>Client *</label><ClientInput value={newForm.client} onChange={v => setNewForm(f => ({ ...f, client: v }))} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={LA}>Brief</label><BriefInput value={newForm.brief} onChange={v => setNewForm(f => ({ ...f, brief: v }))} /></div>
            <div><label style={LA}>Lien sources</label><SourcesInput value={newForm.sourcesLink} onChange={v => setNewForm(f => ({ ...f, sourcesLink: v }))} /></div>
            <div><label style={LA}>Deadline</label><input type="date" style={IN} value={newForm.deadline} onChange={e => setNewForm(f => ({ ...f, deadline: e.target.value }))} /></div>
            <div>
              <label style={LA}>Priorité</label>
              <select style={IN} value={newForm.priority} onChange={e => setNewForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LA}>Prestataire</label>
              <select style={IN} value={newForm.assignedToId} onChange={e => setNewForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Non assigné</option>
                {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div><label style={LA}>Budget (€)</label><input type="number" style={IN} value={newForm.price} onChange={e => setNewForm(f => ({ ...f, price: e.target.value }))} placeholder="0" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={LA}>Notes internes</label><NotesInput value={newForm.internalNotes} onChange={v => setNewForm(f => ({ ...f, internalNotes: v }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={createProd} disabled={saving === 'new'} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
              {saving === 'new' ? 'Création…' : 'Créer'}
            </button>
            <button onClick={() => setShowNew(false)} style={{ background: 'transparent', color: 'rgba(240,235,227,0.4)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: '0.82rem' }}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem', textAlign: 'center', padding: 40 }}>Chargement…</p>
      ) : prods.length === 0 ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem', textAlign: 'center', padding: 40 }}>Aucune prestation</p>
      ) : (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 100px 120px 120px 80px', gap: 0, padding: '10px 20px', borderBottom: '1px solid #1e1e1e' }}>
            {['Prestation', 'Prestataire', 'Priorité', 'Statut', 'Deadline', ''].map(h => (
              <p key={h} style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
            ))}
          </div>

          {prods.map(p => (
            <div key={p.id}>
              <div
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 100px 120px 120px 80px', gap: 0, padding: '13px 20px', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: expanded === p.id ? 'rgba(240,235,227,0.03)' : 'transparent' }}
              >
                <div>
                  <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>{p.title}</p>
                  <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', marginTop: 2 }}>{p.client}</p>
                </div>
                <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem', alignSelf: 'center' }}>{p.assignedTo?.name || '—'}</p>
                <div style={{ alignSelf: 'center' }}>
                  <span style={{ background: `${priorityColor(p.priority)}15`, color: priorityColor(p.priority), padding: '3px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600 }}>{priorityLabel(p.priority)}</span>
                </div>
                <div style={{ alignSelf: 'center' }}>
                  <span style={{ background: `${statusColor(p.status)}15`, color: statusColor(p.status), padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>{statusLabel(p.status)}</span>
                </div>
                <p style={{ color: isOverdue(p) ? '#ef4444' : 'rgba(240,235,227,0.4)', fontSize: '0.78rem', alignSelf: 'center', fontWeight: isOverdue(p) ? 600 : 400 }}>{fmt(p.deadline)}</p>
                <div style={{ alignSelf: 'center', display: 'flex', gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); deleteProd(p.id) }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                </div>
              </div>

              {expanded === p.id && (
                <ProdDetail prod={p} freelancers={freelancers} onSave={data => updateProd(p.id, data)} saving={saving === p.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
