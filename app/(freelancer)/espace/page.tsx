import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import GamifyCard from '@/components/GamifyCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0
const db = prisma as any

function fmt(d: Date | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

export default async function FreelancerDashboard() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const currentMonth = now.toISOString().slice(0, 7)


  const [myProds, notifications, payouts] = await Promise.all([
    db.production.findMany({ where: { assignedToId: userId }, orderBy: { deadline: 'asc' } }).catch(() => []),
    db.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
    db.monthlyPayout.findMany({ where: { freelancerId: userId } }).catch(() => []),
  ])

  const all = myProds as any[]
  const enCours = all.filter((p: any) => ['a_faire', 'en_cours'].includes(p.status) && !p.archived)
  const enAttente = all.filter((p: any) => p.status === 'en_attente' && !p.archived)
  const livres = all.filter((p: any) => p.status === 'livre')
  const valides = all.filter((p: any) => p.status === 'valide')
  const overdue = all.filter((p: any) => p.deadline && new Date(p.deadline) < startToday && !['valide'].includes(p.status) && !p.archived)
  const activeList = all.filter((p: any) => !['valide'].includes(p.status) && !p.archived)

  // Financial workflow:
  // - "Montant en attente" = prices of delivered (livre) projects, not yet validated by admin
  // - "Montant validé" = current month accumulated payouts (validated by admin)
  // - "Solde total" = lifetime accumulated payouts
  const pendingAmount = livres.reduce((a: number, p: any) => a + (p.price || 0), 0)
  const monthPayout = (payouts as any[]).find((p: any) => p.month === currentMonth)
  const validatedAmount = monthPayout?.validatedAmount || 0
  const totalBalance = (payouts as any[]).reduce((a: number, p: any) => a + (p.validatedAmount || 0), 0)

  const STATUS_COLORS: Record<string, string> = { a_faire: '#8b7fb8', en_cours: '#a5b4fc', en_attente: '#c4b5fd', revisions: '#e879f9', livre: '#a78bfa', envoye_client: '#c7d2fe', retours_client: '#ec4899', valide: '#22c55e' }
  const STATUS_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', en_attente: 'En attente', revisions: 'Retours à faire', livre: 'À valider', envoye_client: 'Envoyé client', retours_client: 'Retours client', valide: 'Terminé' }

  const kpis = [
    { label: 'Projets en cours', value: enCours.length, color: '#a5b4fc', bg: 'rgba(165,180,252,0.08)', border: 'rgba(165,180,252,0.2)' },
    { label: 'En attente de validation', value: enAttente.length, color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
    { label: 'Projets livrés', value: livres.length, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
    { label: 'Projets validés', value: valides.length, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    { label: 'Projets en retard', value: overdue.length, color: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.2)' },
  ]

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Bonjour {session?.user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.78rem', marginTop: 3 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {overdue.length > 0 && (
        <div style={{ background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.15)', borderRadius: 10, padding: '11px 16px', marginBottom: 18 }}>
          <p style={{ color: '#fb7185', fontSize: '0.8rem' }}>⚠ {overdue.length} prestation{overdue.length > 1 ? 's' : ''} en retard — priorité absolue</p>
        </div>
      )}

      {/* Level, rank, streak & XP — full gamification engine */}
      <GamifyCard />

      {/* Status KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
        {kpis.map(k => (
          <Link key={k.label} href="/espace/prestations" style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 12, padding: '14px 16px', textDecoration: 'none', display: 'block' }}>
            <p style={{ color: k.color, fontSize: '1.7rem', fontWeight: 800, lineHeight: 1 }}>{k.value}</p>
            <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.67rem', marginTop: 5, lineHeight: 1.3 }}>{k.label}</p>
          </Link>
        ))}
      </div>

      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: 'rgba(26,18,48,0.65)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Montant en attente</p>
          <p style={{ color: '#eab308', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{pendingAmount.toLocaleString('fr-FR')} €</p>
          <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.68rem', marginTop: 4 }}>livré, en attente de validation</p>
        </div>
        <div style={{ background: 'rgba(26,18,48,0.65)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Montant validé</p>
          <p style={{ color: '#22c55e', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{validatedAmount.toLocaleString('fr-FR')} €</p>
          <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.68rem', marginTop: 4 }}>ce mois-ci</p>
        </div>
        <div style={{ background: 'rgba(26,18,48,0.65)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Solde total</p>
          <p style={{ color: '#a78bfa', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{totalBalance.toLocaleString('fr-FR')} €</p>
          <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.68rem', marginTop: 4 }}>gagné depuis le début</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        {/* Active tasks */}
        <div style={{ background: 'rgba(26,18,48,0.65)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(167,139,250,0.12)', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>Mes prestations</p>
            <Link href="/espace/prestations" style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', textDecoration: 'none' }}>Tout voir →</Link>
          </div>
          {activeList.length === 0 ? (
            <p style={{ color: 'rgba(240,235,227,0.2)', padding: '24px 18px', textAlign: 'center', fontSize: '0.8rem' }}>Aucune prestation en cours ✓</p>
          ) : (
            activeList.slice(0, 6).map((p: any) => {
              const isOverdue = p.deadline && new Date(p.deadline) < startToday
              return (
                <Link key={p.id} href="/espace/prestations" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid rgba(167,139,250,0.06)', textDecoration: 'none' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 600 }}>{p.title}</p>
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', marginTop: 1 }}>{p.client} · {fmt(p.deadline)}</p>
                  </div>
                  {p.price ? <span style={{ color: '#f0ebe3', fontSize: '0.75rem', fontWeight: 700 }}>{p.price.toLocaleString('fr-FR')} €</span> : null}
                  <span style={{ background: `${STATUS_COLORS[p.status] || '#8b7fb8'}15`, color: STATUS_COLORS[p.status] || '#8b7fb8', padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{STATUS_LABELS[p.status] || p.status}</span>
                  {isOverdue && <span style={{ color: '#fb7185', fontSize: '0.65rem', fontWeight: 700 }}>⚠</span>}
                </Link>
              )
            })
          )}
        </div>

        {/* Notifications */}
        <div style={{ background: 'rgba(26,18,48,0.65)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 14, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
            <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>Notifications</p>
          </div>
          {(notifications as any[]).length === 0 ? (
            <p style={{ color: 'rgba(240,235,227,0.2)', padding: '20px 16px', fontSize: '0.75rem', textAlign: 'center' }}>Aucune notification</p>
          ) : (
            (notifications as any[]).map((n: any) => (
              <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(167,139,250,0.06)' }}>
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
