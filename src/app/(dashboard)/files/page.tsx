import { createClient, getCurrentUserProfile } from '@/lib/supabase/server'
import { FilesClient } from '@/components/files/FilesClient'

export default async function FilesPage() {
  const profile = await getCurrentUserProfile()
  const userRole = profile?.role || 'member'
  const supabase = await createClient()

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
      userId={profile?.id ?? ''} 
      userRole={userRole} 
    />
  )
}
