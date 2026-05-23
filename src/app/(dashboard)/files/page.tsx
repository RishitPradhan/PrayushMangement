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

  const [{ data: files }, { data: projects }] = await Promise.all([
    supabase
      .from('files')
      .select('*, project:projects(name)')
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name'),
  ])

  return <FilesClient files={files ?? []} projects={projects ?? []} userId={user?.id ?? ''} userRole={userRole} />
}
