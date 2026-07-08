'use client'
import { useState } from 'react'

// Profile frame system v3 — the new ornament pack (Prestige 0 → 10) ships with
// a transparent circular opening. The photo sits UNDER the frame, clipped to a
// centered circle, and shows through the opening. No stretching: 1:1 assets.

export function ornamentTier(level: number): number {
  return Math.min(10, Math.floor(level / 2))
}

// Asset file per tier (tier 1 asset doesn't exist in the pack → reuse tier 0)
function tierFile(tier: number): string {
  const n = tier === 1 ? 0 : tier
  return `/ornaments/Prestige_${String(n).padStart(2, '0')}.png`
}

// Diameter of the circular opening, as a fraction of the ornament box.
// Default tuned for the pack; per-tier overrides if an opening differs.
const OPENING: Record<number, number> = { 0: 0.56, 2: 0.55, 3: 0.55, 4: 0.54, 5: 0.54, 6: 0.53, 7: 0.53, 8: 0.52, 9: 0.52, 10: 0.5 }

export default function Avatar({ url, name, level = 0, size = 40, ringSpeed }: {
  url?: string | null; name?: string; level?: number; size?: number; ringSpeed?: number
}) {
  const [ornamentOk, setOrnamentOk] = useState(true)
  const tier = ornamentTier(level)
  const opening = OPENING[tier === 1 ? 0 : tier] ?? 0.55
  const initial = name?.charAt(0)?.toUpperCase() || '✦'
  const prestige = Math.floor(level / 20)

  // Fallback: classic animated ring when the asset is missing
  if (!ornamentOk) {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: prestige >= 1 ? 'conic-gradient(#eab308, #ec4899, #a78bfa, #eab308)' : 'conic-gradient(#a78bfa, #c7d2fe, #a78bfa)',
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
      </div>
    )
  }

  const d = size * opening
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Photo — centered circle, visible through the ornament's opening */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: d, height: d, borderRadius: '50%', overflow: 'hidden',
        background: 'linear-gradient(135deg, #2a1d52, #141021)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1,
      }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: d * 0.42, fontWeight: 900, background: 'linear-gradient(135deg, #c4b5fd, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{initial}</span>
        )}
      </div>
      {/* Ornament frame on top — 1:1, never stretched */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tierFile(tier)}
        alt=""
        onError={() => setOrnamentOk(false)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2, pointerEvents: 'none' }}
      />
    </div>
  )
}
