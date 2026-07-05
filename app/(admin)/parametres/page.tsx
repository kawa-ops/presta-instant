'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function ParametresPage() {
  const { data: session } = useSession()

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800, marginBottom: 28 }}>Paramètres</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: 20 }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Compte</p>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem' }}>{session?.user?.name} — {session?.user?.email}</p>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem', marginTop: 6 }}>Rôle : Administrateur</p>
        </div>

        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: 20 }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Gestion des prestataires</p>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem', marginBottom: 12 }}>Créez et gérez les accès prestataires depuis la page dédiée.</p>
          <Link href="/prestataires" style={{ background: '#f0ebe3', color: '#0a0a0a', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', display: 'inline-block' }}>
            Gérer les prestataires
          </Link>
        </div>

        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: 20 }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>instant. admin</p>
          <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem', marginBottom: 10 }}>Accéder au panel d&apos;administration du site vitrine.</p>
          <a href="https://admin.instantmov.fr" target="_blank" rel="noreferrer" style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem', textDecoration: 'none', borderBottom: '1px solid rgba(240,235,227,0.15)' }}>
            admin.instantmov.fr ↗
          </a>
        </div>

        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20 }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Base de données</p>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.72rem' }}>Supabase — eu-central-1 · presta.instantmov.fr</p>
        </div>
      </div>
    </div>
  )
}
