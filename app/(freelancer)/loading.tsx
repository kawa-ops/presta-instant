export default function FreelancerLoading() {
  return (
    <div style={{ width: '100%', maxWidth: 960 }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
      <div style={{ width: 220, height: 26, background: '#1c1c1c', borderRadius: 8, marginBottom: 10, animation: 'pulse 1.2s ease-in-out infinite' }} />
      <div style={{ width: 300, height: 13, background: '#181818', borderRadius: 6, marginBottom: 28, animation: 'pulse 1.2s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <div style={{ height: 280, background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '0.2s' }} />
    </div>
  )
}
