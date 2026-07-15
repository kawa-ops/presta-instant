import Anthropic from '@anthropic-ai/sdk'

// Shared Claude helper — every AI feature degrades gracefully:
// returns null when ANTHROPIC_API_KEY is absent or the call fails,
// and callers fall back to their non-AI behaviour.

const MODEL = 'claude-haiku-4-5'

export function aiAvailable() {
  return !!process.env.ANTHROPIC_API_KEY
}

export async function askClaude(system: string, user: string, maxTokens = 1500): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const block = res.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined
    return block?.text?.trim() || null
  } catch {
    return null
  }
}

// PDF analysis (base64 document block) — used for invoice sanity checks
export async function askClaudePdf(system: string, user: string, pdfBase64: string, maxTokens = 300): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: user },
        ],
      }],
    })
    const block = res.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined
    return block?.text?.trim() || null
  } catch {
    return null
  }
}

// Extract the first JSON object/array from a model reply (tolerates ```json fences)
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const start = Math.min(...['{', '['].map(c => { const i = cleaned.indexOf(c); return i === -1 ? Infinity : i }))
    if (!isFinite(start)) return null
    return JSON.parse(cleaned.slice(start)) as T
  } catch {
    return null
  }
}
