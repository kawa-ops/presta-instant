'use client'
import { useEffect, useRef, useState } from 'react'
import Avatar from '@/components/Avatar'

// Profile picture upload with a proper crop step:
// circular preview, drag to reposition, zoom slider — exported at 512px.

function CropModal({ src, onCancel, onConfirm }: { src: string; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const SIZE = 280 // preview circle diameter

  useEffect(() => {
    const i = new Image()
    i.onload = () => setImg(i)
    i.src = src
  }, [src])

  // Base scale: cover the circle at zoom 1
  const base = img ? Math.max(SIZE / img.width, SIZE / img.height) : 1
  const w = img ? img.width * base * zoom : 0
  const h = img ? img.height * base * zoom : 0
  // Clamp so the image always covers the circle
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min(Math.max(p.x, SIZE - w), 0),
    y: Math.min(Math.max(p.y, SIZE - h), 0),
  })

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    setPos(clamp({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }))
  }
  function onPointerUp() { drag.current = null }

  function confirm() {
    if (!img) return
    const OUT = 512
    const canvas = document.createElement('canvas')
    canvas.width = OUT; canvas.height = OUT
    const ctx = canvas.getContext('2d')!
    const scale = OUT / SIZE
    ctx.drawImage(img, pos.x * scale, pos.y * scale, w * scale, h * scale)
    canvas.toBlob(b => { if (b) onConfirm(b) }, 'image/jpeg', 0.9)
  }

  // Re-clamp when zoom changes
  useEffect(() => { setPos(p => clamp(p)) }, [zoom, img]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,6,24,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'rgba(26,18,48,0.95)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 18, padding: 26, maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <p style={{ color: '#f0ebe3', fontSize: '0.95rem', fontWeight: 800, marginBottom: 4 }}>Recadrer la photo</p>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.72rem', marginBottom: 16 }}>Déplace l&apos;image et ajuste le zoom — aperçu tel qu&apos;il apparaîtra dans l&apos;ornement.</p>

        {/* Circular crop area */}
        <div
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          style={{ width: SIZE, height: SIZE, borderRadius: '50%', overflow: 'hidden', margin: '0 auto', position: 'relative', cursor: 'grab', touchAction: 'none', border: '3px solid rgba(167,139,250,0.5)', boxShadow: '0 0 30px rgba(167,139,250,0.25)', background: '#0c081a' }}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false} style={{ position: 'absolute', left: pos.x, top: pos.y, width: w, height: h, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }} />
          )}
        </div>

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <span style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.8rem' }}>−</span>
          <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#a78bfa' }} />
          <span style={{ color: 'rgba(240,235,227,0.4)', fontSize: '1rem' }}>+</span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
          <button onClick={confirm} style={{ background: 'linear-gradient(135deg, #a78bfa, #ec4899)', color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '11px 28px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem' }}>✓ Valider</button>
          <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10, padding: '11px 20px', color: 'rgba(240,235,227,0.5)', cursor: 'pointer', fontSize: '0.85rem' }}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default function AvatarUpload() {
  const [url, setUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [level, setLevel] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/freelancers/me').then(r => r.json()).then(d => {
      if (d && !d.error) { setUrl(d.profilePicUrl || null); setName(d.name || '') }
    }).catch(() => {})
    fetch('/api/gamify/me').then(r => r.json()).then(d => { if (d && !d.error) setLevel(d.level || 0) }).catch(() => {})
  }, [])

  function pickFile(file: File) {
    setError('')
    setCropSrc(URL.createObjectURL(file))
  }

  async function uploadCropped(blob: Blob) {
    setCropSrc(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
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
      {cropSrc && <CropModal src={cropSrc} onCancel={() => setCropSrc(null)} onConfirm={uploadCropped} />}

      {/* Live preview inside the actual ornament */}
      <Avatar url={url} name={name} level={level} size={96} />

      <div>
        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Photo de profil</p>
        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginBottom: 10 }}>Recadrage avec zoom avant sauvegarde — l&apos;ornement évolue avec ton niveau.</p>
        {error && <p style={{ color: '#fb7185', fontSize: '0.72rem', marginBottom: 8 }}>{error}</p>}
        <label style={{ display: 'inline-block', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 8, padding: '7px 16px', color: '#c4b5fd', cursor: uploading ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 700, opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Envoi…' : url ? '📷 Changer la photo' : '📷 Ajouter une photo'}
          <input type="file" accept="image/png,image/jpeg" disabled={uploading} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}
