import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FreelancerSidebar from '@/components/freelancer/Sidebar'
import LiveNotifications from '@/components/LiveNotifications'

export default async function FreelancerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).role === 'admin') redirect('/dashboard')
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <FreelancerSidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 36px', maxWidth: 'calc(100vw - 220px)' }}>
        {children}
      </main>
      <LiveNotifications />
    </div>
  )
}
