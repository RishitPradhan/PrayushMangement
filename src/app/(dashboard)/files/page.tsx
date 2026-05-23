import { createClient } from '@/lib/supabase/server'
import { FilesClient } from '@/components/files/FilesClient'

export default async function FilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'member'
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (data) userRole = data.role
  }

  const [{ data: files }, { data: projects }, { data: tasks }] = await Promise.all([
    supabase
      .from('files')
      .select('*, project:projects(name), task:tasks(title)')
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name'),
    supabase.from('tasks').select('id, title, project_id').order('title'),
  ])

  return (
    <FilesClient 
      files={files ?? []} 
      projects={projects ?? []} 
      tasks={tasks ?? []}
      userId={user?.id ?? ''} 
      userRole={userRole} 
    />
  )
}
