'use client'
import Link from 'next/link'
import { useCached } from '@/lib/useCached'

const STATUS_COLORS: Record<string, string> = { a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308', livre: '#a78bfa', valide: '#22c55e' }
const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', livre: 'Livré', valide: 'Validé' }
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

function dayKey(d: Date) { return d.toISOString().slice(0, 10) }

export default function SemainePage() {
  const { data } = useCached<any>('semaine', '/api/semaine')
  const thisWeek: any[] = data?.thisWeek || []
  const overdue: any[] = data?.overdue || []

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
        <h1 style={{ color: '#f0ebe3', fontSize: '1.5rem', fontWeight: 800 }}>Ma semaine</h1>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.8rem', marginTop: 3 }}>Les prestations à livrer sur les 7 prochains jours</p>
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
    </div>
  )
}
