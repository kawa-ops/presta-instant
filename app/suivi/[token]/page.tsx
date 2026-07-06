import { prisma } from '@/lib/prisma'
import Timeline from '@/components/Timeline'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Public client-facing tracking page — accessible via secret link only.
// Shows ONLY: title, client, timeline progress. No prices, no names, no notes.
export default async function SuiviPage({ params }: { params: { token: string } }) {
  const prod = await db.production.findUnique({
    where: { shareToken: params.token },
    select: { title: true, client: true, status: true, deadline: true },
  }).catch(() => null)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
          <svg viewBox="0 0 100 100" width="22" height="22" fill="#f0ebe3">
            <path d="M12,52 C12,52 48,46 58,22 C58,22 54,50 78,42 C78,42 60,52 68,76 C68,76 52,58 28,72 C28,72 42,52 12,52 Z"/>
            <path d="M74,26 C74,26 79,22 83,18 C83,18 81,24 87,22 C87,22 81,27 83,33 C83,33 77,27 71,31 C71,31 75,26 74,26 Z"/>
          </svg>
          <span style={{ color: '#f0ebe3', fontWeight: 800, fontSize: '1.2rem' }}>instant.</span>
        </div>

        {!prod ? (
          <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.9rem' }}>Lien de suivi introuvable ou expiré.</p>
          </div>
        ) : (
          <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 16, padding: 32 }}>
            <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Suivi de production</p>
            <h1 style={{ color: '#f0ebe3', fontSize: '1.3rem', fontWeight: 800 }}>{prod.title}</h1>
            <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.82rem', marginTop: 4, marginBottom: 28 }}>
              {prod.client}
              {prod.deadline ? ` · livraison prévue le ${new Date(prod.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}
            </p>

            <Timeline status={prod.status} isFreelance={false} />

            {prod.status === 'valide' && (
              <p style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 700, marginTop: 24, textAlign: 'center' }}>🎉 Projet livré et terminé</p>
            )}
          </div>
        )}

        <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.7rem', textAlign: 'center', marginTop: 20 }}>
          instant. — production vidéo & photo · Toulouse
        </p>
      </div>
    </div>
  )
}
