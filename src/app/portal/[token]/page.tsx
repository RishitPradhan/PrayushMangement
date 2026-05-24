import { createClient } from '@/lib/supabase/server'
import { ClientPortalDashboard } from '@/components/portal/ClientPortalDashboard'
import { notFound } from 'next/navigation'
import { PortalData } from '@/types'

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params
  const { token } = resolvedParams

  if (!token) {
    notFound()
  }

  const supabase = await createClient()

  // Use the secure RPC function to fetch portal data
  const { data, error } = await supabase.rpc('get_client_portal_data', { p_token: token })

  if (error) {
    console.error('Supabase Client Portal RPC Error:', error)
  }

  if (error || !data || !data.client) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 text-center animate-fade-in">
        <div className="max-w-md w-full glass-card p-10 border border-[#e63946]/20">
          <div className="w-16 h-16 rounded-full bg-[#e63946]/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-[#e63946] text-2xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 text-[14px] leading-relaxed">
            This magic link is invalid or has expired. Please contact Prayush Studios for a new portal link.
          </p>
        </div>
      </div>
    )
  }

  return <ClientPortalDashboard data={data as PortalData} token={token} />
}
