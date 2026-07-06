import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// One-off test: sends a WhatsApp message to Lucas and Axel via the Cloud API
// and returns Meta's raw responses so problems are visible.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  if (!token || !phoneId) return NextResponse.json({ error: 'WHATSAPP_TOKEN ou WHATSAPP_PHONE_ID manquant dans Vercel' }, { status: 500 })

  const targets = [
    { name: 'Lucas', to: process.env.WHATSAPP_TO_LUCAS },
    { name: 'Axel', to: process.env.WHATSAPP_TO_AXEL },
  ]

  const results: any[] = []
  for (const t of targets) {
    if (!t.to) { results.push({ name: t.name, error: 'numéro non configuré' }); continue }
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: t.to,
          type: 'text',
          text: { body: `🔔 Test réussi — presta.instantmov.fr est connecté à WhatsApp. (${t.name})` },
        }),
      })
      const data = await res.json()
      results.push({ name: t.name, to: t.to, status: res.status, response: data })
    } catch (e: any) {
      results.push({ name: t.name, error: e.message })
    }
  }

  return NextResponse.json({ results })
}
