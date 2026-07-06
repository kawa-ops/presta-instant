// Instant skeleton shown while a page's server payload loads.
// This is what makes sidebar navigation feel immediate.
export default function AdminLoading() {
  return (
    <div style={{ width: '100%', maxWidth: 1100 }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
      <div style={{ width: 220, height: 26, background: '#1c1c1c', borderRadius: 8, marginBottom: 10, animation: 'pulse 1.2s ease-in-out infinite' }} />
      <div style={{ width: 320, height: 13, background: '#181818', borderRadius: 6, marginBottom: 28, animation: 'pulse 1.2s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ height: 88, background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div style={{ height: 300, background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '0.2s' }} />
    </div>
  )
}
