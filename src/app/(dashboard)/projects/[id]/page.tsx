import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import { formatDate, formatCurrency, getDaysUntil } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Calendar, ExternalLink, FileText, CreditCard } from 'lucide-react'
import { NotesSection } from '@/components/shared/NotesSection'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'member'
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (data) userRole = data.role
  }

  const [{ data: project }, { data: tasks }, { data: files }, { data: payment }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:clients(name, email, company), members:project_members(user:profiles(id, full_name, avatar_url))')
      .eq('id', id)
      .single(),
    supabase.from('tasks').select('*, assignee:profiles(full_name, avatar_url)').eq('project_id', id).order('created_at'),
    supabase.from('files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('project_id', id).single(),
  ])

  if (!project) notFound()

  const members = project.members?.map((m: { user: unknown }) => m.user) ?? []
  const daysLeft = getDaysUntil(project.due_date)
  const isOverdue = daysLeft !== null && daysLeft < 0

  const tasksByStatus = {
    todo: tasks?.filter(t => t.status === 'todo') ?? [],
    'in-progress': tasks?.filter(t => t.status === 'in-progress') ?? [],
    review: tasks?.filter(t => t.status === 'review') ?? [],
    completed: tasks?.filter(t => t.status === 'completed') ?? [],
  }

  const fileTypeIcon = (type: string) => {
    const icons: Record<string, string> = { drive: '📁', figma: '🎨', url: '🔗', upload: '📎' }
    return icons[type] ?? '📄'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link href="/projects" className="flex items-center gap-1.5 text-[12px] text-[#555] hover:text-white transition-colors w-fit">
        <ArrowLeft size={13} /> Back to Projects
      </Link>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <StatusBadge status={project.status} />
              <StatusBadge status={project.priority} />
            </div>
            <p className="text-[13px] text-[#555] mb-4">{project.description ?? 'No description'}</p>
            <div className="flex items-center gap-4 flex-wrap text-[12px] text-[#555]">
              <span className="flex items-center gap-1.5">
                <span className="text-[#444]">Client:</span>
                <span className="text-white">{project.client?.name ?? 'None'}</span>
              </span>
              {project.due_date && (
                <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-[#e63946]' : ''}`}>
                  <Calendar size={12} />
                  {isOverdue ? `${Math.abs(daysLeft!)}d overdue` : `Due ${formatDate(project.due_date)}`}
                </span>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className="text-[11px] text-[#555] uppercase tracking-wider">Team</span>
            <div className="flex items-center gap-1">
              {members.length > 0
                ? members.map((m: { id: string; full_name: string; avatar_url?: string }) => (
                  <Avatar key={m.id} name={m.full_name} avatarUrl={m.avatar_url} size="sm" />
                ))
                : <span className="text-[12px] text-[#444]">No members</span>
              }
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#555]">Overall Progress</span>
            <span className="text-[12px] font-semibold text-white">{project.progress}%</span>
          </div>
          <div className="progress-bar h-2">
            <div className="progress-fill" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-2">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-white">Tasks</h2>
              <Link href="/tasks" className="text-[11px] text-[#e63946] hover:text-[#ff6b6b]">
                Open Board →
              </Link>
            </div>
            <div className="space-y-2">
              {(tasks ?? []).length === 0 ? (
                <p className="text-[#444] text-[12px] py-6 text-center">No tasks yet</p>
              ) : (
                (tasks ?? []).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === 'completed' ? 'bg-[#10b981]' :
                      task.status === 'in-progress' ? 'bg-[#f59e0b]' :
                      task.status === 'review' ? 'bg-[#8b5cf6]' : 'bg-[#555]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] truncate ${task.status === 'completed' ? 'line-through text-[#444]' : 'text-white'}`}>
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.priority} />
                      {task.assignee && (
                        <Avatar name={task.assignee.full_name} avatarUrl={task.assignee.avatar_url} size="xs" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="mt-6 h-[400px]">
            <NotesSection entityId={project.id} entityType="project" />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Payment */}
          {userRole === 'admin' && payment && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={14} className="text-[#e63946]" />
                <h2 className="text-[13px] font-semibold text-white">Payment</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#555]">Total</span>
                  <span className="text-white font-medium">{formatCurrency(payment.total_amount)}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#555]">Received</span>
                  <span className="text-[#10b981]">{formatCurrency(payment.advance_paid)}</span>
                </div>
                <div className="flex justify-between text-[12px] pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#555]">Balance</span>
                  <span className={payment.balance > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'}>
                    {formatCurrency(payment.balance)}
                  </span>
                </div>
                <div className="pt-1">
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            </div>
          )}

          {/* Files */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-[#e63946]" />
              <h2 className="text-[13px] font-semibold text-white">Files & Links</h2>
            </div>
            {(files ?? []).length === 0 ? (
              <p className="text-[#444] text-[12px] text-center py-4">No files attached</p>
            ) : (
              <div className="space-y-2">
                {(files ?? []).map(file => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
                  >
                    <span className="text-[14px]">{fileTypeIcon(file.type)}</span>
                    <span className="text-[12px] text-[#888] group-hover:text-white transition-colors flex-1 truncate">
                      {file.name}
                    </span>
                    <ExternalLink size={11} className="text-[#444] flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Client Info */}
          {project.client && (
            <div className="glass-card p-5">
              <h2 className="text-[13px] font-semibold text-white mb-3">Client</h2>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#555]">Company</span>
                  <span className="text-white">{project.client.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Email</span>
                  <span className="text-white">{project.client.email}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
