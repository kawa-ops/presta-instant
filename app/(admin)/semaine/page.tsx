'use client'
import Link from 'next/link'
import { useCached } from '@/lib/useCached'

const STATUS_COLORS: Record<string, string> = { a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308', revisions: '#f97316', livre: '#a78bfa', envoye_client: '#38bdf8', retours_client: '#f43f5e', valide: '#22c55e' }
const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', revisions: 'Retours à faire', livre: 'À valider', envoye_client: 'Envoyé client', retours_client: 'Retours client', valide: 'Terminé' }
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

function dayKey(d: Date) { return d.toISOString().slice(0, 10) }

export default function SemainePage() {
  const { data } = useCached<any>('semaine', '/api/semaine')
  const thisWeek: any[] = data?.thisWeek || []
  const overdue: any[] = data?.overdue || []
  const upcoming: any[] = data?.upcoming || []

  // Build 7 day-columns starting today
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + i)
    return d
  })

  const byDay: Record<string, any[]> = {}
  thisWeek.forEach(p => {
    if (!p.deadline) return
    const k = p.deadline.slice(0, 10)
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(p)
  })

  function Card({ p }: { p: any }) {
    return (
      <Link href="/productions" style={{ display: 'block', background: '#191919', border: '1px solid #232323', borderLeft: `3px solid ${STATUS_COLORS[p.status] || '#6b7280'}`, borderRadius: 8, padding: '9px 11px', textDecoration: 'none', marginBottom: 6 }}>
        <p style={{ color: '#f0ebe3', fontSize: '0.76rem', fontWeight: 600, lineHeight: 1.3 }}>{p.title}</p>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.66rem', marginTop: 2 }}>{p.client}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ background: `${STATUS_COLORS[p.status] || '#6b7280'}18`, color: STATUS_COLORS[p.status] || '#6b7280', padding: '1px 7px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span>
          <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>{p.assignedTo?.name || 'Lucas'}</span>
        </div>
      </Link>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.5rem', fontWeight: 800 }}>Mon planning</h1>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.8rem', marginTop: 3 }}>La semaine en cours en détail, et la charge du mois à venir</p>
      </div>

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <p style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 700, marginBottom: 10 }}>⚠ {overdue.length} prestation{overdue.length > 1 ? 's' : ''} en retard</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {overdue.map(p => (
              <Link key={p.id} href="/productions" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 11px', textDecoration: 'none' }}>
                <span style={{ color: '#f0ebe3', fontSize: '0.74rem', fontWeight: 600 }}>{p.title}</span>
                <span style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.66rem', marginLeft: 6 }}>{p.assignedTo?.name || 'Lucas'}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 7-day columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {days.map((d, i) => {
          const items = byDay[dayKey(d)] || []
          const isToday = i === 0
          return (
            <div key={i} style={{ background: '#141414', border: `1px solid ${isToday ? 'rgba(167,139,250,0.3)' : '#222'}`, borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
              <div style={{ padding: '10px 11px', borderBottom: '1px solid #1e1e1e', background: isToday ? 'rgba(167,139,250,0.06)' : 'transparent' }}>
                <p style={{ color: isToday ? '#a78bfa' : '#f0ebe3', fontSize: '0.72rem', fontWeight: 700 }}>{DAYS[d.getDay()]}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.64rem', marginTop: 1 }}>{d.getDate()} {MONTHS[d.getMonth()]}{isToday ? " · aujourd'hui" : ''}</p>
              </div>
              <div style={{ padding: 8 }}>
                {items.length === 0 ? (
                  <p style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.68rem', textAlign: 'center', padding: '16px 0' }}>—</p>
                ) : items.map(p => <Card key={p.id} p={p} />)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Capacity planning — next 4 weeks */}
      <div style={{ marginTop: 28 }}>
        <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Charge des semaines à venir</p>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 4 }, (_, w) => {
            const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() + 7 * (w + 1))
            const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
            const items = upcoming.filter(p => {
              if (!p.deadline) return false
              const d = new Date(p.deadline)
              return d >= weekStart && d <= new Date(weekEnd.getTime() + 86399999)
            })
            const count = items.length
            // Bar scaled against a "comfortable" load of 8 deadlines/week
            const pct = Math.min(100, (count / 8) * 100)
            const barColor = count >= 8 ? '#ef4444' : count >= 5 ? '#f97316' : count >= 1 ? '#a78bfa' : '#2a2a2a'
            const label = `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} → ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]}`
            return (
              <div key={w}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 700 }}>Semaine +{w + 1} <span style={{ color: 'rgba(240,235,227,0.3)', fontWeight: 400, fontSize: '0.68rem' }}>· {label}</span></p>
                  <p style={{ color: barColor === '#2a2a2a' ? 'rgba(240,235,227,0.25)' : barColor, fontSize: '0.75rem', fontWeight: 800 }}>
                    {count} deadline{count > 1 ? 's' : ''}{count >= 8 ? ' — surchargée, à déléguer' : count >= 5 ? ' — chargée' : ''}
                  </p>
                </div>
                <div style={{ height: 8, background: '#1c1c1c', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(pct, count > 0 ? 6 : 0)}%`, background: `linear-gradient(90deg, ${barColor}90, ${barColor})`, borderRadius: 6, transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>
                {count > 0 && (
                  <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem', marginTop: 4, lineHeight: 1.5 }}>
                    {items.slice(0, 4).map(p => p.title).join(' · ')}{count > 4 ? ` · +${count - 4} autres` : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
