import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308',
  livre: '#a78bfa', valide: '#22c55e', archive: '#374151',
}
const STATUS_LABELS: Record<string, string> = {
  a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente',
  livre: 'Livré', valide: 'Validé', archive: 'Archivé',
}

function fmt(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  const today = new Date(); today.setHours(23, 59, 59, 999)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23, 59, 59, 999)
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  const startTomorrow = new Date(); startTomorrow.setDate(startTomorrow.getDate() + 1); startTomorrow.setHours(0, 0, 0, 0)
  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0)

  const db = prisma as any

  const [
    inProgress, overdue, dueToday, dueTomorrow, completedMonth,
    activeFreelancers, recentActivity, notifications, urgentProds
  ] = await Promise.all([
    db.production.count({ where: { status: { in: ['en_cours', 'en_attente', 'a_faire'] } } }).catch(() => 0),
    db.production.count({ where: { status: { notIn: ['valide', 'archive'] }, deadline: { lt: startToday } } }).catch(() => 0),
    db.production.count({ where: { status: { notIn: ['valide', 'archive'] }, deadline: { gte: startToday, lte: today } } }).catch(() => 0),
    db.production.count({ where: { status: { notIn: ['valide', 'archive'] }, deadline: { gte: startTomorrow, lte: tomorrow } } }).catch(() => 0),
    db.production.count({ where: { status: 'valide', updatedAt: { gte: startMonth } } }).catch(() => 0),
    db.user.count({ where: { role: 'freelancer', active: true } }).catch(() => 0),
    db.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }).catch(() => []),
    db.notification.findMany({ where: { read: false }, orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
    db.production.findMany({ where: { status: { notIn: ['valide', 'archive'] }, deadline: { lt: today } }, orderBy: { deadline: 'asc' }, take: 5, include: { assignedTo: true } }).catch(() => []),
  ])

  const stats = [
    { label: 'En cours', value: inProgress, color: '#3b82f6', href: '/productions?status=en_cours' },
    { label: 'En retard', value: overdue, color: '#ef4444', href: '/productions?overdue=true' },
    { label: 'Pour aujourd\'hui', value: dueToday, color: '#eab308', href: '/productions?due=today' },
    { label: 'Pour demain', value: dueTomorrow, color: '#f97316', href: '/productions?due=tomorrow' },
    { label: 'Terminées ce mois', value: completedMonth, color: '#22c55e', href: '/archives' },
    { label: 'Prestataires actifs', value: activeFreelancers, color: '#a78bfa', href: '/prestataires' },
  ]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-syne), sans-serif' }}>
          Bonjour {session?.user?.name} 👋
        </h1>
        <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.82rem', marginTop: 4 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alerts */}
      {(overdue > 0 || dueToday > 0) && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {overdue > 0 && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {overdue} prestation{overdue > 1 ? 's' : ''} en retard</p>}
          {dueToday > 0 && <p style={{ color: '#eab308', fontSize: '0.85rem' }}>📅 {dueToday} prestation{dueToday > 1 ? 's' : ''} à livrer aujourd&apos;hui</p>}
          {dueTomorrow > 0 && <p style={{ color: '#f97316', fontSize: '0.85rem' }}>📌 {dueTomorrow} prestation{dueTomorrow > 1 ? 's' : ''} à livrer demain</p>}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {stats.map(s => (
          <Link key={s.label} href={s.href} style={{ background: '#141414', border: `1px solid ${s.color}25`, borderRadius: 12, padding: '18px 20px', textDecoration: 'none', display: 'block' }}>
            <p style={{ color: s.color, fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</p>
            <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.75rem', marginTop: 6 }}>{s.label}</p>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Urgent productions */}
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600 }}>Prestations urgentes</p>
            <Link href="/productions" style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.75rem' }}>Tout voir →</Link>
          </div>
          {(urgentProds as any[]).length === 0 ? (
            <p style={{ color: 'rgba(240,235,227,0.2)', padding: '28px 20px', textAlign: 'center', fontSize: '0.82rem' }}>Aucune prestation urgente ✓</p>
          ) : (
            (urgentProds as any[]).map((p: any) => (
              <Link key={p.id} href={`/productions/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid #1a1a1a', textDecoration: 'none' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>{p.title}</p>
                  <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.72rem', marginTop: 2 }}>{p.client} · {p.assignedTo?.name ?? 'Non assigné'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 600 }}>⚠ {fmt(p.deadline)}</span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Activity + Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Notifications */}
          {(notifications as any[]).length > 0 && (
            <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e' }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>Notifications</p>
              </div>
              {(notifications as any[]).map((n: any) => (
                <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a' }}>
                  <p style={{ color: '#f0ebe3', fontSize: '0.75rem' }}>{n.message}</p>
                  <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', marginTop: 2 }}>{fmt(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Activity */}
          <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e' }}>
              <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>Activité récente</p>
            </div>
            {(recentActivity as any[]).length === 0 ? (
              <p style={{ color: 'rgba(240,235,227,0.2)', padding: '20px 16px', fontSize: '0.78rem', textAlign: 'center' }}>Aucune activité</p>
            ) : (
              (recentActivity as any[]).map((a: any) => (
                <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a' }}>
                  <p style={{ color: 'rgba(240,235,227,0.7)', fontSize: '0.75rem' }}>
                    <strong style={{ color: '#f0ebe3' }}>{a.actorName}</strong> {a.action}{a.target ? ` — ${a.target}` : ''}
                  </p>
                  <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', marginTop: 2 }}>{fmt(a.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
