'use client'
import { useState } from 'react'

// Game-quality profile frame system.
// The ornament PNG is the frame; the photo is masked & clipped INSIDE its
// inner window (hexagon/diamond), like Discord / LoL / Clash Royale frames.
// Falls back to the classic animated ring when assets are missing.

export function ornamentTier(level: number): number {
  return Math.min(10, Math.floor(level / 2) + 1)
}

// Inner-window geometry per ornament (percent of the ornament box).
// Tuned against the reference render of Prestige_01.
type Window = { l: number; t: number; w: number; h: number; shape: 'hex' | 'diamond' }
const WINDOWS: Record<number, Window> = {
  1:  { l: 30, t: 22, w: 40, h: 42, shape: 'hex' },
  2:  { l: 31, t: 20, w: 38, h: 38, shape: 'hex' },
  3:  { l: 32, t: 20, w: 36, h: 34, shape: 'diamond' },
  4:  { l: 31, t: 21, w: 38, h: 38, shape: 'hex' },
  5:  { l: 31, t: 19, w: 38, h: 36, shape: 'hex' },
  6:  { l: 32, t: 22, w: 36, h: 36, shape: 'hex' },
  7:  { l: 33, t: 18, w: 34, h: 34, shape: 'hex' },
  8:  { l: 33, t: 17, w: 34, h: 32, shape: 'diamond' },
  9:  { l: 33, t: 20, w: 34, h: 34, shape: 'hex' },
  10: { l: 34, t: 15, w: 32, h: 30, shape: 'diamond' },
}

const HEX_CLIP = 'polygon(50% 0%, 100% 26%, 100% 74%, 50% 100%, 0% 74%, 0% 26%)'
const DIAMOND_CLIP = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'

export default function Avatar({ url, name, level = 0, size = 40, ringSpeed }: {
  url?: string | null; name?: string; level?: number; size?: number; ringSpeed?: number
}) {
  const [ornamentOk, setOrnamentOk] = useState(true)
  const tier = ornamentTier(level)
  const win = WINDOWS[tier] || WINDOWS[1]
  const ornamentSrc = `/ornaments/Prestige_${String(tier).padStart(2, '0')}.png`
  const initial = name?.charAt(0)?.toUpperCase() || '✦'
  const prestige = Math.floor(level / 20)

  // ===== Fallback: classic animated ring (no ornament asset) =====
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

  // ===== Ornament frame: photo clipped inside the inner window =====
  const clip = win.shape === 'diamond' ? DIAMOND_CLIP : HEX_CLIP
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Ornament frame */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ornamentSrc}
        alt=""
        onError={() => setOrnamentOk(false)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, pointerEvents: 'none' }}
      />
      {/* Photo masked to the window, ABOVE the frame so baked emblems don't cover the face */}
      <div style={{
        position: 'absolute',
        left: `${win.l}%`, top: `${win.t}%`, width: `${win.w}%`, height: `${win.h}%`,
        clipPath: clip, WebkitClipPath: clip,
        overflow: 'hidden', zIndex: 2,
        background: url ? '#141021' : 'linear-gradient(135deg, #2a1d52, #141021)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: size * 0.18, fontWeight: 900, background: 'linear-gradient(135deg, #c4b5fd, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{initial}</span>
        )}
      </div>
    </div>
  )
}
