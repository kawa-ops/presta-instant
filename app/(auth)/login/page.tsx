'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <svg viewBox="0 0 100 100" width="24" height="24" fill="#f0ebe3">
              <path d="M12,52 C12,52 48,46 58,22 C58,22 54,50 78,42 C78,42 60,52 68,76 C68,76 52,58 28,72 C28,72 42,52 12,52 Z"/>
              <path d="M74,26 C74,26 79,22 83,18 C83,18 81,24 87,22 C87,22 81,27 83,33 C83,33 77,27 71,31 C71,31 75,26 74,26 Z"/>
            </svg>
            <span style={{ color: '#f0ebe3', fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-syne), sans-serif' }}>instant.</span>
          </div>
          <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.8rem' }}>Gestion post-production</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 16, padding: 32 }}>
          <h1 style={{ color: '#f0ebe3', fontSize: '1.1rem', fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>Connexion</h1>

          {error && (
            <div style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fb7185', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={LS}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={IN} placeholder="votre@email.com" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={LS}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={IN} placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontSize: '0.9rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

const LS: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }
const IN: React.CSSProperties = { width: '100%', background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '10px 14px', color: '#f0ebe3', fontSize: '0.85rem' }
