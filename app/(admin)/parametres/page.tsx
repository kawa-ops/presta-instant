'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Badges from '@/components/Badges'
import AvatarUpload from '@/components/AvatarUpload'

// Admin-only: manually adjust XP / progression for any user (tests & rewards)
function XpAdjuster() {
  const [users, setUsers] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/gamify/leaderboard').then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setUsers(d); if (d.length) setUserId(d.find((u: any) => u.isMe)?.id || d[0].id) }
    }).catch(() => {})
  }, [])

  async function apply() {
    if (!userId || !delta || isNaN(parseInt(delta))) return
    const res = await fetch('/api/gamify/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, xp: parseInt(delta), reason }) })
    setMsg(res.ok ? `✓ ${parseInt(delta) > 0 ? '+' : ''}${delta} XP appliqués` : 'Erreur')
    setDelta(''); setReason('')
    setTimeout(() => setMsg(''), 3000)
    window.dispatchEvent(new CustomEvent('live-refresh'))
  }

  const IN: React.CSSProperties = { background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.8rem' }
  const selected = users.find(u => u.id === userId)

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20 }}>
      <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>🎮 Ajustements de progression</p>
      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.72rem', marginBottom: 14 }}>Ajoute ou retire de l&apos;XP à n&apos;importe qui (tests, récompenses, corrections). Le niveau, rang et prestige se recalculent automatiquement.</p>
      {msg && <p style={{ color: '#6ee7b7', fontSize: '0.75rem', marginBottom: 10, fontWeight: 700 }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={{ ...IN, minWidth: 160 }} value={userId} onChange={e => setUserId(e.target.value)}>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'admin' : 'presta'}) — Niv. {u.level}</option>)}
        </select>
        <input type="number" style={{ ...IN, width: 100 }} value={delta} onChange={e => setDelta(e.target.value)} placeholder="± XP" />
        <input style={{ ...IN, flex: 1, minWidth: 140 }} value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison (optionnelle)" />
        <button onClick={apply} style={{ background: 'linear-gradient(135deg, #a78bfa, #ec4899)', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>Appliquer</button>
      </div>
      {selected && <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', marginTop: 8 }}>{selected.name} : {selected.xp} XP · Niveau {selected.level} · {selected.rank}</p>}
    </div>
  )
}

export default function ParametresPage() {
  const { data: session } = useSession()

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800, marginBottom: 28 }}>Paramètres</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AvatarUpload />

        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20 }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Compte</p>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem' }}>{session?.user?.name} — {session?.user?.email}</p>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem', marginTop: 6 }}>Rôle : Administrateur</p>
        </div>

        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20 }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Gestion des prestataires</p>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem', marginBottom: 12 }}>Créez et gérez les accès prestataires depuis la page dédiée.</p>
          <Link href="/prestataires" style={{ background: '#f0ebe3', color: '#0a0a0a', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', display: 'inline-block' }}>
            Gérer les prestataires
          </Link>
        </div>

        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20 }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>instant. admin</p>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem', marginBottom: 10 }}>Accéder au panel d&apos;administration du site vitrine.</p>
          <a href="https://admin.instantmov.fr" target="_blank" rel="noreferrer" style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem', textDecoration: 'none', borderBottom: '1px solid rgba(240,235,227,0.15)' }}>
            admin.instantmov.fr ↗
          </a>
        </div>

        <div style={{ background: 'rgba(26,18,48,0.5)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 14, padding: 20 }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Base de données</p>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem' }}>Supabase — eu-central-1 · presta.instantmov.fr</p>
        </div>

        <XpAdjuster />

        {/* Succès & XP admin */}
        <Badges />
      </div>
    </div>
  )
}
