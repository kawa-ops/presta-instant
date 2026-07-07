import { prisma } from '@/lib/prisma'
import PortalClient from './PortalClient'

export const dynamic = 'force-dynamic'
const db = prisma as any

// Public client-facing tracking portal — accessible via secret link only.
// Exposes ONLY: title, client, status, deadline, delivery link, milestone dates.
export default async function SuiviPage({ params }: { params: { token: string } }) {
  const prod = await db.production.findUnique({
    where: { shareToken: params.token },
    select: { id: true, title: true, client: true, status: true, deadline: true, deliveryLink: true, clientApprovedAt: true },
  }).catch(() => null)

  const [events, versionCount] = prod
    ? await Promise.all([
        // First time each status was reached, oldest first
        db.$queryRawUnsafe(
          `SELECT DISTINCT ON (status) id, status, "createdAt" FROM "ProductionEvent" WHERE "productionId" = $1 ORDER BY status, "createdAt" ASC`,
          prod.id
        ).then((rows: any[]) => rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())).catch(() => []),
        db.deliveryVersion.count({ where: { productionId: prod.id } }).catch(() => 0),
      ])
    : [[], 0]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0b1e 0%, #1e1338 45%, #170f2e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <svg viewBox="0 0 100 100" width="22" height="22" fill="#f0ebe3">
            <path d="M12,52 C12,52 48,46 58,22 C58,22 54,50 78,42 C78,42 60,52 68,76 C68,76 52,58 28,72 C28,72 42,52 12,52 Z"/>
            <path d="M74,26 C74,26 79,22 83,18 C83,18 81,24 87,22 C87,22 81,27 83,33 C83,33 77,27 71,31 C71,31 75,26 74,26 Z"/>
          </svg>
          <span style={{ color: '#f0ebe3', fontWeight: 800, fontSize: '1.2rem' }}>instant.</span>
        </div>

        {!prod ? (
          <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.9rem' }}>Lien de suivi introuvable ou expiré.</p>
          </div>
        ) : (
          <PortalClient
            prod={JSON.parse(JSON.stringify(prod))}
            events={JSON.parse(JSON.stringify(events))}
            versionCount={versionCount}
            token={params.token}
          />
        )}

        <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.7rem', textAlign: 'center', marginTop: 20 }}>
          instant. — production vidéo & photo · Toulouse
        </p>
      </div>
    </div>
  )
}
