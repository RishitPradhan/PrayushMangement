import { createClient, getCurrentUserProfile } from '@/lib/supabase/server'
import { FinanceClient } from '@/components/finance/FinanceClient'
import { redirect } from 'next/navigation'

export default async function PaymentsPage() {
  const profile = await getCurrentUserProfile()
  if (profile?.role !== 'admin') redirect('/')

  const supabase = await createClient()

  // 1. Fetch payments joined with project name and client name (aggregate contract metrics)
  const { data: payments } = await supabase
    .from('payments')
    .select('*, project:projects(id, name, client:clients(name))')
    .order('created_at', { ascending: false })

  // 2. Fetch expenses (payouts, overheads, individual revenue transactions) joined with relations
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, user:profiles(*), project:projects(id, name, client:clients(name))')
    .order('date', { ascending: false })

  // 3. Fetch active team profiles to attribute payouts to
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true })

  // 4. Fetch clients list to attribute client payouts/refunds to
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, company')
    .order('name', { ascending: true })

  // 5. Fetch projects list to record incoming project revenues
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status')
    .order('name', { ascending: true })

  return (
    <div className="max-w-7xl mx-auto">
      <FinanceClient
        initialPayments={payments ?? []}
        initialExpenses={expenses ?? []}
        profiles={profiles ?? []}
        clients={clients ?? []}
        projects={projects ?? []}
      />
    </div>
  )
}
