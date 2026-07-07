import { prisma } from '@/lib/prisma'

const db = prisma as any

// ============ Levels & Ranks ============
// Cumulative XP needed to REACH level n: 100 * n * (n+1) / 2 (level 0 = 0 XP)
export function levelFromXp(xp: number): number {
  let n = 0
  while (xp >= 100 * (n + 1) * (n + 2) / 2) n++
  return n
}
export function thresholdFor(level: number): number {
  return level <= 0 ? 0 : 100 * level * (level + 1) / 2
}

export const FREELANCE_RANKS: [number, string][] = [
  [0, "📱 Vidéaste à l'iPhone"],
  [1, '☕ Stagiaire Premiere Pro'],
  [2, '🎬 Assistant Cadreur'],
  [3, '🔋 Porteur de Batteries'],
  [4, '🎤 Perchman Motivé'],
  [5, '✂️ Monteur de Rushes'],
  [6, '🎞️ Dompteur de Timeline'],
  [7, "🎨 Sorcier de l'Étalonnage"],
  [8, '🚁 Drone Commander'],
  [10, '🎥 Chef Opérateur'],
  [12, '🏆 Maître du Montage'],
  [14, '🎬 Réalisateur Confirmé'],
  [16, '🌟 Machine à Banger'],
  [18, '👑 Directeur de la Créa'],
  [20, '🎖️ Légende de la Post-Prod'],
]

export const ADMIN_RANKS: [number, string][] = [
  [0, '📋 Stagiaire du Planning'],
  [2, '☎️ Relanceur de Clients'],
  [4, '🗂️ Chef de Projet Junior'],
  [6, '⚡ Validateur Éclair'],
  [8, '🎯 Maître des Deadlines'],
  [11, '🧠 Cerveau de la Prod'],
  [14, '🚀 Producteur Exécutif'],
  [17, '🏛️ Empereur du Studio'],
]

export function rankFor(level: number, role: string): string {
  const ranks = role === 'admin' ? ADMIN_RANKS : FREELANCE_RANKS
  let r = ranks[0][1]
  for (const [min, name] of ranks) if (level >= min) r = name
  return r
}

// ============ Achievements ============
export const ACHIEVEMENTS: Record<string, { label: string; emoji: string; xp: number }> = {
  first_delivery:    { label: 'Première livraison', emoji: '🏆', xp: 25 },
  first_approval:    { label: 'Première approbation client', emoji: '❤️', xp: 25 },
  deliveries_10:     { label: '10 projets livrés', emoji: '📦', xp: 50 },
  deliveries_50:     { label: '50 projets livrés', emoji: '🚛', xp: 100 },
  deliveries_100:    { label: '100 projets livrés', emoji: '🏭', xp: 200 },
  deadline_assassin: { label: 'Deadline Assassin — 10 livraisons en avance', emoji: '🎯', xp: 75 },
  speed_runner:      { label: 'Speed Runner — livré en moins de 24h', emoji: '⚡', xp: 40 },
  night_owl:         { label: 'Oiseau de Nuit — livraison entre 2h et 5h', emoji: '🌙', xp: 30 },
  baguette_dor:      { label: "Baguette d'Or — livré pendant la pause déj'", emoji: '🥖', xp: 20 },
  onze_onze:         { label: 'Make a wish — validé à 11:11 pile', emoji: '🕚', xp: 30 },
  client_favorite:   { label: 'Chouchou des Clients — 10 approbations', emoji: '💖', xp: 100 },
  perfect_v1:        { label: 'Sans-Faute — V1 approuvée sans révision', emoji: '🥇', xp: 40 },
  inbox_zero:        { label: 'Inbox Zéro — tout traité', emoji: '🧘', xp: 15 },
}

const DAILY_CAP = 150

// ============ Core ============
// Awards XP (respecting the daily cap), detects level-ups, notifies.
export async function awardXp(userId: string, amount: number, reason: string) {
  if (!userId || amount <= 0) return
  try {
    const startDay = new Date(); startDay.setHours(0, 0, 0, 0)
    const [todayAgg, totalAgg, user] = await Promise.all([
      db.xpEvent.aggregate({ _sum: { amount: true }, where: { userId, createdAt: { gte: startDay } } }),
      db.xpEvent.aggregate({ _sum: { amount: true }, where: { userId } }),
      db.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ])
    const today = todayAgg._sum.amount || 0
    const remaining = Math.max(0, DAILY_CAP - today)
    const granted = Math.min(amount, remaining)
    if (granted <= 0) return

    const totalBefore = totalAgg._sum.amount || 0
    await db.xpEvent.create({ data: { userId, amount: granted, reason } })

    // Level-up detection → celebratory notification (LiveNotifications toasts it)
    const before = levelFromXp(totalBefore)
    const after = levelFromXp(totalBefore + granted)
    if (after > before) {
      const rank = rankFor(after, user?.role || 'freelancer')
      await db.notification.create({
        data: { userId, type: 'levelup', message: `🆙 Niveau ${after} atteint — tu es maintenant ${rank} !`, link: user?.role === 'admin' ? '/dashboard' : '/espace' },
      }).catch(() => {})
    }
  } catch {}
}

