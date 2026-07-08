'use client'
import { useEffect, useRef, useState } from 'react'

// Polls unread notifications every 10s, shows toast pop-ups for new ones,
// and broadcasts a "live-refresh" event so open pages re-fetch their data.

type Toast = { id: string; message: string; type: string }

const ICONS: Record<string, string> = {
  task_completed: '✅', workflow: '🎬', invoice_uploaded: '📄',
  invoice_paid: '💰', task_validated: '✔', deadline_reminder: '⏰',
  new_task: '📩', nudge: '👋', levelup: '🆙', achievement: '🏆',
}
const GOLDEN = ['levelup', 'achievement']

// Full-screen level-up celebration — like unlocking a new rank in a modern game
function LevelUpOverlay({ level, onClose }: { level: number; onClose: () => void }) {
  const tier = Math.min(10, Math.floor(level / 2))
  const ornament = `/ornaments/Prestige_${String(tier === 1 ? 0 : tier).padStart(2, '0')}.png`
  const newOrnament = level % 2 === 0 // a new frame unlocks every 2 levels
  const confetti = Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.8,
    color: ['#a78bfa', '#ec4899', '#eab308', '#c7d2fe', '#f0ebe3'][i % 5],
    size: 5 + Math.random() * 6, dur: 2 + Math.random() * 1.5,
  }))
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10, 6, 24, 0.75)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'lvl-fade 0.3s ease both',
    }}>
      <style>{`
        @keyframes lvl-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lvl-pop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes lvl-fall { 0% { transform: translateY(-30px) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(540deg); opacity: 0; } }
        @keyframes lvl-glow { 0%, 100% { text-shadow: 0 0 30px rgba(167,139,250,0.6); } 50% { text-shadow: 0 0 60px rgba(236,72,153,0.9); } }
        @keyframes xp-burst { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-50px) scale(1.4); opacity: 0; } }
      `}</style>
      {confetti.map((c, i) => (
        <span key={i} style={{ position: 'fixed', top: 0, left: `${c.left}%`, width: c.size, height: c.size, background: c.color, borderRadius: 2, animation: `lvl-fall ${c.dur}s ease-in ${c.delay}s infinite` }} />
      ))}
      <div style={{ textAlign: 'center', animation: 'lvl-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) both', maxWidth: 420, padding: 24 }}>
        <p style={{ fontSize: '3rem', marginBottom: 4 }}>🎉</p>
        <p style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>Félicitations !</p>
        <p style={{ fontSize: '3.4rem', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'lvl-glow 2s ease-in-out infinite', lineHeight: 1.1 }}>
          Niveau {level}
        </p>
        <p style={{ color: '#c4b5fd', fontSize: '0.9rem', fontWeight: 700, marginTop: 6, animation: 'xp-burst 1.6s ease-out 0.5s both' }}>+ XP</p>
        {newOrnament && (
          <div style={{ marginTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ornament} alt="" style={{ width: 130, height: 130, objectFit: 'contain', filter: 'drop-shadow(0 0 24px rgba(167,139,250,0.5))' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.78rem', marginTop: 4 }}>Nouvel ornement débloqué !</p>
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 24, background: 'linear-gradient(135deg, #a78bfa, #ec4899)', color: '#0a0a0a', border: 'none', borderRadius: 14, padding: '14px 46px', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 8px 32px rgba(167,139,250,0.35)' }}>
          Continuer
        </button>
      </div>
    </div>
  )
}

export default function LiveNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    let stopped = false

    async function poll() {
      try {
        const data = await fetch('/api/notifications?unread=true', { cache: 'no-store' }).then(r => r.json())
        if (stopped || !Array.isArray(data)) return
        if (seen.current === null) {
          // First load: don't toast history, just remember it
          seen.current = new Set(data.map((n: any) => n.id))
          return
        }
        const fresh = data.filter((n: any) => !seen.current!.has(n.id))
        if (fresh.length > 0) {
          fresh.forEach((n: any) => seen.current!.add(n.id))
          // Level-up → full-screen celebration
          const lvl = fresh.find((n: any) => n.type === 'levelup')
          if (lvl) {
            const m = lvl.message.match(/Niveau (\d+)/)
            if (m) setLevelUp(parseInt(m[1]))
          }
          setToasts(t => [...t, ...fresh.slice(0, 3).map((n: any) => ({ id: n.id, message: n.message, type: n.type }))])
          // Tell open pages (dashboard, productions…) to re-fetch
          window.dispatchEvent(new CustomEvent('live-refresh'))
          // Auto-dismiss after 6s
          fresh.slice(0, 3).forEach((n: any) => {
            setTimeout(() => setToasts(t => t.filter(x => x.id !== n.id)), 6000)
          })
        }
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 10000)
    return () => { stopped = true; clearInterval(interval) }
  }, [])

  if (toasts.length === 0 && levelUp === null) return null

  if (levelUp !== null) {
    return <LevelUpOverlay level={levelUp} onClose={() => setLevelUp(null)} />
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
      <style>{`@keyframes toast-in { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      {toasts.map(t => {
        const golden = GOLDEN.includes(t.type)
        return (
          <div
            key={t.id}
            onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
            style={{
              background: golden ? 'linear-gradient(135deg, #2a2114, #1a1a1a)' : '#1a1a1a',
              border: `1px solid ${golden ? 'rgba(234,179,8,0.5)' : '#2e2e2e'}`,
              borderLeft: `3px solid ${golden ? '#eab308' : '#a78bfa'}`,
              borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
              boxShadow: golden ? '0 8px 28px rgba(234,179,8,0.15), 0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.5)',
              animation: 'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}
          >
            <span style={{ fontSize: golden ? '1.2rem' : '1rem', flexShrink: 0 }}>{ICONS[t.type] || '🔔'}</span>
            <p style={{ color: golden ? '#fde68a' : '#f0ebe3', fontSize: '0.78rem', lineHeight: 1.4, fontWeight: golden ? 700 : 400 }}>{t.message}</p>
          </div>
        )
      })}
    </div>
  )
}
