import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/Sidebar'
import LiveNotifications from '@/components/LiveNotifications'
import TopLangBar from '@/components/TopLangBar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'admin') redirect('/espace')
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(160deg, #1a1233 0%, #241740 40%, #1c1236 75%, #171029 100%)' }}>
      <AdminSidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 36px', maxWidth: 'calc(100vw - 220px)' }}>
        {children}
      </main>
      <LiveNotifications />
      <TopLangBar />
    </div>
  )
}
