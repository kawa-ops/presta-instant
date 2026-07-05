'use client'
import { useEffect, useState } from 'react'

function fmt(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }

export default function FacturationPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  async function load() {
    setLoading(true)
    const data = await fetch('/api/invoices').then(r => r.json())
    setInvoices(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markPaid(id: string) {
    await fetch(`/api/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette facture ?')) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = filter ? invoices.filter(i => i.status === filter) : invoices
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((a, i) => a + (i.amount || 0), 0)

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Facturation</h1>
        {totalPending > 0 && (
          <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, padding: '8px 16px' }}>
            <p style={{ color: '#eab308', fontSize: '0.78rem' }}>À payer : <strong>{totalPending.toLocaleString('fr-FR')} €</strong></p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ v: '', l: 'Toutes' }, { v: 'pending', l: 'En attente' }, { v: 'paid', l: 'Payées' }].map(({ v, l }) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === v ? '#f0ebe3' : '#2a2a2a'}`, background: filter === v ? 'rgba(240,235,227,0.07)' : 'transparent', color: filter === v ? '#f0ebe3' : 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.75rem' }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Aucune facture</p>
      ) : (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 100px 120px 120px 80px', padding: '10px 20px', borderBottom: '1px solid #1e1e1e' }}>
            {['Prestataire', 'Prestation', 'Montant', 'Statut', 'Date', ''].map(h => (
              <p key={h} style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
            ))}
          </div>
          {filtered.map(inv => (
            <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 100px 120px 120px 80px', padding: '13px 20px', borderBottom: '1px solid #1a1a1a', alignItems: 'center' }}>
              <p style={{ color: '#f0ebe3', fontSize: '0.82rem' }}>{inv.freelancer?.name || '—'}</p>
              <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '0.78rem' }}>{inv.production?.title || '—'}</p>
              <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>{inv.amount ? `${inv.amount.toLocaleString('fr-FR')} €` : '—'}</p>
              <span style={{ background: inv.status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', color: inv.status === 'paid' ? '#22c55e' : '#eab308', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, display: 'inline-block' }}>
                {inv.status === 'paid' ? 'Payée' : 'En attente'}
              </span>
              <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.75rem' }}>{fmt(inv.paidAt || inv.createdAt)}</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {inv.status === 'pending' && (
                  <button onClick={() => markPaid(inv.id)} style={{ background: 'rgba(34,197,94,0.1)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#22c55e', cursor: 'pointer', fontSize: '0.7rem' }}>✓ Payer</button>
                )}
                {inv.fileUrl && (
                  <a href={inv.fileUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(240,235,227,0.05)', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', color: 'rgba(240,235,227,0.5)', fontSize: '0.7rem', textDecoration: 'none' }}>↗</a>
                )}
                <button onClick={() => remove(inv.id)} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
