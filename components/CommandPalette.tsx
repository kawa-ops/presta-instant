'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/statuses'

// Global cmd+K command palette — searches productions (title, client) and
// providers. Keyboard: ↑↓ to move, Enter to open, Esc to close.

type Item =
  | { kind: 'prod'; id: string; title: string; client: string; status: string; archived: boolean; assignee?: string }
  | { kind: 'freelancer'; id: string; name: string; specialty?: string }

export default function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [sel, setSel] = useState(0)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQ(''); setItems([]); setSel(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    if (debounce.current) clearTimeout(debounce.current)
    if (q.trim().length < 2) { setItems([]); return }
    debounce.current = setTimeout(async () => {
      const d = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
      if (!d) return
      const list: Item[] = [
        ...(d.productions || []).map((p: any) => ({ kind: 'prod' as const, id: p.id, title: p.title, client: p.client, status: p.status, archived: p.archived, assignee: p.assignedTo?.name })),
        ...(d.freelancers || []).map((f: any) => ({ kind: 'freelancer' as const, id: f.id, name: f.name, specialty: f.specialty })),
      ]
      setItems(list)
      setSel(0)
    }, 180)
  }, [q, open])

  function openItem(item: Item) {
    setOpen(false)
    if (item.kind === 'prod') {
      if (isAdmin) router.push(item.archived ? '/archives' : `/productions?focus=${encodeURIComponent(item.title)}`)
      else router.push(item.status === 'valide' ? '/espace/archives' : '/espace/prestations')
    } else {
      router.push('/prestataires')
    }
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && items[sel]) { e.preventDefault(); openItem(items[sel]) }
  }

  if (!open) return null

  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(10,6,24,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(26,18,48,0.97)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 16, width: 'min(560px, 92vw)', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder={isAdmin ? 'Rechercher une production, un client, un prestataire…' : 'Rechercher une production, un client…'}
          style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', padding: '16px 20px', color: '#f0ebe3', fontSize: '0.95rem', borderBottom: items.length > 0 ? '1px solid rgba(167,139,250,0.15)' : 'none' }}
        />
        {q.trim().length >= 2 && items.length === 0 && (
          <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.78rem', padding: '14px 20px' }}>Aucun résultat</p>
        )}
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {items.map((item, i) => (
            <div
              key={`${item.kind}-${item.id}`}
              onClick={() => openItem(item)}
              onMouseEnter={() => setSel(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', background: sel === i ? 'rgba(167,139,250,0.12)' : 'transparent', borderLeft: sel === i ? '2px solid #a78bfa' : '2px solid transparent' }}
            >
              {item.kind === 'prod' ? (
                <>
                  <span style={{ fontSize: '0.95rem' }}>🎬</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                    <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem' }}>{item.client}{item.assignee ? ` · ${item.assignee}` : ''}</p>
                  </div>
                  <span style={{ background: `${STATUS_COLORS[item.status] || '#8b7fb8'}18`, color: STATUS_COLORS[item.status] || '#8b7fb8', padding: '1px 8px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {item.archived ? 'Archivée' : STATUS_LABELS[item.status] || item.status}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.95rem' }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#f0ebe3', fontSize: '0.82rem', fontWeight: 700 }}>{item.name}</p>
                    {item.specialty && <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.68rem' }}>{item.specialty}</p>}
                  </div>
                  <span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.62rem' }}>Prestataire</span>
                </>
              )}
            </div>
          ))}
        </div>
        <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.64rem', padding: '8px 20px', borderTop: '1px solid rgba(167,139,250,0.1)' }}>↑↓ naviguer · Entrée ouvrir · Échap fermer</p>
      </div>
    </div>
  )
}
