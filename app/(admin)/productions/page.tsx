'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'

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
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

const sc = (s: string) => STATUSES.find(x => x.value === s)?.color || '#6b7280'
const sl = (s: string) => STATUSES.find(x => x.value === s)?.label || s
const pc = (p: string) => PRIORITIES.find(x => x.value === p)?.color || '#6b7280'
const pl = (p: string) => PRIORITIES.find(x => x.value === p)?.label || p
const fmtDate = (d: string | null) => { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }

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

// Small burst of confetti dots rendered above a row on validation
function Confetti() {
  const colors = ['#22c55e', '#a78bfa', '#eab308', '#3b82f6', '#f0ebe3']
  const dots = Array.from({ length: 18 }, (_, i) => ({
    left: 10 + Math.random() * 80,
    delay: Math.random() * 0.15,
    color: colors[i % colors.length],
    tx: (Math.random() - 0.5) * 120,
    size: 4 + Math.random() * 4,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`@keyframes confetti-pop { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-70px) translateX(var(--tx)) scale(0.4); opacity: 0; } }`}</style>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: 'absolute', bottom: 8, left: `${d.left}%`, width: d.size, height: d.size,
          background: d.color, borderRadius: '50%',
          animation: `confetti-pop 0.9s ease-out ${d.delay}s forwards`,
          ['--tx' as any]: `${d.tx}px`,
        }} />
      ))}
    </div>
  )
}

