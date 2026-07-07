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

export default function LiveNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([])
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

  if (toasts.length === 0) return null

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
