'use client'
import { useEffect, useState } from 'react'
import { useCached } from '@/lib/useCached'

// Achievements grid + XP history + sober-mode toggle (profile pages)
export default function Badges() {
  const { data } = useCached<any>('gamify', '/api/gamify/me')
  const [sober, setSober] = useState(false)

  useEffect(() => { setSober(localStorage.getItem('mode-sobre') === '1') }, [])

  function toggleSober() {
    const next = !sober
    setSober(next)
    localStorage.setItem('mode-sobre', next ? '1' : '0')
  }

  if (!data || data.error) return null
  const unlocked = data.achievements || []
  const locked = data.locked || []

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 24, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>
          🏆 Succès <span style={{ color: 'rgba(240,235,227,0.3)', fontWeight: 400 }}>({unlocked.length}/{unlocked.length + locked.length})</span>
        </p>
        <button onClick={toggleSober} style={{ background: 'rgba(240,235,227,0.04)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 7, padding: '5px 12px', color: 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.68rem' }}>
          {sober ? '🎮 Réactiver la gamification' : '🧘 Mode sobre'}
        </button>
      </div>

      {!sober && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 18 }}>
            {unlocked.map((a: any) => (
              <div key={a.key} title={`Débloqué le ${new Date(a.unlockedAt).toLocaleDateString('fr-FR')}`} style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: 4 }}>{a.emoji}</p>
                <p style={{ color: '#fde68a', fontSize: '0.68rem', fontWeight: 700, lineHeight: 1.3 }}>{a.label}</p>
              </div>
            ))}
            {locked.map((a: any) => (
              <div key={a.key} title="Pas encore débloqué…" style={{ background: 'rgba(240,235,227,0.015)', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 12px', opacity: 0.45 }}>
                <p style={{ fontSize: '1.2rem', marginBottom: 4, filter: 'grayscale(1)' }}>{a.emoji}</p>
                <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem', fontWeight: 600, lineHeight: 1.3 }}>{a.label}</p>
              </div>
            ))}
          </div>

          {(data.recentEvents || []).length > 0 && (
            <div>
              <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Derniers XP gagnés</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.recentEvents.slice(0, 6).map((e: any) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.74rem' }}>{e.reason}</p>
                    <p style={{ color: '#a78bfa', fontSize: '0.74rem', fontWeight: 700 }}>+{e.amount} XP</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
