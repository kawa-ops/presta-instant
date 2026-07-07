// Single source of truth for statuses, priorities and their design-system colors.
// Purple palette everywhere — green stays reserved for success.

export const STATUS_COLORS: Record<string, string> = {
  a_faire: '#8b7fb8',
  en_cours: '#a78bfa',
  en_attente: '#c4b5fd',
  revisions: '#e879f9',
  livre: '#d8b4fe',
  envoye_client: '#c7d2fe',
  retours_client: '#ec4899',
  valide: '#22c55e',
}

export const STATUS_LABELS: Record<string, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  en_attente: 'En attente',
  revisions: 'Retours à faire',
  livre: 'À valider',
  envoye_client: 'Envoyé client',
  retours_client: 'Retours client',
  valide: 'Terminé',
}

export const STATUSES = [
  { value: 'a_faire', label: STATUS_LABELS.a_faire, color: STATUS_COLORS.a_faire },
  { value: 'en_cours', label: STATUS_LABELS.en_cours, color: STATUS_COLORS.en_cours },
  { value: 'revisions', label: STATUS_LABELS.revisions, color: STATUS_COLORS.revisions },
  { value: 'livre', label: STATUS_LABELS.livre, color: STATUS_COLORS.livre },
  { value: 'envoye_client', label: STATUS_LABELS.envoye_client, color: STATUS_COLORS.envoye_client },
  { value: 'retours_client', label: STATUS_LABELS.retours_client, color: STATUS_COLORS.retours_client },
  { value: 'valide', label: STATUS_LABELS.valide, color: STATUS_COLORS.valide },
]

export const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: '#ec4899' },
  { value: 'high', label: 'Haute', color: '#c026d3' },
  { value: 'normal', label: 'Normale', color: '#8b7fb8' },
  { value: 'low', label: 'Basse', color: '#5b5273' },
]
