'use client'
import { useState } from 'react'

// "S'abonner au calendrier" — generates the personal ICS URL (once) and
// lets the user copy it into Google Calendar / Apple Calendar.
export default function CalendarSubscribe() {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setBusy(true)
    const d = await fetch('/api/calendar', { method: 'POST' }).then(r => r.json()).catch(() => null)
    setBusy(false)
    if (d?.url) setUrl(d.url)
    else alert(d?.error || 'Erreur lors de la génération du lien')
  }

  function copy() {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20, marginTop: 12 }}>
      <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>📅 Calendrier des deadlines</p>
      <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginBottom: 12 }}>
        Abonne-toi au flux ICS pour voir tes deadlines et tournages dans Google Calendar ou Apple Calendar — mis à jour automatiquement.
      </p>
      {url ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input readOnly value={url} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 220, background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '8px 12px', color: 'rgba(240,235,227,0.7)', fontSize: '0.72rem' }} />
          <button onClick={copy} style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(167,139,250,0.12)', border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(167,139,250,0.35)'}`, borderRadius: 8, padding: '8px 16px', color: copied ? '#22c55e' : '#c4b5fd', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700 }}>
            {copied ? '✓ Copié' : '📋 Copier'}
          </button>
        </div>
      ) : (
        <button onClick={generate} disabled={busy} style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 8, padding: '8px 16px', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Génération…' : "📅 S'abonner au calendrier"}
        </button>
      )}
    </div>
  )
}
