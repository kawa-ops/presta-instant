import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
const db = prisma as any

function fmt(d: Date | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

export default async function FreelancerDashboard() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const [myProds, notifications] = await Promise.all([
    db.production.findMany({ where: { assignedToId: userId, archived: false, status: { notIn: ['valide'] } }, orderBy: { deadline: 'asc' }, take: 10 }).catch(() => []),
    db.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
  ])

  const overdue = myProds.filter((p: any) => p.deadline && new Date(p.deadline) < new Date() && p.status !== 'valide')
  const dueToday = myProds.filter((p: any) => p.deadline && new Date(p.deadline).toDateString() === new Date().toDateString())

  const STATUS_COLORS: Record<string, string> = { a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308', livre: '#a78bfa', valide: '#22c55e' }
  const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', livre: 'Livré', valide: 'Validé' }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Bonjour {session?.user?.name} 👋</h1>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.8rem', marginTop: 4 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {(overdue.length > 0 || dueToday.length > 0) && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {overdue.length > 0 && <p style={{ color: '#ef4444', fontSize: '0.82rem' }}>⚠️ {overdue.length} prestation{overdue.length > 1 ? 's' : ''} en retard</p>}
          {dueToday.length > 0 && <p style={{ color: '#eab308', fontSize: '0.82rem' }}>📅 {dueToday.length} prestation{dueToday.length > 1 ? 's' : ''} à livrer aujourd&apos;hui</p>}
        </div>
      )}

      {notifications.length > 0 && (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600, padding: '12px 16px', borderBottom: '1px solid #1e1e1e' }}>Notifications</p>
          {notifications.map((n: any) => (
            <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a' }}>
              <p style={{ color: '#f0ebe3', fontSize: '0.78rem' }}>{n.message}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>Mes prestations en cours</p>
          <Link href="/espace/prestations" style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.75rem' }}>Tout voir →</Link>
        </div>
        {myProds.length === 0 ? (
          <p style={{ color: 'rgba(240,235,227,0.2)', padding: '28px 20px', textAlign: 'center', fontSize: '0.82rem' }}>Aucune prestation assignée</p>
        ) : (
          myProds.map((p: any) => (
            <Link key={p.id} href={`/espace/prestations`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid #1a1a1a', textDecoration: 'none' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>{p.title}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.7rem', marginTop: 2 }}>{p.client}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ background: `${STATUS_COLORS[p.status] || '#6b7280'}15`, color: STATUS_COLORS[p.status] || '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span>
                <span style={{ color: new Date(p.deadline) < new Date() ? '#ef4444' : 'rgba(240,235,227,0.3)', fontSize: '0.7rem' }}>{fmt(p.deadline)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
