'use client'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

const IN: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%' }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }

function InvoiceAmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="number" style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" />
}
function InvoiceLinkInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder="Lien Drive vers la facture PDF" />
}

export default function ProfilPage() {
  const { data: session } = useSession()
  const [invForm, setInvForm] = useState({ productionId: '', fileUrl: '', amount: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function submitInvoice() {
    if (!invForm.fileUrl && !invForm.amount) return
    setSubmitting(true)
    await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invForm) })
    setSubmitting(false)
    setSent(true)
    setInvForm({ productionId: '', fileUrl: '', amount: '' })
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800, marginBottom: 28 }}>Mon profil</h1>

      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Informations</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nom</p><p style={{ color: '#f0ebe3', fontSize: '0.85rem' }}>{session?.user?.name}</p></div>
          <div><p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</p><p style={{ color: '#f0ebe3', fontSize: '0.85rem' }}>{session?.user?.email}</p></div>
        </div>
      </div>

      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, padding: 24 }}>
        <p style={{ color: '#f0ebe3', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Soumettre une facture</p>
        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.75rem', marginBottom: 16 }}>Axel sera notifié par email à réception.</p>

        {sent && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#22c55e', fontSize: '0.78rem' }}>
            Facture envoyée avec succès ✓
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={LA}>Lien de la facture (PDF)</label><InvoiceLinkInput value={invForm.fileUrl} onChange={v => setInvForm(f => ({ ...f, fileUrl: v }))} /></div>
          <div><label style={LA}>Montant (€)</label><InvoiceAmountInput value={invForm.amount} onChange={v => setInvForm(f => ({ ...f, amount: v }))} /></div>
        </div>

        <button onClick={submitInvoice} disabled={submitting} style={{ marginTop: 14, background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Envoi…' : 'Envoyer la facture'}
        </button>
      </div>
    </div>
  )
}
