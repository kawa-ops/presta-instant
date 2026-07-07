'use client'
import { useState } from 'react'
import { useCached } from '@/lib/useCached'

const STATUS_COLORS: Record<string, string> = { a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308', revisions: '#f97316', livre: '#a78bfa', envoye_client: '#38bdf8', retours_client: '#f43f5e', valide: '#22c55e' }
const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', revisions: 'Retours à faire', livre: 'À valider', envoye_client: 'Envoyé client', retours_client: 'Retours client', valide: 'Terminé' }
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SemainePage() {
  const { data, mutate } = useCached<any>('semaine', '/api/semaine')
  const thisWeek: any[] = data?.thisWeek || []
  const overdue: any[] = data?.overdue || []
  const upcoming: any[] = data?.upcoming || []

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const [justMoved, setJustMoved] = useState<string | null>(null)

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const byDay: Record<string, any[]> = {}
  ;[...thisWeek, ...upcoming].forEach(p => {
    if (!p.deadline) return
    const k = p.deadline.slice(0, 10)
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(p)
  })

  // Drop a card on a day → move the deadline (optimistic, server sync in background)
  function moveTo(prodId: string, dateKey: string) {
    setDragOverDay(null)
    setDragId(null)
    const all = [...thisWeek, ...upcoming]
    const prod = all.find(p => p.id === prodId)
    if (!prod || prod.deadline?.slice(0, 10) === dateKey) return

    // Optimistic move in the cached data
    mutate(prev => {
      if (!prev) return prev
      const update = (list: any[]) => list.map((p: any) => p.id === prodId ? { ...p, deadline: `${dateKey}T00:00:00.000Z` } : p)
      return { ...prev, thisWeek: update(prev.thisWeek || []), upcoming: update(prev.upcoming || []) }
    })
    setJustMoved(prodId)
    setTimeout(() => setJustMoved(null), 900)

    // Persist — the API also fires the WhatsApp "deadline modifiée" alert
    fetch(`/api/productions/${prodId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deadline: dateKey }),
    }).catch(() => {})
  }

  function Card({ p, dimmed }: { p: any; dimmed?: boolean }) {
    const isDragging = dragId === p.id
    const moved = justMoved === p.id
    return (
      <div
        draggable
        onDragStart={e => { setDragId(p.id); e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move' }}
        onDragEnd={() => { setDragId(null); setDragOverDay(null) }}
        style={{
          background: moved ? 'rgba(34,197,94,0.12)' : '#191919',
          border: `1px solid ${moved ? 'rgba(34,197,94,0.4)' : '#232323'}`,
          borderLeft: `3px solid ${STATUS_COLORS[p.status] || '#6b7280'}`,
          borderRadius: 8, padding: '9px 11px', marginBottom: 6,
          opacity: isDragging ? 0.35 : dimmed ? 0.8 : 1,
          cursor: 'grab',
          transition: 'background 0.4s, border-color 0.4s, opacity 0.15s',
        }}
      >
        <p style={{ color: '#f0ebe3', fontSize: '0.76rem', fontWeight: 600, lineHeight: 1.3 }}>{p.title}</p>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.66rem', marginTop: 2 }}>{p.client}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ background: `${STATUS_COLORS[p.status] || '#6b7280'}18`, color: STATUS_COLORS[p.status] || '#6b7280', padding: '1px 7px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span>
          <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>{p.assignedTo?.name || 'Lucas'}</span>
        </div>
      </div>
    )
  }

  function WeekGrid({ weekIndex }: { weekIndex: number }) {
    const isCurrent = weekIndex === 0
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() + 7 * weekIndex)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i)
      return d
    })
    const weekEnd = days[6]
    const weekCount = days.reduce((a, d) => a + (byDay[dayKey(d)]?.length || 0), 0)
    const loadColor = weekCount >= 8 ? '#ef4444' : weekCount >= 5 ? '#f97316' : weekCount >= 1 ? '#a78bfa' : 'rgba(240,235,227,0.2)'

    return (
      <div style={{ marginBottom: isCurrent ? 28 : 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <p style={{ color: isCurrent ? '#a78bfa' : 'rgba(240,235,227,0.55)', fontSize: isCurrent ? '0.9rem' : '0.78rem', fontWeight: 800 }}>
            {isCurrent ? 'Semaine en cours' : `Semaine +${weekIndex}`}
          </p>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem' }}>
            {weekStart.getDate()} {MONTHS[weekStart.getMonth()]} → {weekEnd.getDate()} {MONTHS[weekEnd.getMonth()]}
          </p>
          <span style={{ color: loadColor, fontSize: '0.7rem', fontWeight: 700 }}>
            {weekCount} deadline{weekCount > 1 ? 's' : ''}{weekCount >= 8 ? ' — à déléguer' : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, opacity: isCurrent ? 1 : 0.85 }}>
          {days.map((d, i) => {
            const k = dayKey(d)
            const items = byDay[k] || []
            const isToday = isCurrent && i === 0
            const isDropTarget = dragOverDay === k
            return (
              <div
                key={i}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverDay !== k) setDragOverDay(k) }}
                onDragLeave={e => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragOverDay(prev => prev === k ? null : prev) }}
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) moveTo(id, k) }}
                style={{
                  background: isDropTarget ? 'rgba(167,139,250,0.08)' : '#141414',
                  border: `1px ${isDropTarget ? 'dashed rgba(167,139,250,0.6)' : `solid ${isToday ? 'rgba(167,139,250,0.3)' : '#222'}`}`,
                  borderRadius: 12, overflow: 'hidden', minHeight: isCurrent ? 180 : 110,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <div style={{ padding: '9px 10px', borderBottom: '1px solid #1e1e1e', background: isToday ? 'rgba(167,139,250,0.06)' : 'transparent' }}>
                  <p style={{ color: isToday ? '#a78bfa' : isCurrent ? '#f0ebe3' : 'rgba(240,235,227,0.55)', fontSize: '0.7rem', fontWeight: 700 }}>{DAYS[d.getDay()]}</p>
                  <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem', marginTop: 1 }}>{d.getDate()} {MONTHS[d.getMonth()]}{isToday ? " · aujourd'hui" : ''}</p>
                </div>
                <div style={{ padding: 7, minHeight: 40 }}>
                  {items.length === 0 ? (
                    <p style={{ color: isDropTarget ? 'rgba(167,139,250,0.5)' : 'rgba(240,235,227,0.12)', fontSize: '0.66rem', textAlign: 'center', padding: '10px 0' }}>
                      {isDropTarget ? 'Déposer ici' : '—'}
                    </p>
                  ) : items.map(p => <Card key={p.id} p={p} dimmed={!isCurrent} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.5rem', fontWeight: 800 }}>Mon planning</h1>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.8rem', marginTop: 3 }}>Glisse-dépose une carte sur un autre jour pour déplacer sa deadline</p>
      </div>

      {overdue.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <p style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 700, marginBottom: 10 }}>⚠ {overdue.length} prestation{overdue.length > 1 ? 's' : ''} en retard</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {overdue.map(p => (
              <div key={p.id} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 11px' }}>
                <span style={{ color: '#f0ebe3', fontSize: '0.74rem', fontWeight: 600 }}>{p.title}</span>
                <span style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.66rem', marginLeft: 6 }}>{p.assignedTo?.name || 'Lucas'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {[0, 1, 2, 3, 4].map(w => <WeekGrid key={w} weekIndex={w} />)}
    </div>
  )
}
