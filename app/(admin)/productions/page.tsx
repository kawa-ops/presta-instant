'use client'
import { useState, useMemo, useEffect } from 'react'
import { useCached } from '@/lib/useCached'
import Timeline from '@/components/Timeline'
import Thread from '@/components/Thread'

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'a_faire', label: 'À faire', color: '#8b7fb8' },
  { value: 'en_cours', label: 'En cours', color: '#a5b4fc' },
  { value: 'revisions', label: 'Retours à faire', color: '#e879f9' },
  { value: 'livre', label: 'À valider', color: '#a78bfa' },
  { value: 'envoye_client', label: 'Envoyé client', color: '#c7d2fe' },
  { value: 'retours_client', label: 'Retours client', color: '#ec4899' },
  { value: 'valide', label: 'Terminé', color: '#22c55e' },
]
const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: '#fb7185' },
  { value: 'high', label: 'Haute', color: '#e879f9' },
  { value: 'normal', label: 'Normale', color: '#8b7fb8' },
  { value: 'low', label: 'Basse', color: '#5b5273' },
]
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

const RATE_TYPES = [
  { key: 'filming', label: 'Tournage' },
  { key: 'editing', label: 'Montage' },
  { key: 'filming_editing', label: 'Tournage + Montage' },
  { key: 'retouche', label: 'Retouche photo' },
]

