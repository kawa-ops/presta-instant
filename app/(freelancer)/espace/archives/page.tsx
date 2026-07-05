import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const db = prisma as any

function fmt(d: Date | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }

export default async function FreelancerArchives() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const prods = await db.production.findMany({
    where: { assignedToId: userId, status: 'valide' },
    orderBy: { updatedAt: 'desc' },
  }).catch(() => [])

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Archives</h1>
      {prods.length === 0 ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Aucune prestation validée pour le moment</p>
      ) : (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
          {prods.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'rgba(240,235,227,0.6)', fontSize: '0.82rem' }}>{p.title}</p>
                <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.7rem', marginTop: 2 }}>{p.client}</p>
              </div>
              {p.price && <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.78rem' }}>{p.price.toLocaleString('fr-FR')} €</p>}
              <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.72rem' }}>{fmt(p.updatedAt)}</p>
              <span style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 600 }}>✓</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
