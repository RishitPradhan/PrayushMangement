import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { ProjectChart } from '@/components/dashboard/ProjectChart'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatCurrency, getDaysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { DashboardStats } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch all needed data in parallel
  const [
    { data: allProjectsData },
    { data: tasks },
    { data: activities },
    { data: payments },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('projects').select('*, client:clients(name)').order('created_at', { ascending: false }),
    supabase.from('tasks').select('*'),
    supabase.from('activity_log').select('*, user:profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(10),
    supabase.from('payments').select('total_amount, advance_paid, balance, status'),
    supabase.auth.getUser(),
  ])

  let userRole = 'member'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    userRole = profile?.role || 'member'
  }

  const allProjects = allProjectsData ?? []
  const allTasks = tasks ?? []
  const allPayments = payments ?? []

  // Calculate projects started this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const projectsStartedThisMonth = allProjects.filter(p => p.created_at && new Date(p.created_at) >= startOfMonth).length

  const stats: DashboardStats = {
    activeProjects: allProjects.filter(p => p.status !== 'completed').length,
    pendingTasks: allTasks.filter(t => t.status !== 'completed').length,
    completedTasks: allTasks.filter(t => t.status === 'completed').length,
    overdueItems: allProjects.filter(p => p.due_date && new Date(p.due_date) < new Date() && p.status !== 'completed').length,
    totalRevenue: allPayments.reduce((sum, p) => sum + (p.advance_paid ?? 0), 0),
    pendingPayments: allPayments.reduce((sum, p) => sum + (p.balance ?? 0), 0),
    projectsStartedThisMonth,
  }

  // Generate dynamic chart data based on real projects over the last 6 months
  const monthsData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return {
      name: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      monthNum: d.getMonth(),
      completed: 0,
      started: 0,
    }
  })

  allProjects.forEach(p => {
    if (!p.created_at) return
    const pDate = new Date(p.created_at)
    const pMonth = pDate.getMonth()
    const pYear = pDate.getFullYear()

    const match = monthsData.find(m => m.monthNum === pMonth && m.year === pYear)
    if (match) {
      match.started += 1
      if (p.status === 'completed') {
        match.completed += 1
      }
    }
  })

  const chartData = monthsData.map(m => ({
    month: m.name,
    started: m.started,
    completed: m.completed,
  }))

  const recentProjects = allProjects.slice(0, 5)

  return (
    <div className="w-full flex flex-col gap-12 animate-fade-in max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Good evening 👋</h1>
          <p className="text-gray-400 text-[15px] mt-1.5">Here&apos;s an overview of Prayush Studios operations today.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/projects" className="btn-ghost">
            <ArrowRight size={15} /> View Projects
          </Link>
          <Link href="/projects" className="btn-primary">
            <Plus size={15} /> New Project
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} userRole={userRole} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        {/* Projects Overview */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:gap-10">
          {/* Chart */}
          <div className="glass-card p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[16px] font-bold text-white tracking-tight">Project Activity</h2>
                <p className="text-[13px] text-gray-400 mt-1">Growth chart showing project states</p>
              </div>
              <div className="flex items-center gap-5 text-[12px] text-gray-400">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />Started</span>
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />Completed</span>
              </div>
            </div>
            <ProjectChart data={chartData} />
          </div>

          {/* Recent Projects */}
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[16px] font-bold text-white tracking-tight">Recent Projects</h2>
              <Link href="/projects" className="text-[13px] text-[#a855f7] hover:text-[#c084fc] flex items-center gap-1.5 font-semibold">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentProjects.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-[14px]">
                No projects yet.{' '}
                <Link href="/projects" className="text-[#a855f7] font-semibold">Create your first project →</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map(project => {
                  const daysLeft = getDaysUntil(project.due_date)
                  const isOverdue = daysLeft !== null && daysLeft < 0

                  return (
                    <Link key={project.id} href={`/projects/${project.id}`} className="block">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-[16px] bg-gray-950/20 hover:bg-gray-950/50 transition-all group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <span className="text-[15px] font-bold text-white group-hover:text-[#a855f7] transition-colors truncate">
                              {project.name}
                            </span>
                            <StatusBadge status={project.status} />
                            <StatusBadge status={project.priority} />
                          </div>
                          <div className="flex items-center gap-4 text-[13px] text-gray-400">
                            <span>{project.client?.name ?? 'No client'}</span>
                            {project.due_date && (
                              <span className={isOverdue ? 'text-[#ef4444] font-semibold' : ''}>
                                {isOverdue ? `${Math.abs(daysLeft!)}d overdue` : `${daysLeft}d remaining`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full sm:w-32 flex-shrink-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-gray-500 font-semibold uppercase">{project.progress}% completed</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity + Quick Tasks */}
        <div className="flex flex-col gap-6 lg:gap-10">
          {/* Activity */}
          <div className="glass-card p-8">
            <h2 className="text-[16px] font-bold text-white tracking-tight mb-5">Recent Activity</h2>
            <ActivityFeed activities={activities ?? []} />
          </div>

          {/* Upcoming Deadlines */}
          <div className="glass-card p-8">
            <h2 className="text-[16px] font-bold text-white tracking-tight mb-5">Upcoming Deadlines</h2>
            {allProjects.filter(p => p.due_date && p.status !== 'completed').length === 0 ? (
              <p className="text-gray-500 text-[13px] text-center py-6">No deadlines set</p>
            ) : (
              <div className="space-y-4">
                {allProjects
                  .filter(p => p.due_date && p.status !== 'completed')
                  .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                  .slice(0, 4)
                  .map(p => {
                    const days = getDaysUntil(p.due_date)
                    const overdue = days !== null && days < 0
                    return (
                      <div key={p.id} className="flex items-center gap-5 p-5 rounded-[16px] bg-black/20 hover:bg-black/40 transition-colors">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{formatDate(p.due_date)}</p>
                        </div>
                        <span className={`text-[12px] font-bold flex-shrink-0 ${overdue ? 'text-[#ef4444]' : 'text-[#eab308]'}`}>
                          {overdue ? `${Math.abs(days!)}d late` : `${days}d`}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
