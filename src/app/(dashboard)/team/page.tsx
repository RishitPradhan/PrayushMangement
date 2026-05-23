import { createClient, getCurrentUserProfile } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/shared/Avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'

import { redirect } from 'next/navigation'

export default async function TeamPage() {
  const profile = await getCurrentUserProfile()
  if (profile?.role !== 'admin') redirect('/')

  const supabase = await createClient()

  const { data: members } = await supabase
    .from('profiles')
    .select('*, assigned_tasks:tasks(id, status, priority)')
    .order('full_name')

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title="Team"
        subtitle={`${(members ?? []).length} members`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(members ?? []).map(member => {
          const tasks = member.assigned_tasks ?? []
          const active = tasks.filter((t: { status: string }) => t.status !== 'completed').length
          const completed = tasks.filter((t: { status: string }) => t.status === 'completed').length
          const completion = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0

          return (
            <div key={member.id} className="glass-card p-5">
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

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                {[
                  { label: 'Total', value: tasks.length },
                  { label: 'Active', value: active },
                  { label: 'Done', value: completed },
                ].map(stat => (
                  <div key={stat.label} className="bg-[rgba(255,255,255,0.03)] rounded-lg py-2">
                    <div className="text-[15px] font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-[#555]">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Completion */}
              <div>
                <div className="flex justify-between text-[11px] text-[#555] mb-1.5">
                  <span>Task Completion</span>
                  <span className="text-white">{completion}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${completion}%` }} />
                </div>
              </div>

              {/* Priority breakdown */}
              {tasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)] flex flex-wrap gap-1">
                  {['urgent', 'high', 'medium', 'low'].map(p => {
                    const count = tasks.filter((t: { priority: string }) => t.priority === p).length
                    if (count === 0) return null
                    return (
                      <span key={p} className="flex items-center gap-1">
                        <StatusBadge status={p} className="text-[10px]" />
                        <span className="text-[10px] text-[#444]">{count}</span>
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
