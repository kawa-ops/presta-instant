// WhatsApp notifications via Meta WhatsApp Business Cloud API.
// Gracefully no-ops until the env vars are configured:
//   WHATSAPP_TOKEN     — permanent access token (Meta Business app)
//   WHATSAPP_PHONE_ID  — phone number ID of the sender
//   WHATSAPP_TO_LUCAS  — Lucas's number, intl format without + (e.g. 336XXXXXXXX)
//   WHATSAPP_TO_AXEL   — Axel's number

async function send(to: string | undefined, text: string) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  if (!token || !phoneId || !to) return
  try {
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })
  } catch (e) {
    console.error('WhatsApp error:', e)
  }
}

// Production events → Lucas (Axel in copy)
export function waProduction(text: string) {
  return Promise.all([
    send(process.env.WHATSAPP_TO_LUCAS, `@Lucas\n${text}`),
    send(process.env.WHATSAPP_TO_AXEL, text),
  ])
}

// Accounting events → Axel (Lucas in copy)
export function waAccounting(text: string) {
  return Promise.all([
    send(process.env.WHATSAPP_TO_AXEL, `@Axel\n${text}`),
    send(process.env.WHATSAPP_TO_LUCAS, text),
  ])
}

// Direct message to a freelancer (uses the phone stored on their profile)
export function waFreelancer(phone: string | null | undefined, text: string) {
  if (!phone) return Promise.resolve()
  // Normalize French numbers: 06XXXXXXXX → 336XXXXXXXX
  const normalized = phone.replace(/[\s.-]/g, '').replace(/^0/, '33').replace(/^\+/, '')
  return send(normalized, text)
}
