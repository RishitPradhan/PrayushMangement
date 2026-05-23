import { createClient } from '@/lib/supabase/server'
import { ProjectsClient } from '@/components/projects/ProjectsClient'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:clients(id, name, company), members:project_members(user:profiles(id, full_name, avatar_url))')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name, company').order('name'),
  ])

  // Flatten nested members
  const normalizedProjects = (projects ?? []).map(p => ({
    ...p,
    members: p.members?.map((m: { user: unknown }) => m.user) ?? [],
  }))

  return <ProjectsClient projects={normalizedProjects} clients={clients ?? []} />
}
