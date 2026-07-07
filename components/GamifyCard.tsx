'use client'
import { useEffect, useState } from 'react'
import { useCached } from '@/lib/useCached'

// Level / rank / streak card — shared by admin and freelancer dashboards.
// Hidden entirely when "mode sobre" is enabled (localStorage).
export default function GamifyCard({ compact = false }: { compact?: boolean }) {
  const { data, refresh } = useCached<any>('gamify', '/api/gamify/me')
  const [sober, setSober] = useState(false)

  useEffect(() => {
    setSober(localStorage.getItem('mode-sobre') === '1')
    const onRefresh = () => refresh()
    window.addEventListener('live-refresh', onRefresh)
    return () => window.removeEventListener('live-refresh', onRefresh)
  }, [refresh])

  if (sober || !data || data.error) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(199,210,254,0.05))',
      border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12,
      padding: compact ? '10px 16px' : '14px 20px', marginBottom: compact ? 16 : 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <p style={{ color: '#a78bfa', fontSize: compact ? '0.82rem' : '0.9rem', fontWeight: 800 }}>{data.rank}</p>
          <span style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '1px 9px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800 }}>Niv. {data.level}</span>
          {data.streak >= 2 && (
            <span title={`${data.streak} jours d'activité consécutifs`} style={{ color: '#e879f9', fontSize: '0.75rem', fontWeight: 800 }}>🔥{data.streak}</span>
          )}
        </div>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem', fontWeight: 600 }}>
          {data.xpInLevel} / {data.xpForNext} XP{data.nextRank ? ` · prochain rang : ${data.nextRank}` : ''}
          <span style={{ marginLeft: 10, color: 'rgba(240,235,227,0.25)' }}>· Studio Niv. {data.studioLevel}</span>
        </p>
      </div>
      <div style={{ height: 7, background: 'rgba(0,0,0,0.4)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(data.progress, 3)}%`, background: 'linear-gradient(90deg, #a78bfa, #38bdf8)', borderRadius: 6, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
    </div>
  )
}
