'use client'
import { useEffect, useState } from 'react'
import Timeline from '@/components/Timeline'
import { PORTAL_TR, Lang } from './portal-i18n'

const STEP_LABELS: Record<Lang, Record<string, string>> = {
  fr: { a_faire: 'Production lancée', en_cours: 'Montage démarré', revisions: 'Modifications en cours', livre: 'Version prête en interne', envoye_client: 'Version envoyée', retours_client: 'Vos retours reçus', valide: 'Projet approuvé' },
  en: { a_faire: 'Production started', en_cours: 'Editing started', revisions: 'Changes in progress', livre: 'Version ready internally', envoye_client: 'Version sent', retours_client: 'Your feedback received', valide: 'Project approved' },
  es: { a_faire: 'Producción iniciada', en_cours: 'Edición iniciada', revisions: 'Cambios en curso', livre: 'Versión lista internamente', envoye_client: 'Versión enviada', retours_client: 'Comentarios recibidos', valide: 'Proyecto aprobado' },
}
const LOCALES: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' }

export default function PortalClient({ prod, events, versionCount, token }: {
  prod: any; events: any[]; versionCount: number; token: string
}) {
  const [lang, setLang] = useState<Lang>('fr')
  const [mode, setMode] = useState<'idle' | 'feedback' | 'sent-approve' | 'sent-feedback'>(prod.clientApprovedAt ? 'sent-approve' : 'idle')
  const [comments, setComments] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('portal-lang') as Lang | null
    if (saved && PORTAL_TR[saved]) setLang(saved)
  }, [])
  function switchLang(l: Lang) { setLang(l); localStorage.setItem('portal-lang', l) }

  const t = (k: string) => PORTAL_TR[lang][k] || PORTAL_TR.fr[k] || k
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(LOCALES[lang], { day: 'numeric', month: 'long' })

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

  const confetti = approved ? Array.from({ length: 24 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4,
    color: ['#22c55e', '#a78bfa', '#eab308', '#c7d2fe', '#ec4899'][i % 5],
    size: 5 + Math.random() * 5,
  })) : []

  return (
    <div style={{ background: 'rgba(26,18,48,0.65)', backdropFilter: 'blur(14px)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 18, padding: 32, position: 'relative', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.45)' }}>
      {approved && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <style>{`@keyframes portal-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }`}</style>
          {confetti.map((c, i) => (
            <span key={i} style={{ position: 'absolute', top: 0, left: `${c.left}%`, width: c.size, height: c.size, background: c.color, borderRadius: 2, animation: `portal-fall 2.5s ease-in ${c.delay}s forwards` }} />
          ))}
        </div>
      )}

      {/* Language switcher */}
      <div style={{ position: 'absolute', top: 16, right: 18, display: 'flex', gap: 6, zIndex: 2 }}>
        {(['fr', 'en', 'es'] as Lang[]).map(l => (
          <button key={l} onClick={() => switchLang(l)} style={{
            background: lang === l ? 'rgba(167,139,250,0.2)' : 'transparent',
            border: `1px solid ${lang === l ? 'rgba(167,139,250,0.5)' : 'rgba(167,139,250,0.15)'}`,
            borderRadius: 8, padding: '3px 8px', cursor: 'pointer', fontSize: '0.85rem',
            opacity: lang === l ? 1 : 0.55, transition: 'all 0.15s',
          }}>{l === 'fr' ? '🇫🇷' : l === 'en' ? '🇬🇧' : '🇪🇸'}</button>
        ))}
      </div>

      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{t('tracking')}</p>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.3rem', fontWeight: 800 }}>{prod.title}</h1>
      <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.82rem', marginTop: 4, marginBottom: 20 }}>{prod.client}</p>

      {prod.deadline && !approved && (
        <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.1), rgba(236,72,153,0.06))', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 14, padding: '18px 22px', marginBottom: 24, textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{t('delivery_estimated')}</p>
          <p style={{ color: '#c4b5fd', fontSize: '1.5rem', fontWeight: 800 }}>
            {new Date(prod.deadline).toLocaleDateString(LOCALES[lang], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      )}

      <Timeline status={approved ? 'valide' : prod.status} isFreelance={false} />

      {events.length > 0 && (
        <div style={{ marginTop: 20, borderTop: '1px solid rgba(167,139,250,0.12)', paddingTop: 16 }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t('history')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.map((e: any) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <p style={{ color: 'rgba(240,235,227,0.6)', fontSize: '0.78rem' }}>{STEP_LABELS[lang][e.status] || e.status}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{fmtDate(e.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved — premium confirmation */}
      {approved && (
        <div style={{ marginTop: 28, background: 'linear-gradient(135deg, rgba(34,197,94,0.09), rgba(167,139,250,0.06))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '2.2rem', marginBottom: 10 }}>🎉</p>
          <p style={{ color: '#22c55e', fontSize: '1.15rem', fontWeight: 800, marginBottom: 10 }}>{t('thanks_title')}</p>
          <p style={{ color: 'rgba(240,235,227,0.7)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {t('thanks_body_1')}<br />
            {t('thanks_body_2')} <strong style={{ color: '#f0ebe3' }}>{t('thanks_final')}</strong>.<br />
            {t('thanks_body_3')}
          </p>
          {prod.status === 'valide' && (
            <p style={{ color: '#c7d2fe', fontSize: '0.8rem', fontWeight: 700, marginTop: 14 }}>{t('final_sent')}</p>
          )}
        </div>
      )}

      {/* Video ready — review flow */}
      {videoReady && !approved && mode !== 'sent-feedback' && (
        <div style={{ marginTop: 28 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(199,210,254,0.07), rgba(167,139,250,0.05))', border: '1px solid rgba(199,210,254,0.3)', borderRadius: 14, padding: '24px 22px', textAlign: 'center', marginBottom: 16 }}>
            <p style={{ color: '#c7d2fe', fontSize: '1rem', fontWeight: 800, marginBottom: 4 }}>{t('video_ready')}</p>
            {versionCount > 1 && <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.75rem', marginBottom: 12 }}>{t('version_review')} <strong style={{ color: '#f0ebe3' }}>V{versionCount}</strong></p>}

            {isFrameio ? (
              <div style={{ background: 'rgba(240,235,227,0.04)', borderRadius: 10, padding: '14px 16px', marginTop: 10, textAlign: 'left' }}>
                <p style={{ color: 'rgba(240,235,227,0.7)', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 12 }}>{t('frameio_info')}</p>
                <a href={prod.deliveryLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', color: '#0a0a0a', borderRadius: 10, padding: '11px 24px', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none' }}>
                  {t('watch_frameio')}
                </a>
              </div>
            ) : (
              <a href={prod.deliveryLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', color: '#0a0a0a', borderRadius: 10, padding: '13px 28px', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none', marginTop: 8 }}>
                {t('watch')}
              </a>
            )}
          </div>

          {mode === 'idle' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => act('approve')} disabled={sending} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 12, padding: '16px 14px', color: '#22c55e', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                {t('approve')}
              </button>
              {isFrameio ? (
                <button onClick={() => act('frameio_done')} disabled={sending} style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 12, padding: '16px 14px', color: '#e879f9', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                  {t('frameio_done')}
                </button>
              ) : (
                <button onClick={() => setMode('feedback')} disabled={sending} style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 12, padding: '16px 14px', color: '#e879f9', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                  {t('request_changes')}
                </button>
              )}
            </div>
          )}

          {mode === 'feedback' && (
            <div style={{ background: 'rgba(232,121,249,0.04)', border: '1px solid rgba(232,121,249,0.25)', borderRadius: 12, padding: 16 }}>
              <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem', marginBottom: 10 }}>{t('describe')}</p>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={t('feedback_placeholder')}
                style={{ width: '100%', minHeight: 110, background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 10, padding: '12px 14px', color: '#f0ebe3', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={() => act('feedback')} disabled={sending || !comments.trim()} style={{ background: comments.trim() ? 'linear-gradient(135deg, #e879f9, #ec4899)' : 'rgba(240,235,227,0.08)', color: comments.trim() ? '#0a0a0a' : 'rgba(240,235,227,0.3)', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, cursor: comments.trim() ? 'pointer' : 'default', fontSize: '0.82rem' }}>
                  {sending ? t('sending') : t('send_feedback')}
                </button>
                <button onClick={() => setMode('idle')} style={{ background: 'transparent', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 10, padding: '11px 16px', color: 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.82rem' }}>{t('cancel')}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'sent-feedback' && (
        <div style={{ marginTop: 24, background: 'rgba(232,121,249,0.06)', border: '1px solid rgba(232,121,249,0.25)', borderRadius: 14, padding: '22px', textAlign: 'center' }}>
          <p style={{ color: '#e879f9', fontSize: '0.95rem', fontWeight: 800, marginBottom: 6 }}>{t('feedback_received_title')}</p>
          <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>{t('feedback_received_body')}</p>
        </div>
      )}

      {prod.status === 'retours_client' && mode === 'idle' && !videoReady && (
        <p style={{ color: '#e879f9', fontSize: '0.8rem', marginTop: 20, textAlign: 'center' }}>{t('feedback_pending')}</p>
      )}
    </div>
  )
}
