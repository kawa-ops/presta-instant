'use client'
import { useEffect, useState } from 'react'

// Mini-calendar (6 weeks) where the provider toggles their days off.
// Stored on User.unavailableDates as a JSON list of "YYYY-MM-DD".

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function UnavailabilityPicker() {
  const [off, setOff] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)

  useEffect(() => {
    fetch('/api/freelancers/me').then(r => r.json()).then(d => {
      try { setOff(new Set(JSON.parse(d?.unavailableDates || '[]'))) } catch {}
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  async function save(next: Set<string>) {
    setSaving(true)
    await fetch('/api/freelancers/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unavailableDates: JSON.stringify(Array.from(next).sort()) }),
    }).catch(() => {})
    setSaving(false)
    setSavedTick(true)
    setTimeout(() => setSavedTick(false), 1500)
  }

  function toggle(k: string) {
    setOff(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      save(next)
      return next
    })
  }

  // Grid: 6 weeks starting Monday of the current week
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const monday = new Date(today)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const weeks = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + w * 7 + i)
      return d
    })
  )

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>🏖 Mes disponibilités</p>
        {saving && <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.66rem' }}>Enregistrement…</span>}
        {savedTick && !saving && <span style={{ color: '#22c55e', fontSize: '0.66rem', fontWeight: 700 }}>✓ Enregistré</span>}
      </div>
      <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginBottom: 14 }}>
        Coche tes jours off — Axel et Lucas les verront au moment d&apos;assigner un projet.
      </p>

      {!loaded ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem' }}>Chargement…</p>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => <p key={d} style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.6rem', fontWeight: 700, textAlign: 'center' }}>{d}</p>)}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {week.map(d => {
                const k = key(d)
                const isOff = off.has(k)
                const isPast = d < today
                const isToday = k === key(today)
                return (
                  <button
                    key={k}
                    disabled={isPast}
                    onClick={() => toggle(k)}
                    title={isOff ? 'Off — cliquer pour redevenir dispo' : 'Dispo — cliquer pour me mettre off'}
                    style={{
                      padding: '6px 0', borderRadius: 7, cursor: isPast ? 'default' : 'pointer',
                      background: isOff ? 'rgba(251,113,133,0.18)' : 'rgba(0,0,0,0.25)',
                      border: `1px solid ${isOff ? 'rgba(251,113,133,0.5)' : isToday ? 'rgba(167,139,250,0.4)' : 'rgba(167,139,250,0.1)'}`,
                      color: isPast ? 'rgba(240,235,227,0.12)' : isOff ? '#fb7185' : 'rgba(240,235,227,0.6)',
                      fontSize: '0.68rem', fontWeight: isOff || isToday ? 800 : 500,
                      opacity: isPast ? 0.4 : 1, transition: 'all 0.12s',
                    }}
                  >
                    {d.getDate()}{d.getDate() === 1 ? ` ${MONTHS[d.getMonth()]}` : ''}
                  </button>
                )
              })}
            </div>
          ))}
          <p style={{ color: 'rgba(240,235,227,0.22)', fontSize: '0.62rem', marginTop: 6 }}>
            <span style={{ color: '#fb7185' }}>■</span> jour off · sauvegarde automatique à chaque clic
          </p>
        </div>
      )}
    </div>
  )
}
