'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useLang } from '@/lib/i18n'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/dashboard', label: 'nav_dashboard', icon: '◎' },
  { href: '/semaine', label: 'nav_week', icon: '🗓️' },
  { href: '/productions', label: 'nav_prods', icon: '🎬' },
  { href: '/prestataires', label: 'nav_contractors', icon: '👥' },
  { href: '/clients', label: 'nav_clients', icon: '🏢' },
  { href: '/archives', label: 'nav_archives', icon: '📁' },
  { href: '/facturation', label: 'nav_billing', icon: '💶' },
  { href: '/parametres', label: 'nav_settings', icon: '⚙️' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [, , t] = useLang()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    const load = () => fetch('/api/notifications?unread=true')
      .then(r => r.json())
      .then(d => setNotifCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {})
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: 220, background: 'linear-gradient(180deg, #16102b 0%, #0f0b1e 100%)', borderRight: '1px solid rgba(167,139,250,0.15)', boxShadow: '4px 0 24px rgba(88,28,135,0.15)', display: 'flex', flexDirection: 'column', zIndex: 40 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 100 100" width="18" height="18" fill="#f0ebe3">
            <path d="M12,52 C12,52 48,46 58,22 C58,22 54,50 78,42 C78,42 60,52 68,76 C68,76 52,58 28,72 C28,72 42,52 12,52 Z"/>
            <path d="M74,26 C74,26 79,22 83,18 C83,18 81,24 87,22 C87,22 81,27 83,33 C83,33 77,27 71,31 C71,31 75,26 74,26 Z"/>
          </svg>
          <span style={{ color: '#f0ebe3', fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-syne), sans-serif' }}>instant.</span>
        </div>
        <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '0.65rem', marginTop: 3, marginLeft: 26 }}>{t('postprod')}</p>
      </div>


      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, marginBottom: 2, textDecoration: 'none',
              color: active ? '#f0ebe3' : 'rgba(240,235,227,0.45)',
              background: active ? 'linear-gradient(90deg, rgba(167,139,250,0.18), rgba(236,72,153,0.08))' : 'transparent',
              borderLeft: active ? '2px solid #a78bfa' : '2px solid transparent', boxShadow: active ? '0 0 16px rgba(167,139,250,0.12)' : 'none',
              fontSize: '0.82rem', fontWeight: active ? 600 : 400, transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '0.9rem', width: 18, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{t(item.label)}</span>
              {item.href === '/dashboard' && notifCount > 0 && (
                <span style={{ background: '#fb7185', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: 'rgba(167,139,250,0.12) 1px solid' }}>
        <div style={{ padding: '8px 12px', marginBottom: 4 }}>
          <p style={{ color: '#f0ebe3', fontSize: '0.78rem', fontWeight: 600 }}>{session?.user?.name}</p>
          <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '0.68rem' }}>{t('admin_role')}</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', color: 'rgba(240,235,227,0.3)', cursor: 'pointer', fontSize: '0.75rem', borderRadius: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
