'use client'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Badges from '@/components/Badges'
import AvatarUpload from '@/components/AvatarUpload'

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' as const }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }

function FieldInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}

export default function ProfilPage() {
  const { data: session } = useSession()
  const [form, setForm] = useState({ name: '', phone: '', siret: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/freelancers/me').then(r => r.json()).then(d => {
      if (d && !d.error) {
        setForm({ name: d.name || '', phone: d.phone || '', siret: d.siret || '', address: d.address || '' })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [session])

  const s = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    await fetch('/api/freelancers/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Mon profil</h1>

      {saved && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#22c55e', fontSize: '0.78rem' }}>
          Profil mis à jour ✓
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <AvatarUpload />
      </div>

      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: 24 }}>
        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 18 }}>Informations personnelles</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LA}>Nom complet</label>
            <FieldInput value={form.name} onChange={s('name')} placeholder="Prénom Nom" />
          </div>
          <div>
            <label style={LA}>Email</label>
            <input style={{ ...IN, opacity: 0.5 }} value={session?.user?.email || ''} readOnly />
            <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.65rem', marginTop: 3 }}>L&apos;email ne peut pas être modifié</p>
          </div>
          <div>
            <label style={LA}>Téléphone</label>
            <FieldInput value={form.phone} onChange={s('phone')} placeholder="06 12 34 56 78" type="tel" />
          </div>
          <div>
            <label style={LA}>Adresse</label>
            <FieldInput value={form.address} onChange={s('address')} placeholder="12 rue de la Paix, 75001 Paris" />
          </div>
          <div>
            <label style={LA}>Numéro SIRET</label>
            <FieldInput value={form.siret} onChange={s('siret')} placeholder="000 000 000 00000" />
          </div>
        </div>

        <button onClick={save} disabled={saving || loading} style={{ marginTop: 20, background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, padding: 18, marginTop: 12 }}>
        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Mot de passe</p>
        <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem' }}>La modification du mot de passe est gérée par l&apos;administrateur.</p>
      </div>

      {/* Succès & XP */}
      <Badges />
    </div>
  )
}
