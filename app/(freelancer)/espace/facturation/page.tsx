'use client'
import { useEffect, useState } from 'react'

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }

type MonthState = {
  key: string
  label: string
  status: 'past' | 'current' | 'future' | 'uploaded' | 'paid'
  payout: any | null
}

// Option 2: request payment while confirming no invoice will be provided
function NoInvoiceOption({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [checked, setChecked] = useState(false)
  return (
    <div style={{ background: 'rgba(240,235,227,0.03)', border: '1px solid #242424', borderRadius: 10, padding: '12px 14px', maxWidth: 420 }}>
      <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.75rem', marginBottom: 8 }}>Je n&apos;ai pas de facture à déposer</p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 2, accentColor: '#a78bfa' }} />
        <span style={{ color: 'rgba(240,235,227,0.6)', fontSize: '0.72rem', lineHeight: 1.4 }}>Je confirme ne pas avoir de facture à fournir pour ce mois.</span>
      </label>
      <button
        onClick={onConfirm}
        disabled={!checked || disabled}
        style={{ background: checked ? 'rgba(167,139,250,0.15)' : 'rgba(240,235,227,0.04)', border: `1px solid ${checked ? 'rgba(167,139,250,0.4)' : '#2a2a2a'}`, borderRadius: 8, padding: '8px 16px', color: checked ? '#a78bfa' : 'rgba(240,235,227,0.25)', cursor: checked && !disabled ? 'pointer' : 'default', fontSize: '0.75rem', fontWeight: 700 }}
      >
        Envoyer la demande de paiement
      </button>
    </div>
  )
}

export default function FreelancerFacturationPage() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openMonth, setOpenMonth] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const currentMonth = new Date().toISOString().slice(0, 7)

  async function load() {
    const data = await fetch('/api/monthly-payouts', { cache: 'no-store' }).then(r => r.json()).catch(() => [])
    setPayouts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const payoutMap: Record<string, any> = {}
  payouts.forEach(p => { payoutMap[p.month] = p })

  const months: MonthState[] = Array.from({ length: 12 }, (_, m) => {
    const key = `2026-${String(m + 1).padStart(2, '0')}`
    const payout = payoutMap[key] || null
    let status: MonthState['status']
    if (payout?.invoiceStatus === 'paid') status = 'paid'
    else if (payout?.invoiceStatus === 'uploaded') status = 'uploaded'
    else if (key === currentMonth) status = 'current'
    else if (key < currentMonth) status = 'past'
    else status = 'future'
    return { key, label: MONTHS_FR[m], status, payout }
  })

  const STYLES: Record<MonthState['status'], { border: string; bg: string; dot: string; label: string }> = {
    past:     { border: 'rgba(34,197,94,0.2)',   bg: 'rgba(34,197,94,0.04)',   dot: '#22c55e', label: 'Terminé' },
    paid:     { border: 'rgba(34,197,94,0.3)',   bg: 'rgba(34,197,94,0.07)',   dot: '#22c55e', label: 'Payé ✓' },
    uploaded: { border: 'rgba(232,121,249,0.3)',  bg: 'rgba(232,121,249,0.06)',  dot: '#e879f9', label: 'En attente de validation' },
    current:  { border: 'rgba(167,139,250,0.35)', bg: 'rgba(167,139,250,0.07)', dot: '#a78bfa', label: 'Mois en cours' },
    future:   { border: '#222',                  bg: 'transparent',            dot: '#333',    label: 'À venir' },
  }

  async function ensurePayout(monthKey: string) {
    let payout = payoutMap[monthKey]
    if (!payout) {
      const created = await fetch('/api/monthly-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: monthKey }) }).then(r => r.json())
      if (created.error) throw new Error(created.error)
      payout = created
    }
    return payout
  }

  async function handleUpload(monthKey: string, file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const payout = await ensurePayout(monthKey)
      const fd = new FormData()
      fd.append('file', file)
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (!upRes.ok) { setUploadError(upData.error || 'Erreur upload'); setUploading(false); return }
      await fetch('/api/monthly-payouts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: payout.id, invoiceUrl: upData.url }) })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3500)
      await load()
    } catch (e: any) {
      setUploadError(e.message || 'Erreur réseau')
    }
    setUploading(false)
  }

  // Payment request WITHOUT an invoice (freelancer confirmed they have none)
  async function requestWithoutInvoice(monthKey: string) {
    setUploadError(null)
    setUploading(true)
    try {
      const payout = await ensurePayout(monthKey)
      await fetch('/api/monthly-payouts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: payout.id, requestPayment: true }) })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3500)
      await load()
    } catch (e: any) {
      setUploadError(e.message || 'Erreur réseau')
    }
    setUploading(false)
  }

  const totalEarned = payouts.reduce((a, p) => a + (p.validatedAmount || 0), 0)
  const totalPaid = payouts.filter(p => p.invoiceStatus === 'paid').reduce((a, p) => a + (p.validatedAmount || 0), 0)

  const openData = openMonth ? months.find(m => m.key === openMonth) : null

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Facturation</h1>
        <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.78rem', marginTop: 4 }}>Cliquez sur un mois pour voir le détail et déposer votre facture.</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total généré</p>
          <p style={{ color: '#a78bfa', fontSize: '1.4rem', fontWeight: 800 }}>{totalEarned.toLocaleString('fr-FR')} €</p>
        </div>
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total reçu</p>
          <p style={{ color: '#22c55e', fontSize: '1.4rem', fontWeight: 800 }}>{totalPaid.toLocaleString('fr-FR')} €</p>
        </div>
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>En attente</p>
          <p style={{ color: '#c4b5fd', fontSize: '1.4rem', fontWeight: 800 }}>{(totalEarned - totalPaid).toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : (
        <>
          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {months.map(m => {
              const st = STYLES[m.status]
              const isOpen = openMonth === m.key
              const clickable = m.status !== 'future'
              return (
                <button
                  key={m.key}
                  onClick={() => clickable && setOpenMonth(isOpen ? null : m.key)}
                  style={{
                    background: st.bg, border: `1px solid ${isOpen ? st.dot : st.border}`, borderRadius: 12,
                    padding: '14px 16px', textAlign: 'left', cursor: clickable ? 'pointer' : 'default',
                    opacity: m.status === 'future' ? 0.4 : 1, transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                    <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 700 }}>{m.label}</p>
                  </div>
                  <p style={{ color: st.dot, fontSize: '0.68rem', fontWeight: 600 }}>{st.label}</p>
                  <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.78rem', fontWeight: 700, marginTop: 4 }}>
                    {(m.payout?.validatedAmount || 0).toLocaleString('fr-FR')} €
                  </p>
                </button>
              )
            })}
          </div>

          {/* Detail panel */}
          {openData && (
            <div style={{ background: '#141414', border: `1px solid ${STYLES[openData.status].dot}40`, borderRadius: 14, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ color: '#f0ebe3', fontSize: '1rem', fontWeight: 800 }}>{openData.label} 2026</p>
                <button onClick={() => setOpenMonth(null)} style={{ background: 'none', border: 'none', color: 'rgba(240,235,227,0.3)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <p style={LA}>Montant validé</p>
                  <p style={{ color: '#22c55e', fontSize: '1.3rem', fontWeight: 800 }}>{(openData.payout?.validatedAmount || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div>
                  <p style={LA}>Prestations réalisées</p>
                  <p style={{ color: '#f0ebe3', fontSize: '1.3rem', fontWeight: 800 }}>{openData.payout?.projectCount || 0}</p>
                </div>
                <div>
                  <p style={LA}>Statut</p>
                  <p style={{ color: STYLES[openData.status].dot, fontSize: '0.85rem', fontWeight: 700, marginTop: 6 }}>{STYLES[openData.status].label}</p>
                  {openData.payout?.paidAt && <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.68rem', marginTop: 2 }}>payé le {new Date(openData.payout.paidAt).toLocaleDateString('fr-FR')}</p>}
                </div>
              </div>

              {success && <p style={{ color: '#22c55e', fontSize: '0.78rem', marginBottom: 10 }}>✓ Demande envoyée — Axel a été notifié</p>}
              {uploadError && <p style={{ color: '#fb7185', fontSize: '0.78rem', marginBottom: 10 }}>{uploadError}</p>}

              {openData.status !== 'paid' && (
                <div>
                  <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.72rem', marginBottom: 10 }}>Demander le paiement — deux options :</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Option 1: upload the invoice */}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0ebe3', color: '#0a0a0a', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: uploading ? 'default' : 'pointer', fontSize: '0.8rem', opacity: uploading ? 0.6 : 1, alignSelf: 'flex-start' }}>
                      {uploading ? 'Envoi en cours…' : openData.payout?.invoiceUrl ? '📄 Remplacer la facture' : '📄 Déposer une facture (PDF ou image)'}
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        disabled={uploading}
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(openData.key, file)
                          e.target.value = ''
                        }}
                      />
                    </label>

                    {/* Option 2: no invoice to provide */}
                    {!openData.payout?.invoiceUrl && openData.status !== 'uploaded' && (
                      <NoInvoiceOption disabled={uploading} onConfirm={() => requestWithoutInvoice(openData.key)} />
                    )}
                  </div>
                  {openData.payout?.invoiceUrl && (
                    <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginTop: 10 }}>
                      Facture actuelle : <a href={openData.payout.invoiceUrl} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc' }}>voir le document ↗</a>
                    </p>
                  )}
                  {openData.status === 'uploaded' && !openData.payout?.invoiceUrl && (
                    <p style={{ color: '#e879f9', fontSize: '0.72rem', marginTop: 10 }}>Demande de paiement envoyée sans facture — en attente de validation.</p>
                  )}
                </div>
              )}
              {openData.status === 'paid' && openData.payout?.invoiceUrl && (
                <a href={openData.payout.invoiceUrl} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc', fontSize: '0.78rem' }}>📄 Voir la facture ↗</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
