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

export function emailWeeklyRecap(data: {
  weekProjects: { title: string; client: string; assignee: string; deadline: string }[]
  overdueCount: number
  pendingInvoices: number
}) {
  const rows = data.weekProjects.length
    ? `<ul>${data.weekProjects.map(p => `<li><strong>${p.title}</strong> (${p.client}) — ${p.assignee} — deadline ${p.deadline}</li>`).join('')}</ul>`
    : '<p>Aucune deadline cette semaine 🎉</p>'
  const html = `
    <h2>Récap de la semaine — instant. production</h2>
    <p><strong>${data.weekProjects.length}</strong> prestation${data.weekProjects.length > 1 ? 's' : ''} à livrer cette semaine :</p>
    ${rows}
    ${data.overdueCount > 0 ? `<p style="color:#ef4444">⚠ ${data.overdueCount} prestation${data.overdueCount > 1 ? 's' : ''} en retard</p>` : ''}
    ${data.pendingInvoices > 0 ? `<p>📄 ${data.pendingInvoices} facture${data.pendingInvoices > 1 ? 's' : ''} en attente de paiement</p>` : ''}
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Ouvrir presta.instantmov.fr →</a></p>
  `
  return Promise.all([
    sendEmail({ to: process.env.EMAIL_LUCAS!, subject: `📅 Récap semaine — ${data.weekProjects.length} deadline${data.weekProjects.length > 1 ? 's' : ''}`, html }),
    sendEmail({ to: process.env.EMAIL_AXEL!, subject: `📅 Récap semaine — ${data.weekProjects.length} deadline${data.weekProjects.length > 1 ? 's' : ''}`, html }),
  ])
}

export function emailDeadlineReminder(projects: { title: string; client: string; assignee: string }[]) {
  const rows = projects.map(p => `<li><strong>${p.title}</strong> (${p.client}) — ${p.assignee}</li>`).join('')
  return sendEmail({
    to: process.env.EMAIL_LUCAS!,
    subject: `⚠️ ${projects.length} prestation${projects.length > 1 ? 's' : ''} à livrer demain`,
    html: `<p>Deadline demain pour :</p><ul>${rows}</ul><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/productions">Voir sur presta.instantmov.fr →</a></p>`,
  })
}
