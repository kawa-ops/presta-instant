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

const sc = (s: string) => STATUSES.find(x => x.value === s)?.color || '#6b7280'
const sl = (s: string) => STATUSES.find(x => x.value === s)?.label || s
const pc = (p: string) => PRIORITIES.find(x => x.value === p)?.color || '#6b7280'
const pl = (p: string) => PRIORITIES.find(x => x.value === p)?.label || p
const fmtDate = (d: string | null) => { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }

// All inputs defined OUTSIDE to prevent focus loss
function F({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}
function TA({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea style={{ ...IN, minHeight: 64, resize: 'vertical' as const }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}
function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (sortBy !== col) return <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.6rem', marginLeft: 3 }}>⇅</span>
  return <span style={{ color: '#f0ebe3', fontSize: '0.6rem', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function ProdRow({ p, freelancers, onSave, onDelete, saving }: { p: any; freelancers: any[]; onSave: (d: any) => void; onDelete: () => void; saving: boolean }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: p.title, client: p.client, brief: p.brief || '', sourcesLink: p.sourcesLink || '',
    deliveryLink: p.deliveryLink || '', priority: p.priority, status: p.status,
    price: p.price?.toString() || '', deadline: p.deadline ? p.deadline.split('T')[0] : '',
    productionDate: p.productionDate ? p.productionDate.split('T')[0] : '',
    internalNotes: p.internalNotes || '', assignedToId: p.assignedToId || '',
  })
  const s = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const isFreelancer = form.assignedToId && freelancers.find((f: any) => f.id === form.assignedToId)
  const isOverdue = p.deadline && new Date(p.deadline) < new Date() && !['valide'].includes(p.status)

  return (
    <>
      <tr style={{ borderBottom: '1px solid #1a1a1a', background: open ? 'rgba(240,235,227,0.02)' : 'transparent', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <td style={{ padding: '11px 14px', color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 600 }}>{p.title}<br /><span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', fontWeight: 400 }}>{p.client}</span></td>
        <td style={{ padding: '11px 14px', color: 'rgba(240,235,227,0.5)', fontSize: '0.75rem' }}>{fmtDate(p.productionDate)}</td>
        <td style={{ padding: '11px 14px' }}>
          <span style={{ color: isOverdue ? '#ef4444' : 'rgba(240,235,227,0.5)', fontSize: '0.75rem', fontWeight: isOverdue ? 700 : 400 }}>{fmtDate(p.deadline)}</span>
        </td>
        <td style={{ padding: '11px 14px' }}>
          <span style={{ background: `${pc(p.priority)}15`, color: pc(p.priority), padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700 }}>{pl(p.priority)}</span>
        </td>
        <td style={{ padding: '11px 14px', color: 'rgba(240,235,227,0.5)', fontSize: '0.75rem' }}>{p.assignedTo?.name || 'Lucas'}</td>
        <td style={{ padding: '11px 14px', color: p.price ? '#f0ebe3' : 'rgba(240,235,227,0.2)', fontSize: '0.75rem' }}>{p.price ? `${p.price.toLocaleString('fr-FR')} €` : '—'}</td>
        <td style={{ padding: '11px 14px' }}>
          <span style={{ background: `${sc(p.status)}15`, color: sc(p.status), padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>{sl(p.status)}</span>
        </td>
        <td style={{ padding: '11px 14px' }}>
          {p.sourcesLink ? <a href={p.sourcesLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#3b82f6', fontSize: '0.72rem' }}>↗ Source</a> : <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.72rem' }}>—</span>}
        </td>
        <td style={{ padding: '11px 14px' }}>
          {p.deliveryLink ? <a href={p.deliveryLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#22c55e', fontSize: '0.72rem' }}>↗ Livraison</a> : <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.72rem' }}>—</span>}
        </td>
        <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
          <button onClick={onDelete} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
        </td>
      </tr>
      {open && (
        <tr style={{ background: '#0f0f0f' }}>
          <td colSpan={10} style={{ padding: '18px 20px', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div><label style={LA}>Titre</label><F value={form.title} onChange={s('title')} /></div>
              <div><label style={LA}>Client</label><F value={form.client} onChange={s('client')} /></div>
              <div><label style={LA}>Date de la prestation</label><F type="date" value={form.productionDate} onChange={s('productionDate')} /></div>
              <div><label style={LA}>Deadline</label><F type="date" value={form.deadline} onChange={s('deadline')} /></div>
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
                <label style={LA}>Assigné à</label>
                <select style={IN} value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                  <option value="">Lucas (par défaut)</option>
                  {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              {isFreelancer && <div><label style={LA}>Prix de la prestation (€)</label><F type="number" value={form.price} onChange={s('price')} placeholder="0" /></div>}
              <div><label style={LA}>Lien sources</label><F value={form.sourcesLink} onChange={s('sourcesLink')} placeholder="WeTransfer, Drive…" /></div>
              <div><label style={LA}>Lien livraison</label><F value={form.deliveryLink} onChange={s('deliveryLink')} placeholder="Drive, Dropbox…" /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={LA}>Notes internes (admin uniquement)</label><TA value={form.internalNotes} onChange={s('internalNotes')} placeholder="Notes visibles uniquement par les admins" /></div>
              {isFreelancer && <div style={{ gridColumn: '1/-1' }}><label style={LA}>Brief pour le prestataire</label><TA value={form.brief} onChange={s('brief')} placeholder="Instructions pour le prestataire…" /></div>}
            </div>
            <button onClick={() => onSave(form)} disabled={saving} style={{ marginTop: 14, background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </td>
        </tr>
      )}
    </>
  )
}

const EMPTY_FORM = { title: '', client: '', brief: '', sourcesLink: '', priority: 'normal', status: 'a_faire', price: '', deadline: '', productionDate: '', internalNotes: '', assignedToId: '' }

export default function ProductionsPage() {
  const [prods, setProds] = useState<any[]>([])
  const [freelancers, setFreelancers] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('deadline')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (filterStatus) qs.set('status', filterStatus)
    qs.set('sortBy', sortBy)
    qs.set('sortDir', sortDir)
    const [p, f] = await Promise.all([
      fetch(`/api/productions?${qs}`).then(r => r.json()),
      fetch('/api/freelancers').then(r => r.json()),
    ])
    setProds(Array.isArray(p) ? p : [])
    setFreelancers(Array.isArray(f) ? f : [])
    setLoading(false)
  }, [filterStatus, sortBy, sortDir])

  useEffect(() => { load() }, [load])

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const s = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const isFreelancer = form.assignedToId && freelancers.find((f: any) => f.id === form.assignedToId)

  async function createProd() {
    setCreateError('')
    if (!form.title.trim() || !form.client.trim()) { setCreateError('Titre et client sont requis'); return }
    setSaving('new')
    try {
      const res = await fetch('/api/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Erreur lors de la création'); setSaving(null); return }
      setShowNew(false)
      setForm({ ...EMPTY_FORM })
      setSaving(null)
      await load()
    } catch (e) {
      setCreateError('Erreur réseau')
      setSaving(null)
    }
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

  const thStyle: React.CSSProperties = { padding: '10px 14px', color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', textAlign: 'left' }

  const q = search.trim().toLowerCase()
  const visibleProds = q
    ? prods.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.client?.toLowerCase().includes(q) ||
        p.assignedTo?.name?.toLowerCase().includes(q))
    : prods

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Post-productions</h1>
        <button onClick={() => { setShowNew(true); setCreateError('') }} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>+ Nouvelle prestation</button>
      </div>

      {/* Search + Filters */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Rechercher par titre, client ou prestataire…"
          style={{ ...IN, maxWidth: 420, padding: '10px 14px' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filterStatus === s.value ? (s.color || '#f0ebe3') : '#2a2a2a'}`, background: filterStatus === s.value ? `${s.color || '#f0ebe3'}15` : 'transparent', color: filterStatus === s.value ? (s.color || '#f0ebe3') : 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>
            {s.label} {filterStatus === s.value && prods.length > 0 ? `(${prods.length})` : ''}
          </button>
        ))}
      </div>

      {/* New form */}
      {showNew && (
        <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <p style={{ color: '#f0ebe3', fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Nouvelle prestation</p>
          {createError && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: 12, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 6 }}>{createError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div><label style={LA}>Titre *</label><F value={form.title} onChange={s('title')} placeholder="Titre de la prestation" /></div>
            <div><label style={LA}>Client *</label><F value={form.client} onChange={s('client')} placeholder="Nom du client" /></div>
            <div><label style={LA}>Date de la prestation</label><F type="date" value={form.productionDate} onChange={s('productionDate')} /></div>
            <div><label style={LA}>Deadline</label><F type="date" value={form.deadline} onChange={s('deadline')} /></div>
            <div>
              <label style={LA}>Priorité</label>
              <select style={IN} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LA}>Statut</label>
              <select style={IN} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LA}>Assigné à</label>
              <select style={IN} value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Lucas (par défaut)</option>
                {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {isFreelancer && <div><label style={LA}>Prix de la prestation (€)</label><F type="number" value={form.price} onChange={s('price')} placeholder="0" /></div>}
            <div><label style={LA}>Lien sources</label><F value={form.sourcesLink} onChange={s('sourcesLink')} placeholder="WeTransfer, Drive…" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={LA}>Notes internes (admin uniquement)</label><TA value={form.internalNotes} onChange={s('internalNotes')} placeholder="Notes visibles uniquement par les admins" /></div>
            {isFreelancer && <div style={{ gridColumn: '1/-1' }}><label style={LA}>Brief pour le prestataire</label><TA value={form.brief} onChange={s('brief')} placeholder="Instructions pour le prestataire…" /></div>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={createProd} disabled={saving === 'new'} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', opacity: saving === 'new' ? 0.6 : 1 }}>
              {saving === 'new' ? 'Création…' : 'Créer la prestation'}
            </button>
            <button onClick={() => { setShowNew(false); setForm({ ...EMPTY_FORM }); setCreateError('') }} style={{ background: 'transparent', color: 'rgba(240,235,227,0.4)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: '0.82rem' }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 48, fontSize: '0.82rem' }}>Chargement…</p>
      ) : visibleProds.length === 0 ? (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem' }}>{q ? `Aucun résultat pour « ${search} »` : 'Aucune prestation'}</p>
        </div>
      ) : (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                <th style={thStyle} onClick={() => toggleSort('title')}>Titre / Client <SortIcon col="title" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle}>Date prestation</th>
                <th style={thStyle} onClick={() => toggleSort('deadline')}>Deadline <SortIcon col="deadline" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('priority')}>Priorité <SortIcon col="priority" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle}>Assigné à</th>
                <th style={thStyle} onClick={() => toggleSort('price')}>Prix <SortIcon col="price" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('status')}>Statut <SortIcon col="status" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Livraison</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {visibleProds.map(p => (
                <ProdRow key={p.id} p={p} freelancers={freelancers} onSave={data => updateProd(p.id, data)} onDelete={() => deleteProd(p.id)} saving={saving === p.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
