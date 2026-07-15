import { prisma } from '@/lib/prisma'
import { aiAvailable, askClaude, extractJson } from '@/lib/ai'

const db = prisma as any

// Turns raw feedback (client or admin) into an actionable checklist stored
// as a structured comment in the production thread. Fire-and-forget: no-op
// without ANTHROPIC_API_KEY, never blocks or fails the caller.
export async function structureFeedback(productionId: string, rawText: string, source: string) {
  try {
    if (!aiAvailable() || !rawText || rawText.trim().length < 25) return
    const text = await askClaude(
      `Tu transformes des retours de relecture vidéo en une liste de tâches actionnables pour un monteur.
Règles :
- Français, chaque tâche courte, concrète, commence par un verbe.
- Conserve les timecodes exacts s'il y en a (ex : "0:42").
- Fusionne les doublons, ignore les politesses.
- Maximum 10 tâches.
- Réponds UNIQUEMENT avec un JSON valide : {"tasks": string[]}.`,
      rawText.slice(0, 3000),
      600
    )
    const parsed = extractJson<{ tasks?: string[] }>(text)
    const tasks = (parsed?.tasks || []).filter(t => typeof t === 'string' && t.trim()).slice(0, 10)
    if (tasks.length === 0) return
    const body = `📋 Checklist générée à partir des retours (${source}) :\n${tasks.map(t => `☐ ${t}`).join('\n')}`
    await db.comment.create({ data: { productionId, authorName: 'Assistant instant.', authorRole: 'admin', body } }).catch(() => {})
  } catch {}
}
