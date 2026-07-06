'use client'

// Visual production timeline with animated progress bar.
// Internal (Lucas) and freelancer projects follow slightly different flows.

const INTERNAL_STAGES = [
  { key: 'a_faire', label: 'Démarré' },
  { key: 'en_cours', label: 'Montage' },
  { key: 'envoye_client', label: 'Envoyé client' },
  { key: 'retours_client', label: 'Retours client' },
  { key: 'valide', label: 'Terminé' },
]

const FREELANCE_STAGES = [
  { key: 'a_faire', label: 'Assigné' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'livre', label: 'Validation Lucas' },
  { key: 'envoye_client', label: 'Envoyé client' },
  { key: 'retours_client', label: 'Retours client' },
  { key: 'valide', label: 'Terminé' },
]

export default function Timeline({ status, isFreelance }: { status: string; isFreelance: boolean }) {
  const stages = isFreelance ? FREELANCE_STAGES : INTERNAL_STAGES
  // 'revisions' loops back to the "en cours" stage, shown in orange
  const inRevision = status === 'revisions'
  const effectiveStatus = inRevision ? 'en_cours' : status === 'en_attente' ? 'en_cours' : status
  let idx = stages.findIndex(s => s.key === effectiveStatus)
  if (idx === -1) idx = 0
  const pct = Math.round((idx / (stages.length - 1)) * 100)
  const barColor = inRevision ? '#f97316' : pct === 100 ? '#22c55e' : '#a78bfa'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ color: 'rgba(240,235,227,0.35)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {inRevision ? '🔄 Retours en cours' : 'Progression'}
        </p>
        <p style={{ color: barColor, fontSize: '0.72rem', fontWeight: 800 }}>{pct}%</p>
      </div>

      {/* Bar */}
      <div style={{ position: 'relative', height: 5, background: '#222', borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4,
          width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>

      {/* Milestones */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {stages.map((s, i) => {
          const done = i < idx
          const active = i === idx
          const color = done ? barColor : active ? barColor : '#333'
          return (
            <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: i === 0 ? 'flex-start' : i === stages.length - 1 ? 'flex-end' : 'center', flex: 1 }}>
              <span style={{
                width: active ? 10 : 8, height: active ? 10 : 8, borderRadius: '50%',
                background: done || active ? color : 'transparent',
                border: `2px solid ${color}`,
                boxShadow: active ? `0 0 8px ${color}80` : 'none',
                transition: 'all 0.3s',
                marginBottom: 5,
              }} />
              <p style={{
                color: active ? '#f0ebe3' : done ? 'rgba(240,235,227,0.45)' : 'rgba(240,235,227,0.18)',
                fontSize: '0.6rem', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
              }}>{s.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
