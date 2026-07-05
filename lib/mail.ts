import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    await resend.emails.send({ from: 'instant. <noreply@instantmov.fr>', to, subject, html })
  } catch (e) {
    console.error('Email error:', e)
  }
}

export function emailTaskCompleted(freelancerName: string, projectTitle: string) {
  return {
    to: process.env.EMAIL_LUCAS!,
    subject: `✅ Mission terminée — ${projectTitle}`,
    html: `<p><strong>${freelancerName}</strong> a terminé la mission : <strong>${projectTitle}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/productions">Voir sur presta.instantmov.fr →</a></p>`,
  }
}

export function emailInvoiceUploaded(freelancerName: string) {
  return {
    to: process.env.EMAIL_AXEL!,
    subject: `📄 Nouvelle facture — ${freelancerName}`,
    html: `<p><strong>${freelancerName}</strong> a déposé une nouvelle facture.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/facturation">Voir sur presta.instantmov.fr →</a></p>`,
  }
}

export function emailInvoicePaid(freelancerEmail: string, amount: number) {
  return {
    to: freelancerEmail,
    subject: `💶 Paiement effectué — ${amount} €`,
    html: `<p>Votre facture de <strong>${amount} €</strong> a été marquée comme payée par instant.</p>`,
  }
}

export function emailDeadlineReminder(projectTitle: string, freelancerName: string) {
  return {
    to: process.env.EMAIL_LUCAS!,
    subject: `⚠️ Deadline demain — ${projectTitle}`,
    html: `<p>La prestation <strong>${projectTitle}</strong> assignée à <strong>${freelancerName}</strong> doit être livrée demain.</p>`,
  }
}
