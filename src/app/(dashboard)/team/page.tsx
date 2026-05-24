import { createClient, getCurrentUserProfile } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/shared/Avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function TeamPage() {
  const profile = await getCurrentUserProfile()
  if (profile?.role !== 'admin') redirect('/')

  const supabase = await createClient()

  // Fetch profiles joined with their assigned tasks and payouts/expenses
  const { data: members } = await supabase
    .from('profiles')
    .select('*, assigned_tasks:tasks(id, status, priority), expenses:expenses(id, amount, category)')
    .order('full_name')

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title="Team Directory"
        subtitle={`${(members ?? []).length} active members`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(members ?? []).map(member => {
          const tasks = member.assigned_tasks ?? []
          const active = tasks.filter((t: { status: string }) => t.status !== 'completed').length
          const completed = tasks.filter((t: { status: string }) => t.status === 'completed').length
          const completion = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0

          // Calculate total payouts/commission earnings mapped to this team profile
          const memberExpenses = member.expenses ?? []
          const totalEarnings = memberExpenses
            .filter((e: { category: string }) => e.category === 'team')
            .reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0)

          return (
            <div key={member.id} className="glass-card p-5 border border-white/5 hover:border-white/10 transition-all">
              
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={member.full_name} avatarUrl={member.avatar_url} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-white">{member.full_name}</h3>
                    <StatusBadge status={member.role === 'admin' ? 'urgent' : 'planning'} />
                  </div>
                  <p className="text-[11px] text-[#555] capitalize mt-0.5">{member.role}</p>
                </div>
              </div>

              {/* Stats Grid including Task Counts and Commission Payouts */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                {[
                  { label: 'Active', value: active },
                  { label: 'Completed', value: completed },
                  { label: 'Earnings', value: formatCurrency(totalEarnings) },
                ].map(stat => (
                  <div key={stat.label} className="bg-[rgba(255,255,255,0.02)] border border-white/5 rounded-lg py-2 px-1">
                    <div className="text-[12px] sm:text-[13px] font-black text-white truncate">{stat.value}</div>
                    <div className="text-[9px] text-[#555] font-semibold mt-0.5 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Completion Progress Bar */}
              <div>
                <div className="flex justify-between text-[10px] text-[#555] font-semibold uppercase tracking-wider mb-1.5">
                  <span>Task Completion</span>
                  <span className="text-white">{completion}%</span>
                </div>
                <div className="progress-bar h-1">
                  <div className="progress-fill bg-white" style={{ width: `${completion}%` }} />
                </div>
              </div>

              {/* Priority Task Breakdown */}
              {tasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1">
                  {['urgent', 'high', 'medium', 'low'].map(p => {
                    const count = tasks.filter((t: { priority: string }) => t.priority === p).length
                    if (count === 0) return null
                    return (
                      <span key={p} className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                        <StatusBadge status={p} className="text-[9px]" />
                        <span className="text-[9px] text-gray-400 font-semibold">{count}</span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
