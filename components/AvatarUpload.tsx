'use client'
import { useEffect, useState } from 'react'

// Profile picture upload — used in Paramètres (admin) and Mon profil (freelance).
// Uploads to Vercel Blob then stores the URL on the user.
export default function AvatarUpload() {
  const [url, setUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/freelancers/me').then(r => r.json()).then(d => {
      if (d && !d.error) { setUrl(d.profilePicUrl || null); setName(d.name || '') }
    }).catch(() => {})
  }, [])

  async function upload(file: File) {
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Erreur upload'); setUploading(false); return }
      await fetch('/api/freelancers/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profilePicUrl: d.url }) })
      setUrl(d.url)
      window.dispatchEvent(new CustomEvent('live-refresh'))
    } catch {
      setError('Erreur réseau')
    }
    setUploading(false)
  }

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(#a78bfa, #ec4899, #38bdf8, #a78bfa)' }} />
        <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#141021', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{name.charAt(0).toUpperCase() || '✦'}</span>
          )}
        </div>
      </div>
      <div>
        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Photo de profil</p>
        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginBottom: 10 }}>Affichée sur le dashboard et le classement. L&apos;ornement autour évolue avec ton prestige.</p>
        {error && <p style={{ color: '#fb7185', fontSize: '0.72rem', marginBottom: 8 }}>{error}</p>}
        <label style={{ display: 'inline-block', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 8, padding: '7px 16px', color: '#c4b5fd', cursor: uploading ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 700, opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Envoi…' : url ? '📷 Changer la photo' : '📷 Ajouter une photo'}
          <input type="file" accept="image/png,image/jpeg" disabled={uploading} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}
