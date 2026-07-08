'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCached } from '@/lib/useCached'
import { useLang } from '@/lib/i18n'
import Avatar from '@/components/Avatar'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/statuses'

// Contractor dashboard — same premium layout as the admin dashboard,
// with contractor-specific KPIs and objectives.

const glass: React.CSSProperties = {
  background: 'rgba(26, 18, 48, 0.65)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(167,139,250,0.18)',
  borderRadius: 18,
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function FreelancerDashboard() {
  const { data: session } = useSession()
  const [, , t] = useLang()
  const { data: stats, refresh: refreshS } = useCached<any>('fstats', '/api/stats')
  const { data: g, refresh: refreshG } = useCached<any>('gamify', '/api/gamify/me')
  const { data: board, refresh: refreshB } = useCached<any[]>('leaderboard', '/api/gamify/leaderboard')
  const { data: payoutsData } = useCached<any[]>('fpayouts', '/api/monthly-payouts')
  const { data: prodsData } = useCached<any[]>('fprods', '/api/productions')

  useEffect(() => {
    const refreshAll = () => { refreshS(); refreshG(); refreshB() }
    const interval = setInterval(refreshAll, 20000)
    window.addEventListener('live-refresh', refreshAll)
    window.addEventListener('focus', refreshAll)
    return () => { clearInterval(interval); window.removeEventListener('live-refresh', refreshAll); window.removeEventListener('focus', refreshAll) }
  }, [refreshS, refreshG, refreshB])

  const s = stats || { inProgress: '·', overdue: 0, dueToday: 0, pendingValidations: 0, validated: '·', completedWeek: 0, completedToday: 0, urgentProds: [], notifications: [] }
  const firstName = session?.user?.name?.split(' ')[0] || ''
  const payouts = Array.isArray(payoutsData) ? payoutsData : []
  const prods = Array.isArray(prodsData) ? prodsData : []

  // Financial
  const currentMonth = new Date().toISOString().slice(0, 7)
  const pendingAmount = prods.filter(p => p.status === 'livre').reduce((a, p) => a + (p.price || 0), 0)
  const validatedAmount = payouts.find(p => p.month === currentMonth)?.validatedAmount || 0
  const totalBalance = payouts.reduce((a, p) => a + (p.validatedAmount || 0), 0)

  const kpis = [
    { label: t('kpi_inprogress'), value: s.inProgress, color: '#a78bfa', href: '/espace/prestations' },
    { label: t('kpi_waiting'), value: s.pendingValidations, color: '#d8b4fe', href: '/espace/prestations' },
    { label: t('kpi_validated'), value: s.validated, color: '#6ee7b7', href: '/espace/archives' },
    { label: t('kpi_overdue'), value: s.overdue, color: '#fb7185', href: '/espace/prestations' },
  ]

  // Contractor-specific objectives — auto-completed from real data
  const missions = stats ? [
    { label: t('obj_no_overdue'), done: s.overdue === 0, progress: s.overdue > 0 ? `${s.overdue}` : '✓', xp: 15 },
    { label: t('obj_deliver_today'), done: s.dueToday === 0, progress: s.dueToday > 0 ? `${s.dueToday}` : '✓', xp: 25 },
    { label: t('obj_answer_feedback'), done: !prods.some(p => p.status === 'revisions'), progress: prods.filter(p => p.status === 'revisions').length || '✓', xp: 20 },
  ] : []
  const missionsDone = missions.filter(m => m.done).length

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 1100 }}>
      <style>{`
        @keyframes ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes card-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .dash-fade { animation: fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {/* ===== Hero ===== */}
      <div className="dash-fade" style={{ ...glass, padding: '30px 34px', marginBottom: 14, animation: 'fade-up 0.5s both, card-float 6s ease-in-out 1s infinite', background: 'linear-gradient(135deg, rgba(88,28,135,0.35), rgba(22,17,40,0.6))' }}>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar url={g?.profilePicUrl} name={firstName} level={g?.level || 0} size={150} ringSpeed={6} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ color: '#f0ebe3', fontSize: '1.55rem', fontWeight: 900 }}>{t('hello')} {firstName} 👋</h1>
              {g && (
                <>
                  <span style={{ background: 'linear-gradient(90deg, rgba(167,139,250,0.2), rgba(236,72,153,0.15))', border: '1px solid rgba(167,139,250,0.35)', color: '#c4b5fd', padding: '3px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800 }}>{g.rank}</span>
                  <span style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem', fontWeight: 700 }}>{t('level')} {g.level}</span>
                  {g.streak >= 2 && <span style={{ color: '#e879f9', fontSize: '0.85rem', fontWeight: 900 }}>🔥 {g.streak}j</span>}
                </>
              )}
            </div>
            {g && (
              <div style={{ marginTop: 12, maxWidth: 440 }}>
                <div style={{ height: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(g.progress, 3)}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #ec4899)', borderRadius: 8, position: 'relative', overflow: 'hidden', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }}>
                    <div style={{ position: 'absolute', inset: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', animation: 'shimmer 2.4s ease-in-out infinite' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <p style={{ color: '#c4b5fd', fontSize: '0.66rem', fontWeight: 800 }}>Niv. {g.level}</p>
                  <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.66rem', fontWeight: 700 }}>{g.xpInLevel} / {g.xpForNext} XP</p>
                  <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.66rem', fontWeight: 800 }}>Niv. {g.level + 1}</p>
                </div>
              </div>
            )}
          </div>
          {g && (
            <div style={{ display: 'grid', gap: 14, textAlign: 'right' }}>
              <div>
                <p style={{ color: '#f0ebe3', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>{g.validated}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem', marginTop: 2 }}>{t('prods_done')}</p>
              </div>
              <div>
                <p style={{ color: g.xpToday > 0 ? '#ec4899' : '#f0ebe3', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>+{g.xpToday}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem', marginTop: 2 }}>{t('xp_today')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Goal + KPI 2x2 | Objectives ===== */}
      <div className="dash-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14, animationDelay: '0.06s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Weekly goal — 5 for a contractor */}
          <div style={{ ...glass, padding: '12px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('week_goal')}</p>
              <p style={{ color: s.completedWeek >= 5 ? '#22c55e' : '#c4b5fd', fontSize: '0.85rem', fontWeight: 900 }}>{s.completedWeek}/5{s.completedWeek >= 5 ? ' 🎉' : ''}</p>
            </div>
            <div style={{ height: 9, background: 'rgba(0,0,0,0.5)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (s.completedWeek / 5) * 100)}%`, background: s.completedWeek >= 5 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #7c3aed, #ec4899)', borderRadius: 8, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 2.8s ease-in-out infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
              <div><p style={{ color: '#22c55e', fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>{s.completedToday}</p><p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>{t('done_today')}</p></div>
              <div><p style={{ color: '#c4b5fd', fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>+{g?.xpWeek ?? 0}</p><p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>{t('xp_week')}</p></div>
            </div>
          </div>

          {/* KPI 2x2 — hero-toned */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, flex: 1 }}>
            {kpis.map(k => (
              <Link key={k.label} href={k.href} style={{ ...glass, background: 'linear-gradient(135deg, rgba(88,28,135,0.45), rgba(46,28,86,0.55))', padding: '14px 18px', textDecoration: 'none', borderColor: `${k.color}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                <p style={{ color: k.color, fontSize: '1.7rem', fontWeight: 900, lineHeight: 1, textShadow: `0 0 18px ${k.color}50` }}>{k.value}</p>
                <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.7rem', fontWeight: 700 }}>{k.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Objectives + leaderboard — same column, no gap between them */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...glass, padding: '14px 18px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('objectives')}</p>
            <p style={{ color: missionsDone === missions.length && missions.length > 0 ? '#22c55e' : '#c4b5fd', fontSize: '0.78rem', fontWeight: 900 }}>{missionsDone}/{missions.length}{missionsDone === missions.length && missions.length > 0 ? t('all_done') : ''}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missions.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, background: m.done ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'rgba(0,0,0,0.4)', border: m.done ? 'none' : '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontSize: '0.65rem', fontWeight: 900 }}>{m.done ? '✓' : ''}</span>
                <p style={{ color: m.done ? 'rgba(240,235,227,0.35)' : '#f0ebe3', fontSize: '0.78rem', flex: 1, textDecoration: m.done ? 'line-through' : 'none' }}>{m.label}</p>
                <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem' }}>{m.progress}</span>
                <span style={{ color: m.done ? '#22c55e' : '#c4b5fd', fontSize: '0.66rem', fontWeight: 800 }}>+{m.xp} XP</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard — right under Objectives, no gap */}
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
                    <div style={{ margin: '0 auto 5px', width: isFirst ? 64 : 52 }}>
                      <Avatar url={u.profilePicUrl} name={u.name} level={u.level} size={isFirst ? 64 : 52} />
                    </div>
                    <p style={{ color: tColor, fontSize: '0.85rem', fontWeight: 900, lineHeight: 1 }}>{pos + 1}</p>
                    <p style={{ color: '#f0ebe3', fontSize: '0.68rem', fontWeight: 800, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}{u.isMe ? ' ✦' : ''}</p>
                    <p style={{ color: '#c4b5fd', fontSize: '0.62rem', fontWeight: 800 }}>Niv. {u.level}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.58rem' }}>{u.productions} {t('prod_short')}</p>
                  </div>
                )
              })}
            </div>
          )}
          {(board || []).slice(3).map((u: any, i: number) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderTop: '1px solid rgba(167,139,250,0.06)', background: u.isMe ? 'rgba(167,139,250,0.1)' : 'transparent', borderLeft: u.isMe ? '2px solid #a78bfa' : '2px solid transparent' }}>
              <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', fontWeight: 900, width: 18, textAlign: 'center' }}>{i + 4}</span>
              <Avatar url={u.profilePicUrl} name={u.name} level={u.level} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.72rem', fontWeight: 700 }}>{u.name}{u.isMe ? ' ✦' : ''}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.58rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.rank}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#c4b5fd', fontSize: '0.7rem', fontWeight: 900 }}>Niv. {u.level}</p>
                <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.56rem' }}>{u.productions} {t('prod_short')}</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Financial */}
      <div className="dash-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14, animationDelay: '0.1s' }}>
        {[
          { l: t('pending_amount'), v: pendingAmount, c: '#c4b5fd', sub: t('delivered_waiting') },
          { l: t('validated_amount'), v: validatedAmount, c: '#22c55e', sub: t('this_month') },
          { l: t('total_balance'), v: totalBalance, c: '#a78bfa', sub: t('since_start') },
        ].map(f => (
          <div key={f.l} style={{ ...glass, padding: '14px 18px' }}>
            <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{f.l}</p>
            <p style={{ color: f.c, fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{f.v.toLocaleString('fr-FR')} €</p>
            <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.66rem', marginTop: 4 }}>{f.sub}</p>
          </div>
        ))}
      </div>

      {/* ===== Priorities | Leaderboard ===== */}
      <div className="dash-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, animationDelay: '0.16s' }}>
        <div style={{ ...glass, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '11px 18px', borderBottom: '1px solid rgba(167,139,250,0.12)', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 700 }}>{t('priorities')}</p>
            <Link href="/espace/prestations" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', textDecoration: 'none' }}>{t('see_all')}</Link>
          </div>
          {(s.urgentProds as any[]).length === 0 ? (
            <p style={{ color: '#22c55e', padding: '18px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{t('no_urgent')}</p>
          ) : (
            (s.urgentProds as any[]).slice(0, 3).map((p: any) => {
              const isOverdue = p.deadline && new Date(p.deadline) < new Date()
              return (
                <Link key={p.id} href="/espace/prestations" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '9px 18px', borderBottom: '1px solid rgba(167,139,250,0.07)', textDecoration: 'none', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 600 }}>{p.title}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem' }}>{p.client}</p>
                  </div>
                  <span style={{ background: `${STATUS_COLORS[p.status] || '#8b7fb8'}18`, color: STATUS_COLORS[p.status] || '#8b7fb8', padding: '1px 8px', borderRadius: 20, fontSize: '0.64rem', fontWeight: 700 }}>{STATUS_LABELS[p.status] || p.status}</span>
                  <span style={{ color: isOverdue ? '#fb7185' : '#c4b5fd', fontSize: '0.68rem', fontWeight: 800 }}>{fmt(p.deadline)}</span>
                </Link>
              )
            })
          )}
        </div>

        {/* Right column: health + achievements — same as admin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Production health — scoped to the contractor's own projects */}
          <div style={{ ...glass, padding: '14px 20px' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 700, marginBottom: 12 }}>{t('health')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: STATUS_LABELS.en_cours, value: Number(s.inProgress) || 0, color: '#a78bfa' },
                { label: STATUS_LABELS.livre, value: s.pendingValidations, color: '#d8b4fe' },
                { label: STATUS_LABELS.revisions, value: prods.filter(p => p.status === 'revisions').length, color: '#e879f9' },
                { label: t('kpi_overdue'), value: s.overdue, color: '#fb7185' },
              ].map(h => {
                const max = Math.max(1, Number(s.inProgress) || 0, s.pendingValidations, s.overdue)
                return (
                  <div key={h.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.7rem', fontWeight: 600 }}>{h.label}</p>
                      <p style={{ color: h.color, fontSize: '0.72rem', fontWeight: 900 }}>{h.value}</p>
                    </div>
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.4)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max((h.value / max) * 100, h.value > 0 ? 5 : 0)}%`, background: `linear-gradient(90deg, ${h.color}70, ${h.color})`, borderRadius: 5, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Achievements — same showcase as admin, instant tooltips */}
          {g && (
            <div style={{ ...glass, padding: '12px 16px' }}>
              <style>{`
                .ach-tip { position: relative; cursor: default; }
                .ach-tip .tipbox { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); background: #1a1230; border: 1px solid rgba(167,139,250,0.4); border-radius: 10px; padding: 8px 12px; width: 190px; z-index: 50; pointer-events: none; opacity: 0; transition: opacity 0.08s ease, transform 0.08s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
                .ach-tip:hover .tipbox { opacity: 1; transform: translateX(-50%) translateY(0); }
              `}</style>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 800 }}>{t('achievements')}</p>
                <Link href="/espace/profil" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem', textDecoration: 'none' }}>{(g.achievements || []).length}/{(g.achievements || []).length + (g.locked || []).length} →</Link>
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
  )
}
