'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCached } from '@/lib/useCached'
import Avatar from '@/components/Avatar'
import { useLang, statusLabels } from '@/lib/i18n'

// ============================================================================
// DASHBOARD — immersive gamified command center (this page only).
// Purple identity, glassmorphism, animated progress, RPG player card.
// Every other page stays clean and neutral.
// ============================================================================

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const STATUS_COLORS: Record<string, string> = { a_faire: '#8b7fb8', en_cours: '#a5b4fc', en_attente: '#c4b5fd', revisions: '#e879f9', livre: '#a78bfa', envoye_client: '#c7d2fe', retours_client: '#ec4899', valide: '#22c55e' }
const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', revisions: 'Retours à faire', livre: 'À valider', envoye_client: 'Envoyé client', retours_client: 'Retours client', valide: 'Terminé' }

const PRESTIGE_ICONS = ['', '✦', '✦✦', '✦✦✦', '❖']

// Glass card style used everywhere on this page
const glass: React.CSSProperties = {
  background: 'rgba(26, 18, 48, 0.65)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(167,139,250,0.18)',
  borderRadius: 18,
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
}

function MiniConfetti() {
  const colors = ['#22c55e', '#a78bfa', '#eab308', '#ec4899', '#f0ebe3']
  const dots = Array.from({ length: 14 }, (_, i) => ({
    left: 10 + Math.random() * 80, delay: Math.random() * 0.1,
    color: colors[i % colors.length], tx: (Math.random() - 0.5) * 100, size: 3 + Math.random() * 4,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: 'absolute', bottom: 4, left: `${d.left}%`, width: d.size, height: d.size,
          background: d.color, borderRadius: '50%',
          animation: `notif-pop 0.7s ease-out ${d.delay}s forwards`,
          ['--tx' as any]: `${d.tx}px`,
        }} />
      ))}
    </div>
  )
}