function ProdRow({ p, freelancers, onSave, onDelete, onComplete, saving, celebrating }: {
  p: any; freelancers: any[]; onSave: (d: any) => void; onDelete: () => void; onComplete: () => void; saving: boolean; celebrating: boolean
}) {
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
      <tr
        onClick={() => setOpen(!open)}
        style={{
          borderBottom: '1px solid #1a1a1a', cursor: 'pointer', position: 'relative',
          background: celebrating ? 'rgba(34,197,94,0.12)' : open ? 'rgba(240,235,227,0.02)' : 'transparent',
          transition: 'background 0.4s ease, opacity 0.5s ease',
          opacity: celebrating ? 0.9 : 1,
        }}
      >
        <td style={{ padding: '11px 14px', color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 600, position: 'relative' }}>
          {celebrating && <Confetti />}
          {p.title}<br /><span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', fontWeight: 400 }}>{p.client}</span>
        </td>
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
          <span style={{ background: `${sc(celebrating ? 'valide' : p.status)}15`, color: sc(celebrating ? 'valide' : p.status), padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>{celebrating ? 'Validé ✓' : sl(p.status)}</span>
        </td>
        <td style={{ padding: '11px 14px' }}>
          {p.sourcesLink ? <a href={p.sourcesLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#3b82f6', fontSize: '0.72rem' }}>↗ Source</a> : <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.72rem' }}>—</span>}
        </td>
        <td style={{ padding: '11px 14px' }}>
          {p.deliveryLink ? <a href={p.deliveryLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#22c55e', fontSize: '0.72rem' }}>↗ Livraison</a> : <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.72rem' }}>—</span>}
        </td>
        <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onComplete}
              title="Marquer comme livré au client"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '4px 9px', color: '#22c55e', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
            >✓</button>
            <button onClick={onDelete} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
          </div>
        </td>
      </tr>
      {open && !celebrating && (
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
              {isFreelancer && <div><label style={LA}>Prix du prestataire (€)</label><F type="number" value={form.price} onChange={s('price')} placeholder="0" /></div>}
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
  const [celebrating, setCelebrating] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // Load everything ONCE — filtering/sorting/search are instant, done in memory
  const load = useCallback(async () => {
    const [p, f] = await Promise.all([
      fetch('/api/productions', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/freelancers', { cache: 'no-store' }).then(r => r.json()),
    ])
    setProds(Array.isArray(p) ? p : [])
    setFreelancers(Array.isArray(f) ? f : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const sf = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const isFreelancerNew = form.assignedToId && freelancers.find((f: any) => f.id === form.assignedToId)

  // Instant in-memory filter + search + sort
  const visibleProds = useMemo(() => {
    let list = prods
    if (filterStatus) list = list.filter(p => p.status === filterStatus)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.client?.toLowerCase().includes(q) ||
        p.assignedTo?.name?.toLowerCase().includes(q))
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      let va: any, vb: any
      switch (sortBy) {
        case 'priority': va = PRIORITY_ORDER[a.priority] ?? 9; vb = PRIORITY_ORDER[b.priority] ?? 9; break
        case 'price': va = a.price ?? -1; vb = b.price ?? -1; break
        case 'deadline': va = a.deadline ? new Date(a.deadline).getTime() : Infinity; vb = b.deadline ? new Date(b.deadline).getTime() : Infinity; break
        case 'title': va = a.title?.toLowerCase() || ''; vb = b.title?.toLowerCase() || ''; break
        case 'client': va = a.client?.toLowerCase() || ''; vb = b.client?.toLowerCase() || ''; break
        case 'status': va = a.status; vb = b.status; break
        default: va = 0; vb = 0
      }
      if (va < vb) return -dir
      if (va > vb) return dir
      return 0
    })
  }, [prods, filterStatus, search, sortBy, sortDir])

  // Counts per status for filter pills (instant)
  const counts = useMemo(() => {
    const c: Record<string, number> = { '': prods.length }
    prods.forEach(p => { c[p.status] = (c[p.status] || 0) + 1 })
    return c
  }, [prods])

  async function createProd() {
    setCreateError('')
    if (!form.title.trim() || !form.client.trim()) { setCreateError('Titre et client sont requis'); return }
    setSaving('new')
    try {
      const res = await fetch('/api/productions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Erreur lors de la création'); setSaving(null); return }
      // Optimistic: add locally, no full reload
      setProds(prev => [data, ...prev])
      setShowNew(false)
      setForm({ ...EMPTY_FORM })
    } catch {
      setCreateError('Erreur réseau')
    }
    setSaving(null)
  }

  async function updateProd(id: string, data: any) {
    setSaving(id)
    try {
      const res = await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const updated = await res.json()
      if (res.ok) setProds(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    } catch {}
    setSaving(null)
  }

  async function deleteProd(id: string) {
    if (!confirm('Supprimer cette prestation ?')) return
    // Optimistic: remove immediately
    const prev = prods
    setProds(p => p.filter(x => x.id !== id))
    const res = await fetch(`/api/productions/${id}`, { method: 'DELETE' })
    if (!res.ok) setProds(prev) // rollback on failure
  }

  async function completeProd(id: string) {
    if (!confirm('Marquer ce projet comme livré au client ?')) return
    setCelebrating(id)
    // Fire the update while the animation plays
    fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'valide', archived: true }) }).catch(() => {})
    // Let the confetti play, then slide the row out to Archives
    setTimeout(() => {
      setProds(prev => prev.filter(p => p.id !== id))
      setCelebrating(null)
    }, 1300)
  }

  const thStyle: React.CSSProperties = { padding: '10px 14px', color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', textAlign: 'left' }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Post-productions</h1>
        <button onClick={() => { setShowNew(true); setCreateError('') }} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>+ Nouvelle prestation</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Rechercher par titre, client ou prestataire…"
          style={{ ...IN, maxWidth: 420, padding: '10px 14px' }}
        />
      </div>

      {/* Filter pills — instant, with live counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filterStatus === s.value ? (s.color || '#f0ebe3') : '#2a2a2a'}`, background: filterStatus === s.value ? `${s.color || '#f0ebe3'}15` : 'transparent', color: filterStatus === s.value ? (s.color || '#f0ebe3') : 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>
            {s.label} ({counts[s.value] || 0})
          </button>
        ))}
      </div>

      {/* New form */}
      {showNew && (
        <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <p style={{ color: '#f0ebe3', fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Nouvelle prestation</p>
          {createError && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: 12, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 6 }}>{createError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div><label style={LA}>Titre *</label><F value={form.title} onChange={sf('title')} placeholder="Titre de la prestation" /></div>
            <div><label style={LA}>Client *</label><F value={form.client} onChange={sf('client')} placeholder="Nom du client" /></div>
            <div><label style={LA}>Date de la prestation</label><F type="date" value={form.productionDate} onChange={sf('productionDate')} /></div>
            <div><label style={LA}>Deadline</label><F type="date" value={form.deadline} onChange={sf('deadline')} /></div>
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
            {isFreelancerNew && <div><label style={LA}>Prix du prestataire (€)</label><F type="number" value={form.price} onChange={sf('price')} placeholder="0" /></div>}
            <div><label style={LA}>Lien sources</label><F value={form.sourcesLink} onChange={sf('sourcesLink')} placeholder="WeTransfer, Drive…" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={LA}>Notes internes (admin uniquement)</label><TA value={form.internalNotes} onChange={sf('internalNotes')} placeholder="Notes visibles uniquement par les admins" /></div>
            {isFreelancerNew && <div style={{ gridColumn: '1/-1' }}><label style={LA}>Brief pour le prestataire</label><TA value={form.brief} onChange={sf('brief')} placeholder="Instructions pour le prestataire…" /></div>}
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
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem' }}>Chargement…</p>
        </div>
      ) : visibleProds.length === 0 ? (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem' }}>{search ? `Aucun résultat pour « ${search} »` : 'Aucune prestation'}</p>
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
                <ProdRow
                  key={p.id}
                  p={p}
                  freelancers={freelancers}
                  onSave={data => updateProd(p.id, data)}
                  onDelete={() => deleteProd(p.id)}
                  onComplete={() => completeProd(p.id)}
                  saving={saving === p.id}
                  celebrating={celebrating === p.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
