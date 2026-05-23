import { DashboardShell } from '@/components/layout/DashboardShell'
import { getCurrentUserProfile } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile()
  const userRole = profile?.role || 'member'

  return (
    <DashboardShell userRole={userRole} userProfile={profile}>
      {children}
    </DashboardShell>
  )
}
