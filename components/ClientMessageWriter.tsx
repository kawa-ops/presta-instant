'use client'
import { useState } from 'react'

// "✍️ Rédiger le message client" — 3 variants (delivery / feedback ack /
// delay), drafted by Claude in the studio's tone, shown in a copyable modal.

const VARIANTS = [
  { kind: 'delivery', label: '📦 Livraison' },
  { kind: 'ack', label: '💬 Accusé de retours' },
  { kind: 'delay', label: '⏳ Annonce de retard' },
]

export default function ClientMessageWriter({ productionId }: { productionId: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate(kind: string) {
    setBusy(kind)
    const d = await fetch('/api/ai/message', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productionId, kind }),
    }).then(r => r.json()).catch(() => null)
    setBusy(null)
    if (d?.message) setMessage(d.message)
    else alert(d?.error || 'Erreur de génération')
  }

  function copy() {
    navigator.clipboard.writeText(message).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setMessage('') }} style={{ background: 'rgba(199,210,254,0.08)', border: '1px solid rgba(199,210,254,0.3)', borderRadius: 8, padding: '8px 16px', color: '#c7d2fe', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}>
        ✍️ Rédiger le message client
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(10,6,24,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(26,18,48,0.97)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 18, padding: 24, maxWidth: 520, width: '100%' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.95rem', fontWeight: 800, marginBottom: 4 }}>✍️ Message client</p>
            <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.72rem', marginBottom: 14 }}>Choisis le type de message — généré dans le ton du studio, à copier-coller.</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {VARIANTS.map(v => (
                <button key={v.kind} onClick={() => generate(v.kind)} disabled={busy !== null} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 9, padding: '8px 14px', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, opacity: busy && busy !== v.kind ? 0.5 : 1 }}>
                  {busy === v.kind ? 'Rédaction…' : v.label}
                </button>
              ))}
            </div>

            {message && (
              <>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 170, background: 'rgba(12,8,26,0.85)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10, padding: '12px 14px', color: '#f0ebe3', fontSize: '0.82rem', lineHeight: 1.5, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button onClick={copy} style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #a78bfa, #ec4899)', border: copied ? '1px solid rgba(34,197,94,0.4)' : 'none', borderRadius: 9, padding: '9px 20px', color: copied ? '#22c55e' : '#0a0a0a', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800 }}>
                    {copied ? '✓ Copié' : '📋 Copier le message'}
                  </button>
                  <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 9, padding: '9px 14px', color: 'rgba(240,235,227,0.5)', cursor: 'pointer', fontSize: '0.78rem' }}>Fermer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
