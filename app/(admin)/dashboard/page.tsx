'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function IconClock() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconAlert() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function IconCalendar() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function IconCheck() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconUsers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}

const STATUS_COLORS: Record<string, string> = { a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308', livre: '#a78bfa', valide: '#22c55e' }
const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', livre: 'Livré', valide: 'Validé' }

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<any>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetch('/api/stats', { cache: 'no-store' }).then(r => r.json())
      if (!data.error) setStats(data)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh: every 30s + when the tab regains focus
    const interval = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [load])

  const s = stats || { inProgress: '·', overdue: '·', dueToday: '·', dueTomorrow: '·', completedMonth: '·', activeFreelancers: '·', totalProds: '·', recentActivity: [], urgentProds: [], recentProds: [] }

  const kpis = [
    { label: 'Projets en cours', value: s.inProgress, sub: 'en production', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: <IconClock />, href: '/productions?status=en_cours' },
    { label: 'Projets en retard', value: s.overdue, sub: 'deadline dépassée', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: <IconAlert />, href: '/productions?overdue=true' },
    { label: 'À rendre aujourd\'hui', value: s.dueToday, sub: 'deadline ce jour', color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', icon: <IconCalendar />, href: '/productions?due=today' },
    { label: 'À rendre demain', value: s.dueTomorrow, sub: 'deadline demain', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', icon: <IconCalendar />, href: '/productions?due=tomorrow' },
    { label: 'Terminés ce mois', value: s.completedMonth, sub: 'validés ce mois', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', icon: <IconCheck />, href: '/archives' },
    { label: 'Prestataires actifs', value: s.activeFreelancers, sub: 'freelancers disponibles', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: <IconUsers />, href: '/prestataires' },
  ]

  return (
    <div style={{ width: '100%', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: '#f0ebe3', fontSize: '1.5rem', fontWeight: 800 }}>
            Bonjour {session?.user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.8rem', marginTop: 3 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
          <p style={{ color: '#f0ebe3', fontSize: '1.1rem', fontWeight: 800 }}>{s.totalProds}</p>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem' }}>prestations actives</p>
        </div>
      </div>

      {/* Alerts */}
      {stats && (s.overdue > 0 || s.dueToday > 0) && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {s.overdue > 0 && <p style={{ color: '#ef4444', fontSize: '0.82rem' }}>⚠ {s.overdue} prestation{s.overdue > 1 ? 's' : ''} en retard</p>}
          {s.dueToday > 0 && <p style={{ color: '#eab308', fontSize: '0.82rem' }}>● {s.dueToday} prestation{s.dueToday > 1 ? 's' : ''} à livrer aujourd&apos;hui</p>}
          {s.dueTomorrow > 0 && <p style={{ color: '#f97316', fontSize: '0.82rem' }}>◐ {s.dueTomorrow} à livrer demain</p>}
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map(k => (
          <Link key={k.label} href={k.href} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 14, padding: '20px 22px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16, transition: 'transform 0.15s', opacity: stats ? 1 : 0.5 }}>
            <div style={{ width: 44, height: 44, background: `${k.color}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p style={{ color: k.color, fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{k.value}</p>
              <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 600, marginTop: 3 }}>{k.label}</p>
              <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', marginTop: 1 }}>{k.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Urgent */}
          <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>Priorités du jour</p>
              <Link href="/productions" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', textDecoration: 'none' }}>Tout voir →</Link>
            </div>
            {(s.urgentProds as any[]).length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                <p style={{ color: '#22c55e', fontSize: '0.82rem' }}>✓ Aucune urgence aujourd&apos;hui</p>
              </div>
            ) : (
              (s.urgentProds as any[]).map((p: any) => {
                const isOverdue = p.deadline && new Date(p.deadline) < new Date()
                return (
                  <Link key={p.id} href="/productions" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '11px 20px', borderBottom: '1px solid #191919', textDecoration: 'none', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>{p.title}</p>
                      <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', marginTop: 1 }}>{p.client} · {p.assignedTo?.name || '—'}</p>
                    </div>
                    <span style={{ background: `${STATUS_COLORS[p.status] || '#6b7280'}15`, color: STATUS_COLORS[p.status] || '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{STATUS_LABELS[p.status] || p.status}</span>
                    <span style={{ color: isOverdue ? '#ef4444' : '#eab308', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(p.deadline)}</span>
                  </Link>
                )
              })
            )}
          </div>

          {/* Recent */}
          <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>Dernières prestations</p>
              <Link href="/productions" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', textDecoration: 'none' }}>Tout voir →</Link>
            </div>
            {(s.recentProds as any[]).map((p: any) => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '11px 20px', borderBottom: '1px solid #191919', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 500 }}>{p.title}</p>
                  <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', marginTop: 1 }}>{p.client}</p>
                </div>
                <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.72rem' }}>{p.assignedTo?.name || '—'}</p>
                <span style={{ background: `${STATUS_COLORS[p.status] || '#6b7280'}15`, color: STATUS_COLORS[p.status] || '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e1e' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>Activité récente</p>
          </div>
          {(s.recentActivity as any[]).length === 0 ? (
            <p style={{ color: 'rgba(240,235,227,0.2)', padding: '24px 16px', textAlign: 'center', fontSize: '0.78rem' }}>Aucune activité</p>
          ) : (
            (s.recentActivity as any[]).map((a: any, i: number) => (
              <div key={a.id} style={{ padding: '10px 16px', borderBottom: i < s.recentActivity.length - 1 ? '1px solid #191919' : 'none' }}>
                <p style={{ color: 'rgba(240,235,227,0.65)', fontSize: '0.75rem' }}>
                  <strong style={{ color: '#f0ebe3' }}>{a.actorName}</strong>{' '}{a.action}{a.target ? <span style={{ color: 'rgba(240,235,227,0.4)' }}> — {a.target}</span> : null}
                </p>
                <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.65rem', marginTop: 2 }}>{fmt(a.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
