'use client'
import { useEffect, useState } from 'react'

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%' }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Prénom Nom" />
}
function EmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="email" style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="email@exemple.com" />
}
function PassInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="password" style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Mot de passe" />
}
function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="06 12 34 56 78" />
}
function SpecialtyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Montage, motion design…" />
}

const RATE_TYPES = [
  { key: 'filming', label: 'Tournage' },
  { key: 'editing', label: 'Montage' },
  { key: 'filming_editing', label: 'Tournage + Montage' },
  { key: 'retouche', label: 'Retouche photo' },
  { key: 'hourly', label: 'Taux horaire (€/h)' },
]

// Full profile editor — opened via the pencil button on a freelancer card
function EditProfileForm({ freelancer, onSaved, onCancel }: { freelancer: any; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: freelancer.name || '', email: freelancer.email || '', phone: freelancer.phone || '',
    siret: freelancer.siret || '', specialty: freelancer.specialty || '', address: freelancer.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const s = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setError('')
    if (!form.name.trim() || !form.email.trim()) { setError('Nom et email requis'); return }
    setSaving(true)
    const res = await fetch(`/api/freelancers/${freelancer.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur lors de la mise à jour')
      return
    }
    onSaved()
  }

  return (
    <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 12, marginTop: 12 }}>
      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Modifier le profil</p>
      {error && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div><label style={LA}>Nom</label><NameInput value={form.name} onChange={s('name')} /></div>
        <div><label style={LA}>Email (identifiant de connexion)</label><EmailInput value={form.email} onChange={s('email')} /></div>
        <div><label style={LA}>Téléphone</label><PhoneInput value={form.phone} onChange={s('phone')} /></div>
        <div><label style={LA}>Spécialité</label><SpecialtyInput value={form.specialty} onChange={s('specialty')} /></div>
        <div><label style={LA}>SIRET / TVA</label><input style={IN} value={form.siret} onChange={e => s('siret')(e.target.value)} placeholder="000 000 000 00000" /></div>
        <div><label style={LA}>Adresse</label><input style={IN} value={form.address} onChange={e => s('address')(e.target.value)} placeholder="12 rue de la Paix, 31000 Toulouse" /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={save} disabled={saving} style={{ flex: 1, background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 7, padding: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 14px', color: 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.75rem' }}>Annuler</button>
      </div>
    </div>
  )
}

// Negotiated pricing editor — one per freelancer card
function RatesEditor({ freelancer, onSaved }: { freelancer: any; onSaved: () => void }) {
  const initial: Record<string, string> = {}
  try {
    const parsed = freelancer.rates ? JSON.parse(freelancer.rates) : {}
    RATE_TYPES.forEach(rt => { initial[rt.key] = parsed[rt.key]?.toString() || '' })
  } catch { RATE_TYPES.forEach(rt => { initial[rt.key] = '' }) }

  const [rates, setRates] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    const clean: Record<string, number> = {}
    RATE_TYPES.forEach(rt => { const v = parseFloat(rates[rt.key]); if (!isNaN(v) && v > 0) clean[rt.key] = v })
    await fetch(`/api/freelancers/${freelancer.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rates: clean }) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onSaved()
  }

  return (
    <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 12, marginTop: 12 }}>
      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Tarifs négociés {saved && <span style={{ color: '#22c55e' }}>✓ enregistrés</span>}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {RATE_TYPES.map(rt => (
          <div key={rt.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.68rem', flex: 1 }}>{rt.label}</span>
            <input
              type="number"
              value={rates[rt.key]}
              onChange={e => setRates(r => ({ ...r, [rt.key]: e.target.value }))}
              placeholder="—"
              style={{ ...IN, width: 64, padding: '5px 8px', fontSize: '0.72rem', textAlign: 'right' }}
            />
            <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem' }}>€</span>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} style={{ marginTop: 10, width: '100%', background: 'rgba(240,235,227,0.05)', border: '1px solid #2a2a2a', borderRadius: 7, padding: '7px', color: 'rgba(240,235,227,0.6)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les tarifs'}
      </button>
    </div>
  )
}

export default function PrestatairesPage() {
  const [freelancers, setFreelancers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', email: '', password: '', phone: '', siret: '', specialty: '' })

  async function load() {
    setLoading(true)
    const data = await fetch('/api/freelancers').then(r => r.json())
    setFreelancers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!newForm.name || !newForm.email || !newForm.password) return
    setSaving(true)
    const res = await fetch('/api/freelancers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newForm) })
    setSaving(false)
    if (res.ok) { setShowNew(false); setNewForm({ name: '', email: '', password: '', phone: '', siret: '', specialty: '' }); load() }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/freelancers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
    load()
  }

  async function grantBonus(id: string) {
    const xp = prompt('Combien de XP bonus offrir à ce prestataire ? (max 1000)')
    if (!xp || isNaN(parseInt(xp))) return
    const reason = prompt('Raison du bonus (visible par le prestataire) :') || ''
    const res = await fetch('/api/gamify/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, xp: parseInt(xp), reason }) })
    alert(res.ok ? `✓ +${xp} XP offerts !` : 'Erreur')
  }

  async function changePassword(id: string) {
    const pwd = prompt('Nouveau mot de passe pour ce prestataire (min 6 caractères) :')
    if (!pwd) return
    if (pwd.length < 6) { alert('Mot de passe trop court (min 6 caractères)'); return }
    const res = await fetch(`/api/freelancers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) })
    if (res.ok) alert('Mot de passe mis à jour ✓')
    else alert('Erreur lors de la mise à jour')
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce prestataire ?')) return
    await fetch(`/api/freelancers/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Prestataires</h1>
        <button onClick={() => setShowNew(true)} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>+ Créer un compte</button>
      </div>

      {showNew && (
        <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <p style={{ color: '#f0ebe3', fontWeight: 700, marginBottom: 16 }}>Nouveau prestataire</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LA}>Nom *</label><NameInput value={newForm.name} onChange={v => setNewForm(f => ({ ...f, name: v }))} /></div>
            <div><label style={LA}>Email *</label><EmailInput value={newForm.email} onChange={v => setNewForm(f => ({ ...f, email: v }))} /></div>
            <div><label style={LA}>Mot de passe *</label><PassInput value={newForm.password} onChange={v => setNewForm(f => ({ ...f, password: v }))} /></div>
            <div><label style={LA}>Téléphone</label><PhoneInput value={newForm.phone} onChange={v => setNewForm(f => ({ ...f, phone: v }))} /></div>
            <div><label style={LA}>Spécialité</label><SpecialtyInput value={newForm.specialty} onChange={v => setNewForm(f => ({ ...f, specialty: v }))} /></div>
            <div><label style={LA}>SIRET</label><input style={IN} value={newForm.siret} onChange={e => setNewForm(f => ({ ...f, siret: e.target.value }))} placeholder="000 000 000 00000" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={create} disabled={saving} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
              {saving ? 'Création…' : 'Créer'}
            </button>
            <button onClick={() => setShowNew(false)} style={{ background: 'transparent', color: 'rgba(240,235,227,0.4)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: '0.82rem' }}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : freelancers.length === 0 ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Aucun prestataire. Créez le premier compte ci-dessus.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {freelancers.map(f => (
            <div key={f.id} style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ color: '#f0ebe3', fontWeight: 700, fontSize: '0.9rem' }}>{f.name}</p>
                  {f.specialty && <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.72rem', marginTop: 2 }}>{f.specialty}</p>}
                </div>
                <span style={{ background: f.active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: f.active ? '#22c55e' : '#ef4444', padding: '3px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>
                  {f.active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
                <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.75rem' }}>✉ {f.email}</p>
                {f.phone && <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.75rem' }}>📱 {f.phone}</p>}
                {f.siret && <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem' }}>SIRET : {f.siret}</p>}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleActive(f.id, f.active)} style={{ flex: 1, background: 'rgba(240,235,227,0.05)', border: '1px solid #2a2a2a', borderRadius: 7, padding: '7px', color: 'rgba(240,235,227,0.5)', cursor: 'pointer', fontSize: '0.72rem' }}>
                  {f.active ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => setEditingId(editingId === f.id ? null : f.id)} style={{ background: editingId === f.id ? 'rgba(167,139,250,0.12)' : 'rgba(240,235,227,0.05)', border: `1px solid ${editingId === f.id ? 'rgba(167,139,250,0.3)' : '#2a2a2a'}`, borderRadius: 7, padding: '7px 12px', color: editingId === f.id ? '#a78bfa' : 'rgba(240,235,227,0.5)', cursor: 'pointer', fontSize: '0.72rem' }} title="Modifier le profil">✏️</button>
                <button onClick={() => changePassword(f.id)} style={{ background: 'rgba(240,235,227,0.05)', border: '1px solid #2a2a2a', borderRadius: 7, padding: '7px 12px', color: 'rgba(240,235,227,0.5)', cursor: 'pointer', fontSize: '0.72rem' }} title="Changer le mot de passe">🔑</button>
                <button onClick={() => grantBonus(f.id)} style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 7, padding: '7px 12px', color: '#a78bfa', cursor: 'pointer', fontSize: '0.72rem' }} title="Offrir un bonus XP">🎁</button>
                <button onClick={() => remove(f.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '7px 12px', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem' }}>✕</button>
              </div>

              {editingId === f.id && (
                <EditProfileForm freelancer={f} onSaved={() => { setEditingId(null); load() }} onCancel={() => setEditingId(null)} />
              )}

              <RatesEditor freelancer={f} onSaved={load} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
