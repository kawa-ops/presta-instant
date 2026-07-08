// Achievement definitions — client-safe (no server imports).
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