// Unlocks an achievement once; awards its bonus XP and notifies.
export async function unlockAchievement(userId: string, key: string) {
  const def = ACHIEVEMENTS[key]
  if (!userId || !def) return
  try {
    const existing = await db.achievement.findUnique({ where: { userId_key: { userId, key } } }).catch(() => null)
    if (existing) return
    await db.achievement.create({ data: { userId, key } })
    await db.xpEvent.create({ data: { userId, amount: def.xp, reason: `Succès : ${def.label}` } }).catch(() => {})
    await db.notification.create({
      data: { userId, type: 'achievement', message: `${def.emoji} Succès débloqué : ${def.label} (+${def.xp} XP)`, link: '/espace/profil' },
    }).catch(() => {})
  } catch {}
}

// ============ Event hooks (called from API routes, fire-and-forget) ============

// Freelancer delivered a version
export async function onDelivery(userId: string, production: { deadline?: Date | null; createdAt?: Date | null }, versionNumber: number) {
  const now = new Date()
  await awardXp(userId, versionNumber <= 1 ? 25 : 20, versionNumber <= 1 ? 'Version 1 livrée' : `Version ${versionNumber} livrée`)

  // Early / on-time bonus
  if (production.deadline) {
    const deadline = new Date(production.deadline)
    const daysEarly = Math.floor((deadline.getTime() - now.getTime()) / 86400000)
    if (daysEarly >= 1) {
      await awardXp(userId, Math.min(15 + daysEarly, 25), `Livré ${daysEarly}j en avance`)
      // Track early deliveries for Deadline Assassin
      const earlyCount = await db.xpEvent.count({ where: { userId, reason: { contains: 'en avance' } } }).catch(() => 0)
      if (earlyCount >= 10) unlockAchievement(userId, 'deadline_assassin')
    } else if (daysEarly === 0) {
      await awardXp(userId, 5, 'Livré le jour J')
    }
  }

  // Achievements
  unlockAchievement(userId, 'first_delivery')
  const h = now.getHours()
  if (h >= 2 && h < 5) unlockAchievement(userId, 'night_owl')
  if ((h === 12 && now.getMinutes() >= 30) || (h === 13 && now.getMinutes() <= 30)) unlockAchievement(userId, 'baguette_dor')
  if (production.createdAt && now.getTime() - new Date(production.createdAt).getTime() < 24 * 3600 * 1000) unlockAchievement(userId, 'speed_runner')
  // Delivery-count milestones are handled in onValidation
}

// Admin validated a production
export async function onValidation(adminId: string, freelancerId: string | null, revisionsCount: number) {
  const now = new Date()
  await awardXp(adminId, 15, 'Projet validé')
  if (now.getHours() === 11 && now.getMinutes() === 11) unlockAchievement(adminId, 'onze_onze')

  if (freelancerId && freelancerId !== adminId) {
    await awardXp(freelancerId, 30, 'Projet validé par Lucas')
    if (revisionsCount === 0) unlockAchievement(freelancerId, 'perfect_v1')
    const validated = await db.production.count({ where: { assignedToId: freelancerId, status: 'valide' } }).catch(() => 0)
    if (validated >= 100) unlockAchievement(freelancerId, 'deliveries_100')
    else if (validated >= 50) unlockAchievement(freelancerId, 'deliveries_50')
    else if (validated >= 10) unlockAchievement(freelancerId, 'deliveries_10')
  }
}

// Client approved on the portal
export async function onClientApproval(freelancerId: string | null, adminIds: string[]) {
  for (const a of adminIds) await awardXp(a, 30, 'Approbation client')
  if (freelancerId) {
    await awardXp(freelancerId, 30, 'Approbation client')
    unlockAchievement(freelancerId, 'first_approval')
    const approvals = await db.xpEvent.count({ where: { userId: freelancerId, reason: 'Approbation client' } }).catch(() => 0)
    if (approvals >= 10) unlockAchievement(freelancerId, 'client_favorite')
  }
}

// Streak: consecutive days (up to today) with at least one XpEvent
export async function computeStreak(userId: string): Promise<number> {
  try {
    const rows: any[] = await db.$queryRawUnsafe(
      `SELECT DISTINCT DATE("createdAt") AS d FROM "XpEvent" WHERE "userId" = $1 ORDER BY d DESC LIMIT 60`,
      userId
    )
    let streak = 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 0; i < rows.length; i++) {
      const expected = new Date(today); expected.setDate(expected.getDate() - i)
      const d = new Date(rows[i].d); d.setHours(0, 0, 0, 0)
      if (d.getTime() === expected.getTime()) streak++
      else if (i === 0 && d.getTime() === expected.getTime() - 86400000) { streak++; today.setDate(today.getDate() - 1) }
      else break
    }
    return streak
  } catch { return 0 }
}
