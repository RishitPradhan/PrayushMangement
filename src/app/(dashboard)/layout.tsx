import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const userRole = profile?.role || 'member'

  return (
    <div className="flex h-screen overflow-hidden bg-[#000000]">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0a0c] relative">
        <Topbar userProfile={profile ?? undefined} />
        <main className="flex-1 overflow-y-auto p-8 sm:p-12">
          {children}
        </main>
      </div>
    </div>
  )
}
