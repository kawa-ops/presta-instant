'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Badges from '@/components/Badges'
import AvatarUpload from '@/components/AvatarUpload'
import Avatar from '@/components/Avatar'
import { ACHIEVEMENTS } from '@/lib/achievements'

const PIN: React.CSSProperties = { background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.8rem' }

// Admin-only: leaderboard management — every user with inline XP adjustments & badge grants
function RankingManager() {
  const [users, setUsers] = useState<any[]>([])
  const [customs, setCustoms] = useState<any[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [badgeKey, setBadgeKey] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const [d, c] = await Promise.all([
      fetch('/api/gamify/leaderboard').then(r => r.json()).catch(() => []),
      fetch('/api/gamify/achievements').then(r => r.json()).catch(() => []),
    ])
    if (Array.isArray(d)) setUsers(d)
    if (Array.isArray(c)) setCustoms(c)
  }
  useEffect(() => { load() }, [])

  async function applyLevel(userId: string) {
    if (delta === '' || isNaN(parseInt(delta))) return
    const res = await fetch('/api/gamify/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, setLevel: parseInt(delta) }) })
    setMsg(res.ok ? `✓ Niveau ${delta} appliqué` : 'Erreur')
    setDelta(''); setEditing(null)
    setTimeout(() => setMsg(''), 2500)
    load()
    window.dispatchEvent(new CustomEvent('live-refresh'))
  }

  async function applyPrestige(userId: string, prestige: number) {
    const res = await fetch('/api/gamify/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, setLevel: prestige * 20 }) })
    setMsg(res.ok ? `✓ Prestige ${prestige} appliqué (Niv. ${prestige * 20})` : 'Erreur')
    setEditing(null)
    setTimeout(() => setMsg(''), 2500)
    load()
    window.dispatchEvent(new CustomEvent('live-refresh'))
  }

  async function grantBadge(userId: string) {
    if (!badgeKey) return
    const res = await fetch('/api/gamify/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, achievementKey: badgeKey }) })
    setMsg(res.ok ? '✓ Succès attribué' : 'Erreur')
    setBadgeKey(''); setEditing(null)
    setTimeout(() => setMsg(''), 2500)
    window.dispatchEvent(new CustomEvent('live-refresh'))
  }

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20 }}>
      <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>🏆 Gestion du classement</p>
      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.72rem', marginBottom: 14 }}>Toute l&apos;équipe — ajuste l&apos;XP (le niveau, rang et prestige suivent) ou attribue un succès.</p>
      {msg && <p style={{ color: '#6ee7b7', fontSize: '0.75rem', marginBottom: 10, fontWeight: 700 }}>{msg}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {users.map(u => (
          <div key={u.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid rgba(167,139,250,0.1)' }}>
              <Avatar url={u.profilePicUrl} name={u.name} level={u.level} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 700 }}>{u.name} <span style={{ color: 'rgba(240,235,227,0.3)', fontWeight: 400, fontSize: '0.66rem' }}>({u.role === 'admin' ? 'admin' : 'prestataire'})</span></p>
                <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.64rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.rank}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#c4b5fd', fontSize: '0.74rem', fontWeight: 900 }}>Niv. {u.level}{u.prestige > 0 ? ` · P${u.prestige}` : ''}</p>
                <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.6rem' }}>{u.xp} XP · {u.productions} prod.</p>
              </div>
              <button onClick={() => { setEditing(editing === u.id ? null : u.id); setDelta(''); setBadgeKey('') }} style={{ background: editing === u.id ? 'rgba(167,139,250,0.2)' : 'rgba(240,235,227,0.05)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 7, padding: '5px 10px', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.72rem' }}>✏️</button>
            </div>

            {editing === u.id && (
              <div style={{ padding: '12px 14px', background: 'rgba(167,139,250,0.04)', borderRadius: 10, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Level control */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', width: 70 }}>Niveau</p>
                  <input type="number" min="0" max="99" style={{ ...PIN, width: 80 }} value={delta} onChange={e => setDelta(e.target.value)} placeholder={`${u.level}`} />
                  <button onClick={() => applyLevel(u.id)} style={{ background: 'linear-gradient(135deg, #a78bfa, #ec4899)', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 800, cursor: 'pointer', fontSize: '0.72rem' }}>Définir le niveau</button>
                </div>

                {/* Prestige control with real ornament thumbnails */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', width: 70 }}>Prestige</p>
                  {[0, 1, 2, 3].map(pr => {
                    const tier = Math.min(10, Math.floor((pr * 20) / 2))
                    const file = tier === 1 ? 0 : tier
                    const active = u.prestige === pr
                    return (
                      <button key={pr} onClick={() => applyPrestige(u.id, pr)} title={`Prestige ${pr} (Niv. ${pr * 20})`} style={{
                        background: active ? 'rgba(234,179,8,0.15)' : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${active ? 'rgba(234,179,8,0.5)' : 'rgba(167,139,250,0.2)'}`,
                        borderRadius: 10, padding: 6, cursor: 'pointer', textAlign: 'center',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/ornaments/Prestige_${String(file).padStart(2, '0')}.png`} alt="" style={{ width: 40, height: 40, objectFit: 'contain', display: 'block' }} />
                        <span style={{ color: active ? '#eab308' : 'rgba(240,235,227,0.4)', fontSize: '0.6rem', fontWeight: 800 }}>P{pr}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Achievement grant — every built-in + custom achievement */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', width: 70 }}>Succès</p>
                  <select style={{ ...PIN, flex: 1, minWidth: 180 }} value={badgeKey} onChange={e => setBadgeKey(e.target.value)}>
                    <option value="">— Choisir un succès —</option>
                    <optgroup label="Succès du système">
                      {Object.entries(ACHIEVEMENTS).map(([key, a]) => (
                        <option key={key} value={key}>{a.emoji} {a.label} (+{a.xp} XP)</option>
                      ))}
                    </optgroup>
                    {customs.length > 0 && (
                      <optgroup label="Succès personnalisés">
                        {customs.map(c => <option key={c.id} value={`custom_${c.id}`}>{c.emoji} {c.label} (+{c.xp} XP)</option>)}
                      </optgroup>
                    )}
                  </select>
                  <button onClick={() => grantBadge(u.id)} disabled={!badgeKey} style={{ background: badgeKey ? 'rgba(234,179,8,0.15)' : 'rgba(240,235,227,0.04)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 8, padding: '8px 14px', color: badgeKey ? '#eab308' : 'rgba(240,235,227,0.25)', cursor: badgeKey ? 'pointer' : 'default', fontWeight: 800, fontSize: '0.72rem' }}>🏅 Attribuer</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Admin-only: create new achievements without touching code
function AchievementCreator() {
  const [form, setForm] = useState({ emoji: '🏅', label: '', description: '', xp: '25' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!form.label.trim()) return
    setSaving(true)
    const res = await fetch('/api/gamify/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setMsg(res.ok ? `✓ Succès "${form.label}" créé — attribuable depuis la Gestion du classement` : 'Erreur')
    if (res.ok) setForm({ emoji: '🏅', label: '', description: '', xp: '25' })
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: 20 }}>
      <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>✨ Créer un succès</p>
      <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.72rem', marginBottom: 14 }}>Le succès rejoint le système immédiatement — attribue-le ensuite depuis la Gestion du classement.</p>
      {msg && <p style={{ color: '#6ee7b7', fontSize: '0.75rem', marginBottom: 10, fontWeight: 700 }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input style={{ ...PIN, width: 56, textAlign: 'center' }} value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🏅" />
        <input style={{ ...PIN, flex: 1, minWidth: 140 }} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Nom du succès" />
        <input type="number" style={{ ...PIN, width: 90 }} value={form.xp} onChange={e => setForm(f => ({ ...f, xp: e.target.value }))} placeholder="XP" />
      </div>
      <input style={{ ...PIN, width: '100%', marginTop: 8, boxSizing: 'border-box' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description / condition de déblocage (ex : 5 livraisons sans révision)" />
      <button onClick={create} disabled={saving || !form.label.trim()} style={{ marginTop: 10, background: form.label.trim() ? 'linear-gradient(135deg, #a78bfa, #ec4899)' : 'rgba(240,235,227,0.06)', color: form.label.trim() ? '#0a0a0a' : 'rgba(240,235,227,0.3)', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 800, cursor: form.label.trim() ? 'pointer' : 'default', fontSize: '0.78rem' }}>
        {saving ? 'Création…' : 'Créer le succès'}
      </button>
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

        <RankingManager />
        <AchievementCreator />

        {/* Succès & XP admin */}
        <Badges />
      </div>
    </div>
  )
}
