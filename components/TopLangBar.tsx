'use client'
import { LangSwitcher } from '@/lib/i18n'

// Global language selector — fixed top-right corner on every page
export default function TopLangBar() {
  return (
    <div style={{
      position: 'fixed', top: 14, right: 20, zIndex: 60,
      background: 'rgba(26,18,48,0.75)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, padding: '5px 8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    }}>
      <LangSwitcher />
    </div>
  )
}