function extractTitle(message: string): string | null {
  const m = message.match(/[«"]([^»"]+)[»"]/)
  return m ? m[1].trim() : null
}

// Ambient floating particles
function Particles() {
  const [dots] = useState(() => Array.from({ length: 16 }, (_, i) => ({
    left: Math.random() * 100, top: Math.random() * 100,
    size: 2 + Math.random() * 3, dur: 8 + Math.random() * 14,
    delay: Math.random() * 8, color: i % 3 === 0 ? '#ec4899' : i % 2 === 0 ? '#a78bfa' : '#c7d2fe',
  })))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 24 }}>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: 'absolute', left: `${d.left}%`, top: `${d.top}%`,
          width: d.size, height: d.size, background: d.color, borderRadius: '50%',
          opacity: 0.35, filter: 'blur(0.5px)',
          animation: `particle-drift ${d.dur}s ease-in-out ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [, , t] = useLang()
  const SL = statusLabels(t)
  const { data: stats, refresh, mutate } = useCached<any>('stats', '/api/stats')
  const { data: g, refresh: refreshG } = useCached<any>('gamify', '/api/gamify/me')
  const { data: board, refresh: refreshBoard } = useCached<any[]>('leaderboard', '/api/gamify/leaderboard')
  const [poppingNotif, setPoppingNotif] = useState<string | null>(null)
  const [brief, setBrief] = useState<any>(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)

  async function loadBrief() {
    setBriefLoading(true)
    const d = await fetch('/api/brief', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    if (d && !d.error) setBrief(d)
    setBriefLoading(false)
  }
  function toggleBrief() { if (!briefOpen) loadBrief(); setBriefOpen(o => !o) }

  useEffect(() => {
    const refreshAll = () => { refresh(); refreshG(); refreshBoard(); if (briefOpen) loadBrief() }
    const interval = setInterval(refreshAll, 15000)
    window.addEventListener('focus', refreshAll)
    document.addEventListener('visibilitychange', refreshAll)
    window.addEventListener('live-refresh', refreshAll)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refreshAll)
      document.removeEventListener('visibilitychange', refreshAll)
      window.removeEventListener('live-refresh', refreshAll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshG, refreshBoard, briefOpen])

  function dismissNotif(id: string) {
    setPoppingNotif(id)
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
    setTimeout(() => {
      mutate(prev => prev ? { ...prev, notifications: (prev.notifications || []).filter((n: any) => n.id !== id) } : prev)
      setPoppingNotif(null)
    }, 550)
  }

  const s = stats || { inProgress: '·', overdue: 0, dueToday: 0, dueTomorrow: 0, completedMonth: '·', completedWeek: 0, completedToday: 0, pendingValidations: 0, retoursClient: 0, activeFreelancers: '·', totalProds: '·', recentActivity: [], urgentProds: [], recentProds: [], notifications: [] }
  const firstName = session?.user?.name?.split(' ')[0] || ''
  const initial = firstName.charAt(0).toUpperCase() || '✦'
  const prestige = g?.prestige || 0

  // Objectives generated from real production data — never manually checkable
  const missions = stats ? [
    { label: t('obj_no_overdue'), done: s.overdue === 0, progress: s.overdue > 0 ? `${s.overdue}` : '✓', xp: 15 },
    { label: t('obj_deliver_today'), done: s.dueToday === 0, progress: s.dueToday > 0 ? `${s.dueToday}` : '✓', xp: 25 },
    { label: t('obj_validate'), done: s.pendingValidations === 0, progress: s.pendingValidations > 0 ? `${s.pendingValidations}` : '✓', xp: 20 },
    { label: t('obj_feedback'), done: s.retoursClient === 0, progress: s.retoursClient > 0 ? `${s.retoursClient}` : '✓', xp: 20 },
  ] : []
  const missionsDone = missions.filter(m => m.done).length

  const kpis = [
    { label: t('kpi_inprogress'), value: s.inProgress, color: '#a78bfa', href: '/productions?status=en_cours' },
    { label: t('kpi_overdue'), value: s.overdue, color: '#fb7185', href: '/productions?overdue=true' },
    { label: t('kpi_today'), value: s.dueToday, color: '#e879f9', href: '/semaine' },
    { label: t('kpi_month'), value: s.completedMonth, color: '#6ee7b7', href: '/archives' },
  ]

  // Production health — replaces the old activity feed with something actionable
  const health = stats ? [
    { label: SL.en_cours, value: s.inProgress, color: '#a78bfa' },
    { label: SL.livre, value: s.pendingValidations, color: '#d8b4fe' },
    { label: SL.retours_client, value: s.retoursClient, color: '#ec4899' },
    { label: t('kpi_overdue'), value: s.overdue, color: '#fb7185' },
  ] : []
  const healthMax = Math.max(1, ...health.map(h => Number(h.value) || 0))

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 1240, minHeight: '90vh' }}>
      {/* ===== Global dashboard styles & keyframes ===== */}
      <style>{`
        @keyframes notif-pop { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-50px) translateX(var(--tx)) scale(0.3); opacity: 0; } }
        @keyframes bg-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes card-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        @keyframes particle-drift { 0%, 100% { transform: translate(0, 0); opacity: 0.15; } 50% { transform: translate(14px, -22px); opacity: 0.45; } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 18px rgba(167,139,250,0.15); } 50% { box-shadow: 0 0 32px rgba(167,139,250,0.35); } }
        .dash-fade { animation: fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .dash-card-hover { transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s; }
        .dash-card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(167,139,250,0.18); }
        .ach-tip { position: relative; cursor: default; }
        .ach-tip .tipbox {
          position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px);
          background: #1a1230; border: 1px solid rgba(167,139,250,0.4); border-radius: 10px;
          padding: 8px 12px; width: 190px; z-index: 50; pointer-events: none;
          opacity: 0; transition: opacity 0.08s ease, transform 0.08s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .ach-tip:hover .tipbox { opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>

      {/* ===== Ambient animated background (dashboard only) ===== */}
      <div style={{
        position: 'absolute', inset: -24, borderRadius: 24, zIndex: 0,
        background: 'linear-gradient(130deg, rgba(88,28,135,0.35), rgba(30,15,60,0.5), rgba(147,51,234,0.18), rgba(219,39,119,0.12), rgba(30,15,60,0.5))',
        backgroundSize: '300% 300%',
        animation: 'bg-shift 18s ease-in-out infinite',
      }} />
      <Particles />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ================= HERO — RPG player card ================= */}
        <div className="dash-fade" style={{ ...glass, padding: '36px 40px', marginBottom: 14, animation: 'fade-up 0.5s both, card-float 6s ease-in-out 1s infinite', background: 'linear-gradient(135deg, rgba(88,28,135,0.35), rgba(22,17,40,0.6))' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Avatar with level ornament frame */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar url={g?.profilePicUrl} name={firstName} level={g?.level || 0} size={170} ringSpeed={6} />
              {prestige > 0 && (
                <span title={`Prestige ${prestige}`} style={{ position: 'absolute', bottom: -4, right: -4, background: '#141021', border: '1px solid rgba(234,179,8,0.5)', borderRadius: 20, padding: '2px 8px', color: '#eab308', fontSize: '0.7rem', fontWeight: 800, zIndex: 2 }}>
                  {PRESTIGE_ICONS[Math.min(prestige, 4)]}
                </span>
              )}
            </div>

            {/* Identity + XP */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ color: '#f0ebe3', fontSize: '1.7rem', fontWeight: 900 }}>{t('hello')} {firstName} 👋</h1>
                {g && (
                  <>
                    <span style={{ background: 'linear-gradient(90deg, rgba(167,139,250,0.2), rgba(236,72,153,0.15))', border: '1px solid rgba(167,139,250,0.35)', color: '#c4b5fd', padding: '3px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800 }}>{g.rank}</span>
                    <span style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem', fontWeight: 700 }}>Niveau {g.level}{prestige > 0 ? ` · Prestige ${'I'.repeat(Math.min(prestige, 3))}` : ''}</span>
                    {g.streak >= 2 && <span style={{ color: '#e879f9', fontSize: '0.85rem', fontWeight: 900 }}>🔥 {g.streak} jours</span>}
                  </>
                )}
              </div>
              <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.75rem', marginTop: 3 }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · Studio Niv. {g?.studioLevel ?? '·'}
              </p>

              {/* XP bar — Arentreal style: level labels at both ends */}
              {g && (
                <div style={{ marginTop: 12, maxWidth: 480 }}>
                  <div style={{ height: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${Math.max(g.progress, 3)}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #ec4899)', borderRadius: 8, position: 'relative', overflow: 'hidden', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }}>
                      <div style={{ position: 'absolute', inset: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', animation: 'shimmer 2.4s ease-in-out infinite' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    <p style={{ color: '#c4b5fd', fontSize: '0.66rem', fontWeight: 800 }}>Niv. {g.level}</p>
                    <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.66rem', fontWeight: 700 }}>{g.xpInLevel} XP / {g.xpForNext} · encore {g.xpForNext - g.xpInLevel} XP</p>
                    <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.66rem', fontWeight: 800 }}>Niv. {g.level + 1}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Player stats */}
            {g && (
              <div style={{ display: 'grid', gridTemplateColumns: 'auto', gap: 14, textAlign: 'right' }}>
                {[
                  { v: g.validated, l: 'productions terminées' },
                  { v: `+${g.xpToday}`, l: 'XP aujourd\'hui', hot: g.xpToday > 0 },
                ].map((st: any, i) => (
                  <div key={i}>
                    <p style={{ color: st.hot ? '#ec4899' : '#f0ebe3', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>{st.v}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem', marginTop: 2 }}>{st.l}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={toggleBrief} className="dash-card-hover" style={{ background: briefOpen ? 'linear-gradient(135deg, #a78bfa, #ec4899)' : 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 12, padding: '12px 20px', color: briefOpen ? '#0a0a0a' : '#c4b5fd', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, animation: 'glow-pulse 3s ease-in-out infinite' }}>
              {t('brief')}
            </button>
          </div>
        </div>

        {/* ✨ AI Brief */}
        {briefOpen && (
          <div className="dash-fade" style={{ ...glass, padding: '18px 24px', marginBottom: 14 }}>
            <p style={{ color: '#c4b5fd', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>✨ Assistant de production</p>
            {briefLoading && !brief ? (
              <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.8rem' }}>{t('analyzing')}</p>
            ) : brief ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{t('priorities')}</p>
                  {brief.priorities.map((p: string, i: number) => <p key={i} style={{ color: 'rgba(240,235,227,0.8)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: 5 }}>{p}</p>)}
                </div>
                <div>
                  <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{t('actions_reco')}</p>
                  {brief.actions.map((a: string, i: number) => <p key={i} style={{ color: 'rgba(240,235,227,0.8)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: 5 }}><span style={{ color: '#ec4899', fontWeight: 800 }}>→</span> {a}</p>)}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ================= Goal + KPI 2x2 (wide left) | Objectives compact (right) ================= */}
        <div className="dash-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, marginBottom: 14, animationDelay: '0.06s', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Weekly goal */}
          <div style={{ ...glass, padding: '12px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('week_goal')}</p>
              <p style={{ color: s.completedWeek >= 10 ? '#22c55e' : '#c4b5fd', fontSize: '0.85rem', fontWeight: 900 }}>
                {s.completedWeek}/10{s.completedWeek >= 10 ? ' 🎉' : ''}
              </p>
            </div>
            <div style={{ height: 9, background: 'rgba(0,0,0,0.5)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (s.completedWeek / 10) * 100)}%`, background: s.completedWeek >= 10 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #7c3aed, #ec4899)', borderRadius: 8, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 2.8s ease-in-out infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
              <div><p style={{ color: '#22c55e', fontSize: '1.05rem', fontWeight: 900, lineHeight: 1 }}>{s.completedToday}</p><p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>{t('done_today')}</p></div>
              <div><p style={{ color: '#c4b5fd', fontSize: '1.05rem', fontWeight: 900, lineHeight: 1 }}>+{g?.xpWeek ?? 0}</p><p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>{t('xp_week')}</p></div>
              <div><p style={{ color: '#e879f9', fontSize: '1.05rem', fontWeight: 900, lineHeight: 1 }}>{g?.streak ?? 0}j</p><p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>{t('streak')}</p></div>
            </div>
          </div>

          {/* KPIs 2x2 under the weekly goal — hero-toned, they carry the key info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {kpis.map(k => (
              <Link key={k.label} href={k.href} className="dash-card-hover" style={{ ...glass, background: 'linear-gradient(135deg, rgba(88,28,135,0.45), rgba(46,28,86,0.55))', padding: '14px 18px', textDecoration: 'none', borderColor: `${k.color}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minHeight: 78 }}>
                <p style={{ color: k.color, fontSize: '1.7rem', fontWeight: 900, lineHeight: 1, textShadow: `0 0 18px ${k.color}50` }}>{k.value}</p>
                <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.7rem', fontWeight: 700 }}>{k.label}</p>
              </Link>
            ))}
          </div>
          </div>

          {/* Right column: Objectives compact card + Leaderboard directly below, same column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...glass, padding: '14px 18px', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('objectives')}</p>
              <p style={{ color: missionsDone === missions.length && missions.length > 0 ? '#22c55e' : '#c4b5fd', fontSize: '0.78rem', fontWeight: 900 }}>
                {missionsDone}/{missions.length}{missionsDone === missions.length && missions.length > 0 ? t('all_done') : ''}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {missions.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                    background: m.done ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'rgba(0,0,0,0.4)',
                    border: m.done ? 'none' : '1px solid rgba(167,139,250,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0a0a0a', fontSize: '0.65rem', fontWeight: 900,
                    transition: 'all 0.3s',
                  }}>{m.done ? '✓' : ''}</span>
                  <p style={{ color: m.done ? 'rgba(240,235,227,0.35)' : '#f0ebe3', fontSize: '0.78rem', flex: 1, textDecoration: m.done ? 'line-through' : 'none' }}>{m.label}</p>
                  <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem' }}>{m.progress}</span>
                  <span style={{ color: m.done ? '#22c55e' : '#c4b5fd', fontSize: '0.66rem', fontWeight: 800 }}>+{m.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard — Arentreal-style podium then list, right under Objectives */}
          <div style={{ ...glass, overflow: 'hidden', alignSelf: 'start' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 800, padding: '11px 16px', borderBottom: '1px solid rgba(167,139,250,0.12)' }}>{t('leaderboard')}</p>

            {(board || []).length >= 2 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '18px 12px 14px' }}>
                {[1, 0, 2].map(pos => {
                  const u = (board || [])[pos]
                  if (!u) return <div key={pos} style={{ width: 76 }} />
                  const isFirst = pos === 0
                  const trophy = pos === 0 ? '🏆' : pos === 1 ? '🥈' : '🥉'
                  const tColor = pos === 0 ? '#eab308' : pos === 1 ? '#c0c8d4' : '#b45309'
                  return (
                    <div key={u.id} style={{
                      width: isFirst ? 96 : 78, textAlign: 'center',
                      background: isFirst ? 'linear-gradient(180deg, rgba(234,179,8,0.1), rgba(26,18,48,0.4))' : 'rgba(0,0,0,0.25)',
                      border: `1px solid ${isFirst ? 'rgba(234,179,8,0.35)' : 'rgba(167,139,250,0.15)'}`,
                      borderRadius: 14, padding: isFirst ? '14px 8px' : '10px 6px',
                      transform: isFirst ? 'translateY(-8px)' : 'none',
                      boxShadow: isFirst ? '0 8px 24px rgba(234,179,8,0.12)' : 'none',
                    }}>
                      <p style={{ fontSize: isFirst ? '1.35rem' : '1.05rem', marginBottom: 4 }}>{trophy}</p>
                      {/* Avatar with prestige ornament ring */}
                      <div style={{ position: 'relative', width: isFirst ? 44 : 36, height: isFirst ? 44 : 36, margin: '0 auto 5px' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: u.prestige >= 1 ? 'conic-gradient(#eab308, #ec4899, #a78bfa, #eab308)' : 'conic-gradient(#a78bfa, #c7d2fe, #a78bfa)' }} />
                        <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: '#141021', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.profilePicUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.profilePicUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ color: '#c4b5fd', fontSize: isFirst ? '0.95rem' : '0.78rem', fontWeight: 900 }}>{u.name?.charAt(0)?.toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                      <p style={{ color: tColor, fontSize: '0.85rem', fontWeight: 900, lineHeight: 1 }}>{pos + 1}</p>
                      <p style={{ color: '#f0ebe3', fontSize: '0.68rem', fontWeight: 800, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}{u.isMe ? ' ✦' : ''}</p>
                      <p style={{ color: '#c4b5fd', fontSize: '0.62rem', fontWeight: 800 }}>Niv. {u.level}</p>
                      <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.58rem' }}>{u.productions} prod.</p>
                    </div>
                  )
                })}
              </div>
            )}

            {(board || []).slice(3).map((u: any, i: number) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px',
                borderTop: '1px solid rgba(167,139,250,0.06)',
                background: u.isMe ? 'rgba(167,139,250,0.1)' : 'transparent',
                borderLeft: u.isMe ? '2px solid #a78bfa' : '2px solid transparent',
              }}>
                <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', fontWeight: 900, width: 18, textAlign: 'center' }}>{i + 4}</span>
                <Avatar url={u.profilePicUrl} name={u.name} level={u.level} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#f0ebe3', fontSize: '0.72rem', fontWeight: 700 }}>{u.name}{u.isMe ? ' (toi)' : ''}</p>
                  <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.58rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.rank}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#c4b5fd', fontSize: '0.7rem', fontWeight: 900 }}>Niv. {u.level}</p>
                  <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.56rem' }}>{u.productions} prod.</p>
                </div>
              </div>
            ))}
            {(board || []).length === 1 && (
              <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.7rem', padding: '4px 16px 14px', textAlign: 'center' }}>Le podium se remplit dès que l&apos;équipe gagne de l&apos;XP 💪</p>
            )}
            {(!board || board.length === 0) && <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem', padding: '16px', textAlign: 'center' }}>Le classement se remplit avec l&apos;XP gagné.</p>}
          </div>
          </div>
        </div>


        {/* {t('to_process')} */}
        {stats && (s.notifications || []).length > 0 && (
          <div className="dash-fade" style={{ ...glass, padding: '14px 20px', marginBottom: 14, borderColor: 'rgba(167,139,250,0.3)', animationDelay: '0.2s' }}>
            <p style={{ color: '#c4b5fd', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('to_process')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(s.notifications as any[]).map((n: any) => {
                const popping = poppingNotif === n.id
                const title = extractTitle(n.message)
                return (
                  <div key={n.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, position: 'relative',
                    background: popping ? 'rgba(34,197,94,0.12)' : 'transparent',
                    borderRadius: 8, padding: '3px 6px',
                    opacity: popping ? 0.4 : 1,
                    transform: popping ? 'translateX(12px)' : 'none',
                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}>
                    {popping && <MiniConfetti />}
                    <p style={{ color: '#f0ebe3', fontSize: '0.78rem', flex: 1 }}>{n.message}</p>
                    <Link href={title ? `/productions?focus=${encodeURIComponent(title)}` : (n.link || '/productions')} style={{ background: 'rgba(199,210,254,0.1)', border: '1px solid rgba(199,210,254,0.3)', borderRadius: 6, padding: '2px 10px', color: '#c7d2fe', fontSize: '0.66rem', textDecoration: 'none', fontWeight: 700 }}>{t('see')}</Link>
                    <button onClick={() => dismissNotif(n.id)} disabled={popping} style={{ background: popping ? 'rgba(34,197,94,0.25)' : 'rgba(240,235,227,0.06)', border: `1px solid ${popping ? 'rgba(34,197,94,0.5)' : 'rgba(167,139,250,0.2)'}`, borderRadius: 6, padding: '2px 10px', color: popping ? '#22c55e' : 'rgba(240,235,227,0.45)', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 700 }}>✓</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ================= Main grid: lists + leaderboard ================= */}
        <div className="dash-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, animationDelay: '0.24s' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Résumé opérationnel — largeur alignée sur les priorités */}
            {stats && (s.overdue > 0 || s.dueToday > 0 || s.dueTomorrow > 0 || s.pendingValidations > 0) && (
              <div style={{ ...glass, padding: '9px 18px', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('summary')}</p>
                {s.overdue > 0 && <p style={{ color: '#fb7185', fontSize: '0.76rem', fontWeight: 700 }}>⚠ {s.overdue} {t('late_w')}</p>}
                {s.dueToday > 0 && <p style={{ color: '#d9a94e', fontSize: '0.76rem', fontWeight: 700 }}>● {s.dueToday} {t('today_w')}</p>}
                {s.dueTomorrow > 0 && <p style={{ color: '#e0a37a', fontSize: '0.76rem', fontWeight: 700 }}>◐ {s.dueTomorrow} {t('tomorrow_w')}</p>}
                {s.pendingValidations > 0 && <p style={{ color: '#a78bfa', fontSize: '0.76rem', fontWeight: 700 }}>🟣 {s.pendingValidations} {t('to_validate_w')}</p>}
                {s.retoursClient > 0 && <p style={{ color: '#ec4899', fontSize: '0.76rem', fontWeight: 700 }}>💬 {s.retoursClient} {t('client_fb_w')}</p>}
                <Link href="/semaine" style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.7rem', textDecoration: 'none', marginLeft: 'auto' }}>{t('planning_link')}</Link>
              </div>
            )}

            {/* Priorités */}
            <div style={{ ...glass, overflow: 'hidden' }}>
              <div style={{ padding: '11px 18px', borderBottom: '1px solid rgba(167,139,250,0.12)', display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 700 }}>{t('priorities')}</p>
                <Link href="/productions" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', textDecoration: 'none' }}>{t('see_all')}</Link>
              </div>
              {(s.urgentProds as any[]).length === 0 ? (
                <p style={{ color: '#22c55e', padding: '18px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{t('no_urgent')}</p>
              ) : (
                (s.urgentProds as any[]).slice(0, 3).map((p: any) => {
                  const isOverdue = p.deadline && new Date(p.deadline) < new Date()
                  return (
                    <Link key={p.id} href={`/productions?focus=${encodeURIComponent(p.title)}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '8px 18px', borderBottom: '1px solid rgba(167,139,250,0.07)', textDecoration: 'none', alignItems: 'center' }}>
                      <div>
                        <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 600 }}>{p.title}</p>
                        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem' }}>{p.client} · {p.assignedTo?.name || '—'}</p>
                      </div>
                      <span style={{ background: `${STATUS_COLORS[p.status] || '#8b7fb8'}18`, color: STATUS_COLORS[p.status] || '#8b7fb8', padding: '1px 8px', borderRadius: 20, fontSize: '0.64rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{SL[p.status] || p.status}</span>
                      <span style={{ color: isOverdue ? '#fb7185' : '#eab308', fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{fmt(p.deadline)}</span>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Santé de la production — remplaces the old activity feed */}
            <div style={{ ...glass, padding: '14px 20px' }}>
              <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 700, marginBottom: 12 }}>{t('health')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {health.map(h => (
                  <div key={h.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.7rem', fontWeight: 600 }}>{h.label}</p>
                      <p style={{ color: h.color, fontSize: '0.72rem', fontWeight: 900 }}>{h.value}</p>
                    </div>
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.4)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(((Number(h.value) || 0) / healthMax) * 100, Number(h.value) > 0 ? 5 : 0)}%`, background: `linear-gradient(90deg, ${h.color}70, ${h.color})`, borderRadius: 5, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>
                ))}
              </div>
              {s.overdue === 0 && s.retoursClient === 0 && s.pendingValidations === 0 && (
                <p style={{ color: '#6ee7b7', fontSize: '0.72rem', fontWeight: 700, marginTop: 10 }}>{t('healthy')}</p>
              )}
            </div>
          </div>

          {/* ===== Sidebar: achievements ===== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Achievements showcase */}
            {g && (
              <div style={{ ...glass, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 800 }}>{t('achievements')}</p>
                  <Link href="/parametres" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem', textDecoration: 'none' }}>{(g.achievements || []).length}/{(g.achievements || []).length + (g.locked || []).length} →</Link>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(g.achievements || []).slice(0, 8).map((a: any) => (
                    <span key={a.key} className="ach-tip" style={{ fontSize: '1.15rem', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 10, padding: '5px 8px', display: 'inline-block' }}>
                      {a.emoji}
                      <span className="tipbox"><span style={{ display: 'block', color: '#fde68a', fontSize: '0.68rem', fontWeight: 800 }}>{a.emoji} {a.label}</span><span style={{ display: 'block', color: 'rgba(240,235,227,0.5)', fontSize: '0.62rem', marginTop: 2 }}>Débloqué ✓ (+{a.xp} XP)</span></span>
                    </span>
                  ))}
                  {(g.locked || []).slice(0, Math.max(0, 8 - (g.achievements || []).length)).map((a: any) => (
                    <span key={a.key} className="ach-tip" style={{ fontSize: '1.15rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 10, padding: '5px 8px', display: 'inline-block', opacity: 0.55 }}>
                      <span style={{ filter: 'grayscale(1)', opacity: 0.7 }}>{a.emoji}</span>
                      <span className="tipbox"><span style={{ display: 'block', color: '#c4b5fd', fontSize: '0.68rem', fontWeight: 800 }}>{a.emoji} {a.label}</span><span style={{ display: 'block', color: 'rgba(240,235,227,0.5)', fontSize: '0.62rem', marginTop: 2 }}>À débloquer (+{a.xp} XP)</span></span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
