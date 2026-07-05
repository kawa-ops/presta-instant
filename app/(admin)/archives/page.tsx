'use client'
import { useEffect, useState } from 'react'

function fmt(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }

export default function ArchivesPage() {
  const [prods, setProds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const data = await fetch('/api/productions?archived=true').then(r => r.json())
    setProds(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function unarchive(id: string) {
    await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) })
    load()
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Archives</h1>

      {loading ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Chargement…</p>
      ) : prods.length === 0 ? (
        <p style={{ color: 'rgba(240,235,227,0.2)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>Aucune prestation archivée</p>
      ) : (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
          {prods.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 20px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 600 }}>{p.title}</p>
                <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.72rem', marginTop: 2 }}>{p.client} · {p.assignedTo?.name || '—'} · {fmt(p.deadline)}</p>
              </div>
              <button onClick={() => unarchive(p.id)} style={{ background: 'rgba(240,235,227,0.05)', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 14px', color: 'rgba(240,235,227,0.5)', cursor: 'pointer', fontSize: '0.75rem' }}>Désarchiver</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
