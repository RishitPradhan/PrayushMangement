import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from '@/components/clients/ClientsClient'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*, projects(id, status)')
    .order('name')

  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'member'
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (data) userRole = data.role
  }

  const clientsWithCount = (clients ?? []).map(c => ({
    ...c,
    active_projects_count: (c.projects ?? []).filter((p: { status: string }) => p.status !== 'completed').length,
  }))

  return <ClientsClient clients={clientsWithCount} userRole={userRole} />
}
