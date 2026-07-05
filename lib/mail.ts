import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'placeholder') return
  try {
    await resend.emails.send({ from: 'instant. <noreply@instantmov.fr>', to, subject, html })
  } catch (e) {
    console.error('Email error:', e)
  }
}

export function emailTaskCompleted(projectTitle: string, freelancerName: string) {
  return sendEmail({
    to: process.env.EMAIL_LUCAS!,
    subject: `✅ Mission terminée — ${projectTitle}`,
    html: `<p><strong>${freelancerName}</strong> a livré la prestation : <strong>${projectTitle}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/productions">Voir sur presta.instantmov.fr →</a></p>`,
  })
}

export function emailInvoiceUploaded(freelancerName: string, month: string) {
  return sendEmail({
    to: process.env.EMAIL_AXEL!,
    subject: `📄 Nouvelle facture — ${freelancerName} (${month})`,
    html: `<p><strong>${freelancerName}</strong> a déposé sa facture pour <strong>${month}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/facturation">Voir sur presta.instantmov.fr →</a></p>`,
  })
}

export function emailInvoicePaid(freelancerName: string, freelancerEmail: string, amount: number | null) {
  return sendEmail({
    to: freelancerEmail,
    subject: `💶 Paiement effectué${amount ? ` — ${amount.toLocaleString('fr-FR')} €` : ''}`,
    html: `<p>Bonjour ${freelancerName},</p><p>Votre facture${amount ? ` de <strong>${amount.toLocaleString('fr-FR')} €</strong>` : ''} a été marquée comme payée par instant.</p>`,
  })
}

export function emailDeadlineReminder(projects: { title: string; client: string; assignee: string }[]) {
  const rows = projects.map(p => `<li><strong>${p.title}</strong> (${p.client}) — ${p.assignee}</li>`).join('')
  return sendEmail({
    to: process.env.EMAIL_LUCAS!,
    subject: `⚠️ ${projects.length} prestation${projects.length > 1 ? 's' : ''} à livrer demain`,
    html: `<p>Deadline demain pour :</p><ul>${rows}</ul><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/productions">Voir sur presta.instantmov.fr →</a></p>`,
  })
}
