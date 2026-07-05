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

  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)
  const startTomorrow = new Date(startToday); startTomorrow.setDate(startTomorrow.getDate() + 1)
  const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1)
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [myProds, notifications, payouts] = await Promise.all([
    db.production.findMany({ where: { assignedToId: userId, archived: false }, orderBy: { deadline: 'asc' } }).catch(() => []),
    db.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
    db.monthlyPayout.findMany({ where: { freelancerId: userId } }).catch(() => []),
  ])

  const active = (myProds as any[]).filter((p: any) => !['valide'].includes(p.status))
  const overdue = active.filter((p: any) => p.deadline && new Date(p.deadline) < startToday)
  const dueToday = active.filter((p: any) => p.deadline && new Date(p.deadline) >= startToday && new Date(p.deadline) <= endToday)
  const dueTomorrow = active.filter((p: any) => p.deadline && new Date(p.deadline) >= startTomorrow && new Date(p.deadline) <= endTomorrow)
  const validated = (myProds as any[]).filter((p: any) => p.status === 'valide')

  // Financial
  const pendingAmount = (payouts as any[]).filter((p: any) => p.invoiceStatus !== 'paid').reduce((a: number, p: any) => a + (p.validatedAmount || 0), 0)
  const validatedAmount = (payouts as any[]).filter((p: any) => p.invoiceStatus === 'paid').reduce((a: number, p: any) => a + (p.validatedAmount || 0), 0)
  const totalBalance = (payouts as any[]).reduce((a: number, p: any) => a + (p.validatedAmount || 0), 0)
  const thisMonthAmount = (payouts as any[]).find((p: any) => p.month === now.toISOString().slice(0, 7))?.validatedAmount || 0

  const STATUS_COLORS: Record<string, string> = { a_faire: '#6b7280', en_cours: '#3b82f6', en_attente: '#eab308', livre: '#a78bfa', valide: '#22c55e' }
  const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', livre: 'Livré', valide: 'Validé' }

  const kpis = [
    { label: 'Prestations en cours', value: active.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    { label: 'En retard', value: overdue.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
    { label: 'À rendre aujourd\'hui', value: dueToday.length, color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
    { label: 'À rendre demain', value: dueTomorrow.length, color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  ]

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Bonjour {session?.user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.78rem', marginTop: 3 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {(overdue.length > 0 || dueToday.length > 0) && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '11px 16px', marginBottom: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {overdue.length > 0 && <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>⚠ {overdue.length} prestation{overdue.length > 1 ? 's' : ''} en retard</p>}
          {dueToday.length > 0 && <p style={{ color: '#eab308', fontSize: '0.8rem' }}>● {dueToday.length} prestation{dueToday.length > 1 ? 's' : ''} à livrer aujourd&apos;hui</p>}
        </div>
      )}

      {/* Production KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {kpis.map(k => (
          <Link key={k.label} href="/espace/prestations" style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 12, padding: '16px 18px', textDecoration: 'none', display: 'block' }}>
            <p style={{ color: k.color, fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{k.value}</p>
            <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.7rem', marginTop: 5 }}>{k.label}</p>
          </Link>
        ))}
      </div>

      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Montant en attente</p>
          <p style={{ color: '#eab308', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{pendingAmount.toLocaleString('fr-FR')} €</p>
          <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.68rem', marginTop: 4 }}>validé, facture en attente</p>
        </div>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Montant validé</p>
          <p style={{ color: '#22c55e', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{validatedAmount.toLocaleString('fr-FR')} €</p>
          <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.68rem', marginTop: 4 }}>factures payées</p>
        </div>
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Solde total</p>
          <p style={{ color: '#a78bfa', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{totalBalance.toLocaleString('fr-FR')} €</p>
          <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.68rem', marginTop: 4 }}>depuis le début</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        {/* Active tasks */}
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>Mes prestations</p>
            <Link href="/espace/prestations" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', textDecoration: 'none' }}>Tout voir →</Link>
          </div>
          {active.length === 0 ? (
            <p style={{ color: 'rgba(240,235,227,0.2)', padding: '24px 18px', textAlign: 'center', fontSize: '0.8rem' }}>Aucune prestation en cours ✓</p>
          ) : (
            active.slice(0, 6).map((p: any) => {
              const isOverdue = p.deadline && new Date(p.deadline) < startToday
              return (
                <Link key={p.id} href="/espace/prestations" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid #191919', textDecoration: 'none' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 600 }}>{p.title}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', marginTop: 1 }}>{p.client} · {fmt(p.deadline)}</p>
                  </div>
                  <span style={{ background: `${STATUS_COLORS[p.status] || '#6b7280'}15`, color: STATUS_COLORS[p.status] || '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span>
                  {isOverdue && <span style={{ color: '#ef4444', fontSize: '0.65rem', fontWeight: 700 }}>⚠</span>}
                </Link>
              )
            })
          )}
        </div>

        {/* Notifications */}
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #1e1e1e' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>Notifications {(notifications as any[]).length > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '0.6rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>{(notifications as any[]).length}</span>}</p>
          </div>
          {(notifications as any[]).length === 0 ? (
            <p style={{ color: 'rgba(240,235,227,0.2)', padding: '20px 16px', fontSize: '0.75rem', textAlign: 'center' }}>Aucune notification</p>
          ) : (
            (notifications as any[]).map((n: any) => (
              <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #191919' }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.75rem' }}>{n.message}</p>
                <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.65rem', marginTop: 2 }}>{fmt(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