const sc = (s: string) => STATUSES.find(x => x.value === s)?.color || '#8b7fb8'
const sl = (s: string) => STATUSES.find(x => x.value === s)?.label || (s === 'en_attente' ? 'En attente' : s)
const pc = (p: string) => PRIORITIES.find(x => x.value === p)?.color || '#8b7fb8'
const pl = (p: string) => PRIORITIES.find(x => x.value === p)?.label || p
const fmtDate = (d: string | null) => { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

function parseRates(f: any): Record<string, number> {
  try { return f?.rates ? JSON.parse(f.rates) : {} } catch { return {} }
}

const IN: React.CSSProperties = { background: 'rgba(12,8,26,0.8)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '8px 12px', color: '#f0ebe3', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' }
const LA: React.CSSProperties = { display: 'block', color: 'rgba(240,235,227,0.4)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }

function F({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} style={IN} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}
function TA({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea style={{ ...IN, minHeight: 64, resize: 'vertical' as const }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}
function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (sortBy !== col) return <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.6rem', marginLeft: 3 }}>⇅</span>
  return <span style={{ color: '#f0ebe3', fontSize: '0.6rem', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

// Price selector: negotiated rates dropdown + hourly mode + custom price fallback
function PriceSelect({ freelancer, price, onChange }: { freelancer: any; price: string; onChange: (v: string) => void }) {
  const rates = parseRates(freelancer)
  const entries = RATE_TYPES.filter(rt => rates[rt.key])
  const hourlyRate = rates['hourly']
  const matched = entries.find(rt => rates[rt.key]?.toString() === price)
  const [mode, setMode] = useState<string>(matched ? matched.key : price !== '' ? '__custom' : '')
  const [hours, setHours] = useState('')

  if (entries.length === 0 && !hourlyRate) {
    return <F type="number" value={price} onChange={onChange} placeholder="0" />
  }

  const hourlyTotal = hourlyRate && hours ? Math.round(parseFloat(hours) * hourlyRate * 100) / 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <select
        style={IN}
        value={mode}
        onChange={e => {
          const v = e.target.value
          setMode(v)
          if (v === '__custom') { onChange(''); return }
          if (v === '__hourly') { setHours(''); onChange(''); return }
          const rate = rates[v]
          onChange(rate ? rate.toString() : '')
        }}
      >
        <option value="">— Choisir un tarif —</option>
        {entries.map(rt => <option key={rt.key} value={rt.key}>{rt.label} ({rates[rt.key]} €)</option>)}
        {hourlyRate && <option value="__hourly">Taux horaire ({hourlyRate} €/h)</option>}
        <option value="__custom">Prix personnalisé…</option>
      </select>

      {mode === '__hourly' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            style={{ ...IN, width: 90 }}
            value={hours}
            min="0"
            step="0.5"
            onChange={e => {
              setHours(e.target.value)
              const h = parseFloat(e.target.value)
              onChange(!isNaN(h) && h > 0 ? (Math.round(h * hourlyRate * 100) / 100).toString() : '')
            }}
            placeholder="Heures"
          />
          <span style={{ color: 'rgba(240,235,227,0.4)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
            h × {hourlyRate} € = <strong style={{ color: '#22c55e' }}>{hourlyTotal.toLocaleString('fr-FR')} €</strong>
          </span>
        </div>
      )}

      {mode === '__custom' && <F type="number" value={price} onChange={onChange} placeholder="Montant personnalisé (€)" />}
    </div>
  )
}

function Confetti() {
  const colors = ['#22c55e', '#a78bfa', '#eab308', '#a5b4fc', '#f0ebe3']
  const dots = Array.from({ length: 18 }, (_, i) => ({
    left: 10 + Math.random() * 80,
    delay: Math.random() * 0.15,
    color: colors[i % colors.length],
    tx: (Math.random() - 0.5) * 120,
    size: 4 + Math.random() * 4,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`@keyframes confetti-pop { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-70px) translateX(var(--tx)) scale(0.4); opacity: 0; } }`}</style>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: 'absolute', bottom: 8, left: `${d.left}%`, width: d.size, height: d.size,
          background: d.color, borderRadius: '50%',
          animation: `confetti-pop 0.9s ease-out ${d.delay}s forwards`,
          ['--tx' as any]: `${d.tx}px`,
        }} />
      ))}
    </div>
  )
}

// Ready-to-send client message for the final delivery
function buildDeliveryMessage(clientName: string, link: string) {
  return `Bonjour ${clientName},

Merci d'avoir validé votre vidéo !

Pour confirmer, il n'y a plus de modifications en attente.

Voici votre version finale téléchargeable :
${link || '[lien à coller]'}

Vous pouvez dès maintenant la télécharger et la publier sur vos réseaux.

Encore merci pour votre confiance !

Belle journée,
L'équipe instant.`
}

function ProdRow({ p, freelancers, onSave, onDelete, onComplete, onQuickStatus, onFeedback, onFinalSend, saving, celebrating }: {
  p: any; freelancers: any[]; onSave: (d: any) => void; onDelete: () => void; onComplete: () => void
  onQuickStatus: (status: string) => void; onFeedback: (comment: string) => void; onFinalSend: (finalLink: string) => void
  saving: boolean; celebrating: boolean
}) {
  const [finalLink, setFinalLink] = useState(p.finalLink || '')
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [shareLabel, setShareLabel] = useState('🔗 Lien client')
  const [form, setForm] = useState({
    title: p.title, client: p.client, brief: p.brief || '', sourcesLink: p.sourcesLink || '',
    deliveryLink: p.deliveryLink || '', priority: p.priority, status: p.status,
    price: p.price?.toString() || '', clientPrice: p.clientPrice?.toString() || '',
    deadline: p.deadline ? p.deadline.split('T')[0] : '',
    productionDate: p.productionDate ? p.productionDate.split('T')[0] : '',
    internalNotes: p.internalNotes || '', assignedToId: p.assignedToId || '',
  })

  async function copyShareLink() {
    const res = await fetch(`/api/productions/${p.id}/share`, { method: 'POST' })
    const d = await res.json()
    if (res.ok && d.url) {
      try { await navigator.clipboard.writeText(d.url) } catch {}
      setShareLabel('✓ Copié !')
      setTimeout(() => setShareLabel('🔗 Lien client'), 2500)
    }
  }

  const margin = form.clientPrice && form.price ? parseFloat(form.clientPrice) - parseFloat(form.price) : null
  const s = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const assignedFreelancer = freelancers.find((f: any) => f.id === form.assignedToId)
  const isFreelancer = !!assignedFreelancer
  const isFreelanceProject = !!freelancers.find((f: any) => f.id === p.assignedToId)
  const isOverdue = p.deadline && new Date(p.deadline) < new Date() && !['valide'].includes(p.status)
  // Rows demanding Lucas's attention glow until the action is done
  const clientApproved = !!p.clientApprovedAt && p.status !== 'valide'
  const needsAttention = ['livre', 'retours_client', 'revisions'].includes(p.status) || clientApproved

  return (
    <>
      <tr
        onClick={() => setOpen(!open)}
        style={{
          borderBottom: '1px solid rgba(167,139,250,0.08)', cursor: 'pointer', position: 'relative',
          background: celebrating ? 'rgba(34,197,94,0.12)' : needsAttention ? 'rgba(199,210,254,0.05)' : open ? 'rgba(240,235,227,0.02)' : 'transparent',
          boxShadow: needsAttention ? 'inset 3px 0 0 #38bdf8' : 'none',
          animation: needsAttention ? 'row-glow 2.2s ease-in-out infinite' : 'none',
          transition: 'background 0.4s ease, opacity 0.5s ease',
          opacity: celebrating ? 0.9 : 1,
        }}
      >
        <td style={{ padding: '11px 14px', color: '#f0ebe3', fontSize: '0.8rem', fontWeight: 600, position: 'relative' }}>
          {celebrating && <Confetti />}
          {p.title}<br /><span style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem', fontWeight: 400 }}>{p.client}</span>
        </td>
        <td style={{ padding: '11px 14px', color: 'rgba(240,235,227,0.5)', fontSize: '0.75rem' }}>{fmtDate(p.productionDate)}</td>
        <td style={{ padding: '11px 14px' }}>
          <span style={{ color: isOverdue ? '#fb7185' : 'rgba(240,235,227,0.5)', fontSize: '0.75rem', fontWeight: isOverdue ? 700 : 400 }}>{fmtDate(p.deadline)}</span>
        </td>
        <td style={{ padding: '11px 14px' }}>
          <span style={{ background: `${pc(p.priority)}15`, color: pc(p.priority), padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700 }}>{pl(p.priority)}</span>
        </td>
        <td style={{ padding: '11px 14px', color: 'rgba(240,235,227,0.5)', fontSize: '0.75rem' }}>{p.assignedTo?.name || 'Lucas'}</td>
        <td style={{ padding: '11px 14px', color: p.price ? '#f0ebe3' : 'rgba(240,235,227,0.2)', fontSize: '0.75rem' }}>{p.price ? `${p.price.toLocaleString('fr-FR')} €` : '—'}</td>
        <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
          {celebrating ? (
            <span style={{ background: `${sc('valide')}15`, color: sc('valide'), padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>Terminé ✓</span>
          ) : (
            <select
              value={p.status}
              onChange={e => onQuickStatus(e.target.value)}
              style={{ background: `${sc(p.status)}15`, color: sc(p.status), padding: '3px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, border: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {STATUSES.filter(s => s.value).map(s => <option key={s.value} value={s.value} style={{ background: '#141414', color: '#f0ebe3' }}>{s.label}</option>)}
            </select>
          )}
        </td>
        <td style={{ padding: '11px 14px' }}>
          {p.sourcesLink ? <a href={p.sourcesLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#a5b4fc', fontSize: '0.72rem' }}>↗ Source</a> : <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.72rem' }}>—</span>}
        </td>
        <td style={{ padding: '11px 14px' }}>
          {p.deliveryLink ? <a href={p.deliveryLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#22c55e', fontSize: '0.72rem' }}>↗ Livraison</a> : <span style={{ color: 'rgba(240,235,227,0.15)', fontSize: '0.72rem' }}>—</span>}
        </td>
        <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onComplete}
              title="Marquer comme terminé"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '4px 9px', color: '#22c55e', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
            >✓</button>
            <button onClick={onDelete} style={{ background: 'rgba(251,113,133,0.08)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#fb7185', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
          </div>
        </td>
      </tr>
      {open && !celebrating && (
        <tr style={{ background: '#0f0f0f' }}>
          <td colSpan={10} style={{ padding: '18px 20px', borderBottom: '1px solid rgba(167,139,250,0.08)' }}>
            {/* Production timeline + client link */}
            <div style={{ background: 'rgba(26,18,48,0.5)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button onClick={copyShareLink} title="Copier le lien de suivi public à envoyer au client" style={{ background: 'rgba(199,210,254,0.08)', border: '1px solid rgba(199,210,254,0.25)', borderRadius: 7, padding: '5px 12px', color: '#c7d2fe', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                  {shareLabel}
                </button>
              </div>
              <Timeline status={p.status} isFreelance={isFreelanceProject} />
            </div>

            {/* Workflow actions */}
            {(p.status === 'livre' || p.status === 'envoye_client' || p.status === 'retours_client') && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.status === 'livre' && (
                    <>
                      <button onClick={() => onQuickStatus('envoye_client')} style={{ background: '#22c55e', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}>
                        ✓ Approuver → envoyer au client
                      </button>
                      <button onClick={() => setFeedbackOpen(!feedbackOpen)} style={{ background: 'rgba(232,121,249,0.1)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}>
                        ✎ Demander des modifications
                      </button>
                    </>
                  )}
                  {p.status === 'envoye_client' && (
                    <button onClick={() => onQuickStatus('retours_client')} style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}>
                      💬 Retours client reçus
                    </button>
                  )}
                  {p.status === 'retours_client' && (
                    <>
                      <button onClick={() => setFeedbackOpen(!feedbackOpen)} style={{ background: 'rgba(232,121,249,0.1)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}>
                        ✎ Transmettre les retours au prestataire
                      </button>
                      <button onClick={onComplete} style={{ background: '#22c55e', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}>
                        🎉 Validation finale
                      </button>
                    </>
                  )}
                </div>
                {feedbackOpen && (
                  <div style={{ background: 'rgba(232,121,249,0.04)', border: '1px solid rgba(232,121,249,0.2)', borderRadius: 10, padding: 14 }}>
                    <label style={LA}>Commentaires pour le prestataire</label>
                    <TA value={feedbackText} onChange={setFeedbackText} placeholder="Décris précisément les modifications à faire…" />
                    <button
                      onClick={() => { if (feedbackText.trim()) { onFeedback(feedbackText.trim()); setFeedbackText(''); setFeedbackOpen(false) } }}
                      style={{ marginTop: 8, background: '#e879f9', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}
                    >Envoyer les retours</button>
                  </div>
                )}
              </div>
            )}

            {/* Final delivery workflow — appears once the client approved */}
            {clientApproved && (
              <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(199,210,254,0.04))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <p style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 800, marginBottom: 4 }}>🎉 Le client a approuvé la vidéo !</p>
                <p style={{ color: 'rgba(240,235,227,0.45)', fontSize: '0.74rem', marginBottom: 14 }}>Prépare l&apos;export final, colle le lien de téléchargement, envoie le message au client, puis confirme.</p>

                <label style={LA}>Lien de téléchargement final (Drive, WeTransfer…)</label>
                <input style={IN} value={finalLink} onChange={e => setFinalLink(e.target.value)} placeholder="https://…" />

                <label style={{ ...LA, marginTop: 12 }}>Message prêt à envoyer au client</label>
                <textarea
                  readOnly
                  value={buildDeliveryMessage(p.client, finalLink)}
                  style={{ ...IN, minHeight: 170, resize: 'vertical', color: 'rgba(240,235,227,0.75)', fontSize: '0.78rem', lineHeight: 1.5 }}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => { try { await navigator.clipboard.writeText(buildDeliveryMessage(p.client, finalLink)) } catch {}; setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    style={{ background: 'rgba(240,235,227,0.06)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '9px 16px', color: 'rgba(240,235,227,0.7)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >{copied ? '✓ Copié !' : '📋 Copier le message'}</button>
                  <button
                    onClick={() => { if (!finalLink.trim()) { alert('Colle d\'abord le lien de téléchargement final.'); return } onFinalSend(finalLink.trim()) }}
                    style={{ background: '#22c55e', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
                  >📦 J&apos;ai envoyé la livraison finale</button>
                </div>
              </div>
            )}

            {p.lastFeedback && p.status === 'revisions' && (
              <div style={{ background: 'rgba(232,121,249,0.05)', border: '1px solid rgba(232,121,249,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ color: '#e879f9', fontSize: '0.68rem', fontWeight: 700, marginBottom: 4 }}>DERNIERS RETOURS ENVOYÉS</p>
                <p style={{ color: 'rgba(240,235,227,0.7)', fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>{p.lastFeedback}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div><label style={LA}>Titre</label><F value={form.title} onChange={s('title')} /></div>
              <div><label style={LA}>Client</label><F value={form.client} onChange={s('client')} /></div>
              <div><label style={LA}>Date de la prestation</label><F type="date" value={form.productionDate} onChange={s('productionDate')} /></div>
              <div><label style={LA}>Deadline</label><F type="date" value={form.deadline} onChange={s('deadline')} /></div>
              <div>
                <label style={LA}>Priorité</label>
                <select style={IN} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={LA}>Assigné à</label>
                <select style={IN} value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                  <option value="">Lucas (par défaut)</option>
                  {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              {isFreelancer && <div><label style={LA}>Prix du prestataire (€)</label><PriceSelect freelancer={assignedFreelancer} price={form.price} onChange={s('price')} /></div>}
              <div>
                <label style={LA}>Prix client (€)</label>
                <F type="number" value={form.clientPrice} onChange={s('clientPrice')} placeholder="Facturé au client" />
                {margin !== null && !isNaN(margin) && (
                  <p style={{ color: margin >= 0 ? '#22c55e' : '#fb7185', fontSize: '0.68rem', marginTop: 4, fontWeight: 700 }}>
                    Marge : {margin.toLocaleString('fr-FR')} €
                  </p>
                )}
              </div>
              <div><label style={LA}>Lien sources</label><F value={form.sourcesLink} onChange={s('sourcesLink')} placeholder="WeTransfer, Drive…" /></div>
              <div><label style={LA}>Lien livraison</label><F value={form.deliveryLink} onChange={s('deliveryLink')} placeholder="Drive, Dropbox…" /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={LA}>Notes internes (admin uniquement)</label><TA value={form.internalNotes} onChange={s('internalNotes')} placeholder="Notes visibles uniquement par les admins" /></div>
              {isFreelancer && <div style={{ gridColumn: '1/-1' }}><label style={LA}>Brief pour le prestataire</label><TA value={form.brief} onChange={s('brief')} placeholder="Instructions pour le prestataire…" /></div>}
            </div>
            <button onClick={() => onSave(form)} disabled={saving} style={{ marginTop: 14, background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>

            {/* Discussion + version history — lazy-loaded */}
            <Thread productionId={p.id} />
          </td>
        </tr>
      )}
    </>
  )
}

const EMPTY_FORM = { title: '', client: '', brief: '', sourcesLink: '', priority: 'normal', status: 'a_faire', price: '', deadline: '', productionDate: '', internalNotes: '', assignedToId: '' }

export default function ProductionsPage() {
  const { data: prodsData, loading, mutate } = useCached<any[]>('productions', '/api/productions')
  const { data: freelancersData } = useCached<any[]>('freelancers', '/api/freelancers')
  const prods = Array.isArray(prodsData) ? prodsData : []
  const freelancers = Array.isArray(freelancersData) ? freelancersData : []

  const [filterStatus, setFilterStatus] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('deadline')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [celebrating, setCelebrating] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const setProds = (updater: (prev: any[]) => any[]) => mutate(prev => updater(Array.isArray(prev) ? prev : []))

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const sf = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const newFreelancer = freelancers.find((f: any) => f.id === form.assignedToId)

  const visibleProds = useMemo(() => {
    let list = prods
    if (filterStatus) list = list.filter(p => p.status === filterStatus)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.client?.toLowerCase().includes(q) ||
        p.assignedTo?.name?.toLowerCase().includes(q))
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      let va: any, vb: any
      switch (sortBy) {
        case 'priority': va = PRIORITY_ORDER[a.priority] ?? 9; vb = PRIORITY_ORDER[b.priority] ?? 9; break
        case 'price': va = a.price ?? -1; vb = b.price ?? -1; break
        case 'deadline': va = a.deadline ? new Date(a.deadline).getTime() : Infinity; vb = b.deadline ? new Date(b.deadline).getTime() : Infinity; break
        case 'productionDate': va = a.productionDate ? new Date(a.productionDate).getTime() : Infinity; vb = b.productionDate ? new Date(b.productionDate).getTime() : Infinity; break
        case 'assignee': va = (a.assignedTo?.name || 'Lucas').toLowerCase(); vb = (b.assignedTo?.name || 'Lucas').toLowerCase(); break
        case 'title': va = a.title?.toLowerCase() || ''; vb = b.title?.toLowerCase() || ''; break
        case 'client': va = a.client?.toLowerCase() || ''; vb = b.client?.toLowerCase() || ''; break
        case 'status': va = a.status; vb = b.status; break
        default: va = 0; vb = 0
      }
      if (va < vb) return -dir
      if (va > vb) return dir
      return 0
    })
  }, [prods, filterStatus, search, sortBy, sortDir])

  const counts = useMemo(() => {
    const c: Record<string, number> = { '': prods.length }
    prods.forEach(p => { c[p.status] = (c[p.status] || 0) + 1 })
    return c
  }, [prods])

  async function createProd() {
    setCreateError('')
    if (!form.title.trim() || !form.client.trim()) { setCreateError('Titre et client sont requis'); return }
    setSaving('new')
    try {
      const res = await fetch('/api/productions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Erreur lors de la création'); setSaving(null); return }
      setProds(prev => [data, ...prev])
      setShowNew(false)
      setForm({ ...EMPTY_FORM })
    } catch {
      setCreateError('Erreur réseau')
    }
    setSaving(null)
  }

  async function updateProd(id: string, data: any) {
    setSaving(id)
    try {
      const res = await fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const updated = await res.json()
      if (res.ok) setProds(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    } catch {}
    setSaving(null)
  }

  async function deleteProd(id: string) {
    if (!confirm('Supprimer cette prestation ?')) return
    const prev = prods
    setProds(p => p.filter(x => x.id !== id))
    const res = await fetch(`/api/productions/${id}`, { method: 'DELETE' })
    if (!res.ok) setProds(() => prev)
  }

  async function quickStatus(id: string, status: string) {
    // "Terminé" always goes through the completion flow (archive + confetti)
    if (status === 'valide') { completeProd(id); return }
    setProds(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).catch(() => {})
  }

  async function sendFeedback(id: string, comment: string) {
    setProds(prev => prev.map(p => p.id === id ? { ...p, status: 'revisions', lastFeedback: comment } : p))
    fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedback: comment }) }).catch(() => {})
  }

  async function completeProd(id: string) {
    if (!confirm('Marquer ce projet comme terminé et validé ?')) return
    setCelebrating(id)
    fetch(`/api/productions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'valide', archived: true }) }).catch(() => {})
    setTimeout(() => {
      setProds(prev => prev.filter(p => p.id !== id))
      setCelebrating(null)
    }, 1300)
  }

  // Final delivery confirmed → project fully completed and archived
  async function finalSend(id: string, finalLink: string) {
    setCelebrating(id)
    fetch(`/api/productions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalLink, finalDeliverySent: true, status: 'valide', archived: true }),
    }).catch(() => {})
    setTimeout(() => {
      setProds(prev => prev.filter(p => p.id !== id))
      setCelebrating(null)
    }, 1300)
  }

  // Deep-link from dashboard notifications: /productions?focus=<titre>
  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get('focus')
    if (focus) setSearch(focus)
  }, [])

  // Priority Validation Center counts
  const priority = useMemo(() => {
    const validations = prods.filter(p => p.status === 'livre').length
    const retours = prods.filter(p => p.status === 'retours_client').length
    const finals = prods.filter(p => p.clientApprovedAt && p.status !== 'valide').length
    const late = prods.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status !== 'valide').length
    return { validations, retours, finals, late, total: validations + retours + finals }
  }, [prods])

  const thStyle: React.CSSProperties = { padding: '10px 14px', color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', textAlign: 'left' }

  return (
    <div style={{ width: '100%' }}>
      <style>{`@keyframes row-glow { 0%, 100% { background-color: rgba(199,210,254,0.04); } 50% { background-color: rgba(199,210,254,0.09); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 800 }}>Post-productions</h1>
        <button onClick={() => { setShowNew(true); setCreateError('') }} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>+ Nouvelle prestation</button>
      </div>

      {/* Priority Validation Center */}
      {!loading && (
        priority.total === 0 ? (
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>✅</span>
            <p style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 700 }}>Rien à valider — tout est traité !</p>
            {priority.late > 0 && <p style={{ color: '#fb7185', fontSize: '0.75rem', marginLeft: 'auto' }}>⚠ {priority.late} en retard tout de même</p>}
          </div>
        ) : (
          <div style={{ background: 'rgba(199,210,254,0.05)', border: '1px solid rgba(199,210,254,0.25)', borderRadius: 12, padding: '14px 20px', marginBottom: 14 }}>
            <p style={{ color: '#c7d2fe', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>🎯 À traiter en priorité</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {priority.validations > 0 && (
                <button onClick={() => setFilterStatus('livre')} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ color: '#a78bfa', fontSize: '1.1rem', fontWeight: 800 }}>{priority.validations}</p>
                  <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.7rem' }}>validation{priority.validations > 1 ? 's' : ''} en attente</p>
                </button>
              )}
              {priority.retours > 0 && (
                <button onClick={() => setFilterStatus('retours_client')} style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ color: '#ec4899', fontSize: '1.1rem', fontWeight: 800 }}>{priority.retours}</p>
                  <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.7rem' }}>retour{priority.retours > 1 ? 's' : ''} client à traiter</p>
                </button>
              )}
              {priority.finals > 0 && (
                <button onClick={() => setFilterStatus('')} style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 800 }}>{priority.finals}</p>
                  <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.7rem' }}>livraison{priority.finals > 1 ? 's' : ''} finale{priority.finals > 1 ? 's' : ''} à envoyer 🎉</p>
                </button>
              )}
              {priority.late > 0 && (
                <div style={{ background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.25)', borderRadius: 10, padding: '10px 16px' }}>
                  <p style={{ color: '#fb7185', fontSize: '1.1rem', fontWeight: 800 }}>{priority.late}</p>
                  <p style={{ color: 'rgba(240,235,227,0.55)', fontSize: '0.7rem' }}>en retard</p>
                </div>
              )}
            </div>
          </div>
        )
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Rechercher par titre, client ou prestataire…"
          style={{ ...IN, maxWidth: 420, padding: '10px 14px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filterStatus === s.value ? (s.color || '#f0ebe3') : '#2a2a2a'}`, background: filterStatus === s.value ? `${s.color || '#f0ebe3'}15` : 'transparent', color: filterStatus === s.value ? (s.color || '#f0ebe3') : 'rgba(240,235,227,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>
            {s.label} ({counts[s.value] || 0})
          </button>
        ))}
      </div>

      {showNew && (
        <div style={{ background: 'rgba(26,18,48,0.7)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <p style={{ color: '#f0ebe3', fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Nouvelle prestation</p>
          {createError && <p style={{ color: '#fb7185', fontSize: '0.78rem', marginBottom: 12, background: 'rgba(251,113,133,0.08)', padding: '8px 12px', borderRadius: 6 }}>{createError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div><label style={LA}>Titre *</label><F value={form.title} onChange={sf('title')} placeholder="Titre de la prestation" /></div>
            <div><label style={LA}>Client *</label><F value={form.client} onChange={sf('client')} placeholder="Nom du client" /></div>
            <div><label style={LA}>Date de la prestation</label><F type="date" value={form.productionDate} onChange={sf('productionDate')} /></div>
            <div><label style={LA}>Deadline</label><F type="date" value={form.deadline} onChange={sf('deadline')} /></div>
            <div>
              <label style={LA}>Priorité</label>
              <select style={IN} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LA}>Statut</label>
              <select style={IN} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LA}>Assigné à</label>
              <select style={IN} value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Lucas (par défaut)</option>
                {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {newFreelancer && <div><label style={LA}>Prix du prestataire (€)</label><PriceSelect freelancer={newFreelancer} price={form.price} onChange={sf('price')} /></div>}
            <div><label style={LA}>Lien sources</label><F value={form.sourcesLink} onChange={sf('sourcesLink')} placeholder="WeTransfer, Drive…" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={LA}>Notes internes (admin uniquement)</label><TA value={form.internalNotes} onChange={sf('internalNotes')} placeholder="Notes visibles uniquement par les admins" /></div>
            {newFreelancer && <div style={{ gridColumn: '1/-1' }}><label style={LA}>Brief pour le prestataire</label><TA value={form.brief} onChange={sf('brief')} placeholder="Instructions pour le prestataire…" /></div>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={createProd} disabled={saving === 'new'} style={{ background: '#f0ebe3', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', opacity: saving === 'new' ? 0.6 : 1 }}>
              {saving === 'new' ? 'Création…' : 'Créer la prestation'}
            </button>
            <button onClick={() => { setShowNew(false); setForm({ ...EMPTY_FORM }); setCreateError('') }} style={{ background: 'transparent', color: 'rgba(240,235,227,0.4)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: '0.82rem' }}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem' }}>Chargement…</p>
        </div>
      ) : visibleProds.length === 0 ? (
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(240,235,227,0.2)', fontSize: '0.82rem' }}>{search ? `Aucun résultat pour « ${search} »` : 'Aucune prestation'}</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(26,18,48,0.6)', border: '1px solid rgba(167,139,250,0.16)', borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
                <th style={thStyle} onClick={() => toggleSort('title')}>Titre / Client <SortIcon col="title" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('productionDate')}>Date prestation <SortIcon col="productionDate" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('deadline')}>Deadline <SortIcon col="deadline" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('priority')}>Priorité <SortIcon col="priority" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('assignee')}>Assigné à <SortIcon col="assignee" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('price')}>Prix <SortIcon col="price" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle} onClick={() => toggleSort('status')}>Statut <SortIcon col="status" sortBy={sortBy} sortDir={sortDir} /></th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Livraison</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {visibleProds.map(p => (
                <ProdRow
                  key={p.id}
                  p={p}
                  freelancers={freelancers}
                  onSave={data => updateProd(p.id, data)}
                  onDelete={() => deleteProd(p.id)}
                  onComplete={() => completeProd(p.id)}
                  onQuickStatus={status => quickStatus(p.id, status)}
                  onFeedback={comment => sendFeedback(p.id, comment)}
                  onFinalSend={link => finalSend(p.id, link)}
                  saving={saving === p.id}
                  celebrating={celebrating === p.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
