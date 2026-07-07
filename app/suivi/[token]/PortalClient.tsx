'use client'
import { useState } from 'react'
import Timeline from '@/components/Timeline'

const STEP_LABELS: Record<string, string> = {
  a_faire: 'Production lancée',
  en_cours: 'Montage démarré',
  revisions: 'Modifications en cours',
  livre: 'Version prête en interne',
  envoye_client: 'Version envoyée',
  retours_client: 'Vos retours reçus',
  valide: 'Projet approuvé',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function PortalClient({ prod, events, versionCount, token }: {
  prod: any; events: any[]; versionCount: number; token: string
}) {
  const [mode, setMode] = useState<'idle' | 'feedback' | 'sent-approve' | 'sent-feedback'>(prod.clientApprovedAt ? 'sent-approve' : 'idle')
  const [comments, setComments] = useState('')
  const [sending, setSending] = useState(false)
  const [frameioNotice, setFrameioNotice] = useState(false)

  const isFrameio = prod.deliveryLink?.includes('frame.io')
  const videoReady = ['envoye_client', 'retours_client'].includes(prod.status) && prod.deliveryLink
  const approved = mode === 'sent-approve' || prod.status === 'valide'

  async function act(action: 'approve' | 'feedback' | 'frameio_done') {
    setSending(true)
    const res = await fetch(`/api/suivi/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comments }),
    }).catch(() => null)
    setSending(false)
    if (res?.ok) setMode(action === 'approve' ? 'sent-approve' : 'sent-feedback')
  }

  // Confetti on approval
  const confetti = approved ? Array.from({ length: 24 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4,
    color: ['#22c55e', '#a78bfa', '#eab308', '#c7d2fe', '#f0ebe3'][i % 5],
    size: 5 + Math.random() * 5,
  })) : []

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 16, padding: 32, position: 'relative', overflow: 'hidden' }}>
      {approved && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <style>{`@keyframes portal-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }`}</style>
          {confetti.map((c, i) => (
            <span key={i} style={{ position: 'absolute', top: 0, left: `${c.left}%`, width: c.size, height: c.size, background: c.color, borderRadius: 2, animation: `portal-fall 2.5s ease-in ${c.delay}s forwards` }} />
          ))}
        </div>
      )}

      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Suivi de production</p>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.3rem', fontWeight: 800 }}>{prod.title}</h1>
      <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.82rem', marginTop: 4, marginBottom: 20 }}>{prod.client}</p>

      {/* Prominent delivery date */}
      {prod.deadline && !approved && (
        <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12, padding: '18px 22px', marginBottom: 24, textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Livraison estimée</p>
          <p style={{ color: '#a78bfa', fontSize: '1.5rem', fontWeight: 800 }}>
            {new Date(prod.deadline).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      )}

      <Timeline status={approved ? 'valide' : prod.status} isFreelance={false} />

      {/* Milestone dates from real events */}
      {events.length > 0 && (
        <div style={{ marginTop: 20, borderTop: 'rgba(167,139,250,0.12) 1px solid', paddingTop: 16 }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Historique</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.map((e: any) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <p style={{ color: 'rgba(240,235,227,0.6)', fontSize: '0.78rem' }}>{STEP_LABELS[e.status] || e.status}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{fmtDate(e.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Approved state — premium confirmation ===== */}
      {approved && (
        <div style={{ marginTop: 28, background: 'linear-gradient(135deg, rgba(34,197,94,0.09), rgba(199,210,254,0.05))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '2.2rem', marginBottom: 10 }}>🎉</p>
          <p style={{ color: '#22c55e', fontSize: '1.15rem', fontWeight: 800, marginBottom: 10 }}>Parfait !</p>
          <p style={{ color: 'rgba(240,235,227,0.7)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Merci d&apos;avoir validé votre vidéo.<br />
            Notre équipe prépare maintenant la <strong style={{ color: '#f0ebe3' }}>version finale téléchargeable</strong>.<br />
            Vous recevrez le lien de livraison très prochainement.
          </p>
          {prod.status === 'valide' && (
            <p style={{ color: '#c7d2fe', fontSize: '0.8rem', fontWeight: 700, marginTop: 14 }}>📦 Version finale envoyée — vérifiez vos messages !</p>
          )}
        </div>
      )}

      {/* ===== Video ready — review flow ===== */}
      {videoReady && !approved && mode !== 'sent-feedback' && (
        <div style={{ marginTop: 28 }}>
          <div style={{ background: 'rgba(199,210,254,0.06)', border: '1px solid rgba(199,210,254,0.25)', borderRadius: 14, padding: '24px 22px', textAlign: 'center', marginBottom: 16 }}>
            <p style={{ color: '#c7d2fe', fontSize: '1rem', fontWeight: 800, marginBottom: 4 }}>🎬 Votre vidéo est prête !</p>
            {versionCount > 1 && <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.75rem', marginBottom: 12 }}>Version actuellement en révision : <strong style={{ color: '#f0ebe3' }}>V{versionCount}</strong></p>}

            {isFrameio ? (
              <div style={{ background: 'rgba(240,235,227,0.04)', borderRadius: 10, padding: '14px 16px', marginTop: 10, textAlign: 'left' }}>
                <p style={{ color: 'rgba(240,235,227,0.7)', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 12 }}>
                  Votre relecture est hébergée sur <strong style={{ color: '#f0ebe3' }}>Frame.io</strong>.<br />
                  Laissez tous vos commentaires <strong style={{ color: '#f0ebe3' }}>directement sur la timeline</strong>, à la seconde exacte où une modification est souhaitée.<br />
                  Une fois votre relecture terminée, revenez ici et cliquez sur « Ma relecture est terminée ».
                </p>
                <a href={prod.deliveryLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#c7d2fe', color: '#0a0a0a', borderRadius: 10, padding: '11px 24px', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none' }}>
                  ▶ Regarder ma vidéo sur Frame.io ↗
                </a>
              </div>
            ) : (
              <a href={prod.deliveryLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#c7d2fe', color: '#0a0a0a', borderRadius: 10, padding: '13px 28px', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none', marginTop: 8 }}>
                ▶ Regarder ma vidéo
              </a>
            )}
          </div>

          {/* Feedback choices */}
          {mode === 'idle' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => act('approve')} disabled={sending} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 12, padding: '16px 14px', color: '#22c55e', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                ✅ J&apos;approuve cette version
              </button>
              {isFrameio ? (
                <button onClick={() => act('frameio_done')} disabled={sending} style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 12, padding: '16px 14px', color: '#e879f9', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                  ✏️ Ma relecture est terminée
                </button>
              ) : (
                <button onClick={() => setMode('feedback')} disabled={sending} style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 12, padding: '16px 14px', color: '#e879f9', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                  ✏️ J&apos;ai des modifications à demander
                </button>
              )}
            </div>
          )}

          {mode === 'feedback' && (
            <div style={{ background: 'rgba(232,121,249,0.04)', border: '1px solid rgba(232,121,249,0.25)', borderRadius: 12, padding: 16 }}>
              <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem', marginBottom: 10 }}>Décrivez toutes les modifications souhaitées (avec les timecodes si possible) :</p>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={"Ex :\n- Changer la musique à 0:42\n- Ajouter plus de plans du public\n- Raccourcir l'intro"}
                style={{ width: '100%', minHeight: 110, background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 10, padding: '12px 14px', color: '#f0ebe3', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={() => act('feedback')} disabled={sending || !comments.trim()} style={{ background: comments.trim() ? '#e879f9' : 'rgba(240,235,227,0.08)', color: comments.trim() ? '#0a0a0a' : 'rgba(240,235,227,0.3)', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, cursor: comments.trim() ? 'pointer' : 'default', fontSize: '0.82rem' }}>
                  {sending ? 'Envoi…' : 'Envoyer mes retours'}
                </button>
                <button onClick={() => setMode('idle')} style={{ background: 'transparent', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 10, padding: '11px 16px', color: 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.82rem' }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback sent confirmation */}
      {mode === 'sent-feedback' && (
        <div style={{ marginTop: 24, background: 'rgba(232,121,249,0.06)', border: '1px solid rgba(232,121,249,0.25)', borderRadius: 14, padding: '22px', textAlign: 'center' }}>
          <p style={{ color: '#e879f9', fontSize: '0.95rem', fontWeight: 800, marginBottom: 6 }}>✓ Retours bien reçus !</p>
          <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Notre équipe travaille sur vos modifications.<br />Vous serez informé dès que la nouvelle version est disponible sur cette page.
          </p>
        </div>
      )}

      {prod.status === 'retours_client' && mode === 'idle' && !videoReady && (
        <p style={{ color: '#e879f9', fontSize: '0.8rem', marginTop: 20, textAlign: 'center' }}>💬 Vos retours ont été reçus — nouvelle version en préparation.</p>
      )}
    </div>
  )
}
