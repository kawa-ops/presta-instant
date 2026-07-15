'use client'
import { useEffect, useState } from 'react'
import { useCached } from '@/lib/useCached'

// "À valider" — every production in `livre`, with the delivery embedded
// (YouTube/Vimeo/Drive/Frame.io) so a delivery can be reviewed and
// validated without leaving the page.

const QUICK_FEEDBACK = [
  'Colorimétrie à revoir',
  "Couper l'intro",
  'Sous-titres manquants',
  'Mixage audio à équilibrer',
  'Logo/format à corriger',
]

// Best-effort conversion of a delivery link into an embeddable URL
function embedUrl(link: string): string | null {
  try {
    const u = new URL(link)
    const h = u.hostname.replace(/^www\./, '')
    if (h === 'youtube.com' || h === 'm.youtube.com') {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
      if (u.pathname.startsWith('/shorts/')) return `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`
    }
    if (h === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    if (h === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
    if (h === 'drive.google.com') {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/)
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
    }
    if (h === 'f.io' || h.endsWith('frame.io')) return link
  } catch {}
  return null
}

export default function ValidationQueue() {
  const { data, refresh } = useCached<any[]>('vqueue', '/api/productions?status=livre')
  const prods = Array.isArray(data) ? data : []
  const [busy, setBusy] = useState<string | null>(null)
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')

  useEffect(() => {
    const onRefresh = () => refresh()
    window.addEventListener('live-refresh', onRefresh)
    return () => window.removeEventListener('live-refresh', onRefresh)
  }, [refresh])

  async function act(id: string, body: any) {
    setBusy(id)
    await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
    setBusy(null)
    setFeedbackFor(null)
    setFeedbackText('')
    refresh()
    window.dispatchEvent(new CustomEvent('live-refresh'))
  }

  if (prods.length === 0) return null

  return (
    <div style={{ background: 'rgba(216,180,254,0.05)', border: '1px solid rgba(216,180,254,0.3)', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
      <p style={{ color: '#d8b4fe', fontSize: '0.85rem', fontWeight: 800, marginBottom: 12 }}>
        🎬 À valider ({prods.length}) — lecteur intégré
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: prods.length > 1 ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr', gap: 14 }}>
        {prods.map(p => {
          const embed = p.deliveryLink ? embedUrl(p.deliveryLink) : null
          return (
            <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              {embed ? (
                <iframe
                  src={embed}
                  style={{ width: '100%', aspectRatio: '16 / 9', border: 'none', display: 'block', background: '#000' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : p.deliveryLink ? (
                <a href={p.deliveryLink} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '22px 16px', textAlign: 'center', color: '#a5b4fc', fontSize: '0.8rem', textDecoration: 'none', background: 'rgba(165,180,252,0.05)' }}>
                  🔗 Ouvrir la livraison ↗<br />
                  <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem' }}>{p.deliveryLink.slice(0, 60)}…</span>
                </a>
              ) : (
                <p style={{ padding: '22px 16px', textAlign: 'center', color: 'rgba(240,235,227,0.25)', fontSize: '0.75rem' }}>Pas de lien de livraison</p>
              )}

              <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 800 }}>{p.title}</p>
                  {p.price ? <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.72rem', fontWeight: 700 }}>{p.price.toLocaleString('fr-FR')} €</p> : null}
                </div>
                <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem', marginBottom: 10 }}>{p.client} · {p.assignedTo?.name || '—'}</p>

                {feedbackFor === p.id ? (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                      {QUICK_FEEDBACK.map(q => (
                        <button key={q} onClick={() => setFeedbackText(t => t ? `${t.replace(/\n?$/, '')}\n— ${q}` : `— ${q}`)} style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 20, padding: '2px 9px', color: '#e879f9', cursor: 'pointer', fontSize: '0.64rem', fontWeight: 600 }}>+ {q}</button>
                      ))}
                    </div>
                    <textarea
                      autoFocus
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      placeholder="Décris les modifications à faire…"
                      style={{ width: '100%', boxSizing: 'border-box', minHeight: 60, background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 8, padding: '8px 10px', color: '#f0ebe3', fontSize: '0.78rem', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={() => { if (feedbackText.trim()) act(p.id, { feedback: feedbackText.trim() }) }} disabled={busy === p.id} style={{ background: '#e879f9', color: '#0a0a0a', border: 'none', borderRadius: 7, padding: '6px 14px', fontWeight: 800, cursor: 'pointer', fontSize: '0.72rem' }}>Envoyer les retours</button>
                      <button onClick={() => { setFeedbackFor(null); setFeedbackText('') }} style={{ background: 'transparent', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 7, padding: '6px 10px', color: 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => act(p.id, { status: 'valide', archived: true })} disabled={busy === p.id} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#0a0a0a', border: 'none', borderRadius: 7, padding: '6px 14px', fontWeight: 800, cursor: 'pointer', fontSize: '0.72rem', opacity: busy === p.id ? 0.5 : 1 }}>✅ Valider</button>
                    <button onClick={() => { setFeedbackFor(p.id); setFeedbackText('') }} style={{ background: 'rgba(232,121,249,0.1)', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 7, padding: '6px 14px', color: '#e879f9', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>✎ Retours</button>
                    <button onClick={() => act(p.id, { status: 'envoye_client' })} disabled={busy === p.id} style={{ background: 'rgba(199,210,254,0.1)', border: '1px solid rgba(199,210,254,0.3)', borderRadius: 7, padding: '6px 14px', color: '#c7d2fe', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>📤 Envoyer au client</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
