import { createClient, getCurrentUserProfile } from '@/lib/supabase/server'
import { ClientsClient } from '@/components/clients/ClientsClient'

export default async function ClientsPage() {
  const profile = await getCurrentUserProfile()
  const userRole = profile?.role || 'member'
  const supabase = await createClient()
  
  const { data: clients } = await supabase
    .from('clients')
    .select('*, projects(id, status), portal_token')
    .order('name')

  const clientsWithCount = (clients ?? []).map(c => ({
    ...c,
    active_projects_count: (c.projects ?? []).filter((p: { status: string }) => p.status !== 'completed').length,
  }))

  return <ClientsClient clients={clientsWithCount} userRole={userRole} />
}
