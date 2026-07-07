'use client'
import { useEffect, useState } from 'react'

// Comment thread + delivery version history for one production.
// Lazily fetched when a row expands, so the main table stays fast.

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Thread({ productionId }: { productionId: string }) {
  const [data, setData] = useState<{ versions: any[]; comments: any[] } | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    const d = await fetch(`/api/productions/${productionId}/thread`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    if (d && !d.error) setData(d)
  }

  useEffect(() => { load() }, [productionId])

  async function send() {
    if (!body.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/productions/${productionId}/thread`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
    })
    if (res.ok) {
      const comment = await res.json()
      // Optimistic append — no full reload
      setData(d => d ? { ...d, comments: [...d.comments, comment] } : d)
      setBody('')
    }
    setSending(false)
  }

  const versions = data?.versions || []
  const comments = data?.comments || []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 14, marginTop: 16 }}>
      {/* Comments */}
      <div style={{ background: 'rgba(20,14,38,0.7)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 10, padding: 14 }}>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          💬 Discussion {comments.length > 0 ? `(${comments.length})` : ''}
        </p>

        {data === null ? (
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.75rem', padding: '8px 0' }}>Chargement…</p>
        ) : comments.length === 0 ? (
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.75rem', padding: '8px 0' }}>Aucun message pour l&apos;instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
            {comments.map(c => (
              <div key={c.id} style={{
                background: c.authorRole === 'admin' ? 'rgba(167,139,250,0.06)' : 'rgba(165,180,252,0.05)',
                border: `1px solid ${c.authorRole === 'admin' ? 'rgba(167,139,250,0.15)' : 'rgba(165,180,252,0.12)'}`,
                borderRadius: 8, padding: '8px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <p style={{ color: c.authorRole === 'admin' ? '#a78bfa' : '#a5b4fc', fontSize: '0.68rem', fontWeight: 700 }}>{c.authorName}</p>
                  <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.62rem' }}>{fmt(c.createdAt)}</p>
                </div>
                <p style={{ color: 'rgba(240,235,227,0.8)', fontSize: '0.78rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{c.body}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Écrire un message…"
            style={{ flex: 1, background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.8rem' }}
          />
          <button onClick={send} disabled={sending || !body.trim()} style={{ background: body.trim() ? '#f0ebe3' : 'rgba(240,235,227,0.1)', color: body.trim() ? '#0a0a0a' : 'rgba(240,235,227,0.3)', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: body.trim() ? 'pointer' : 'default', fontSize: '0.78rem' }}>
            {sending ? '…' : 'Envoyer'}
          </button>
        </div>
      </div>

      {/* Version history */}
      <div style={{ background: 'rgba(20,14,38,0.7)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 10, padding: 14, alignSelf: 'start' }}>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          📁 Versions livrées
        </p>
        {versions.length === 0 ? (
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem' }}>Aucune livraison</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {versions.map((v, i) => (
              <a key={v.id} href={v.url} target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                background: i === 0 ? 'rgba(34,197,94,0.06)' : 'rgba(240,235,227,0.02)',
                border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.2)' : '#222'}`,
                borderRadius: 8, textDecoration: 'none',
              }}>
                <span style={{ color: i === 0 ? '#22c55e' : 'rgba(240,235,227,0.4)', fontSize: '0.72rem', fontWeight: 800 }}>V{v.version}</span>
                <span style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.66rem', flex: 1 }}>{fmt(v.createdAt)}</span>
                {i === 0 && <span style={{ color: '#22c55e', fontSize: '0.6rem', fontWeight: 600 }}>actuelle</span>}
                <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem' }}>↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
