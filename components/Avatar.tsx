'use client'
import { useState } from 'react'

// Shared avatar with level-based ornament frame.
// Ornament PNGs live in /public/ornaments/Prestige_01.png … Prestige_10.png
// (top-left = lowest, bottom-right = highest). Falls back to the animated
// conic ring when the asset is missing.

export function ornamentTier(level: number): number {
  // One new ornament every 2 levels — all 10 unlocked by level 18
  return Math.min(10, Math.floor(level / 2) + 1)
}

export default function Avatar({ url, name, level = 0, size = 40, ringSpeed }: {
  url?: string | null; name?: string; level?: number; size?: number; ringSpeed?: number
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const tier = ornamentTier(level)
  const ornamentSrc = `/ornaments/Prestige_${String(tier).padStart(2, '0')}.png`
  const initial = name?.charAt(0)?.toUpperCase() || '✦'
  const prestige = Math.floor(level / 20)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Fallback ring (always under the ornament) */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: prestige >= 2
          ? 'conic-gradient(#eab308, #ec4899, #a78bfa, #eab308)'
          : prestige >= 1
            ? 'conic-gradient(#ec4899, #a78bfa, #c7d2fe, #ec4899)'
            : 'conic-gradient(#a78bfa, #c7d2fe, #a78bfa)',
        animation: ringSpeed ? `ring-spin ${ringSpeed}s linear infinite` : 'none',
      }} />
      <div style={{ position: 'absolute', inset: Math.max(2, size * 0.035), borderRadius: '50%', background: '#141021', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: size * 0.4, fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{initial}</span>
        )}
      </div>
      {/* Level ornament frame — hides itself if the asset isn't uploaded yet */}
      {!imgFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ornamentSrc}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ position: 'absolute', inset: `-${size * 0.28}px`, width: `${size * 1.56}px`, height: `${size * 1.56}px`, pointerEvents: 'none', objectFit: 'contain' }}
        />
      )}
    </div>
  )
}
