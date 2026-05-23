import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { PageHeader } from '@/components/shared/PageHeader'

export default async function TasksPage() {
  const supabase = await createClient()
  const [{ data: tasks }, { data: projects }, { data: members }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, assignee:profiles(id, full_name, avatar_url), project:projects(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name, avatar_url').order('full_name'),
  ])

  return (
    <div className="max-w-full animate-fade-in">
      <PageHeader
        title="Task Board"
        subtitle="Drag tasks between columns to update status"
      />
      <KanbanBoard
        initialTasks={tasks ?? []}
        projects={projects ?? []}
        members={members ?? []}
      />
    </div>
  )
}
