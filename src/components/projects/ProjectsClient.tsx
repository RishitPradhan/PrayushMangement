'use client'

import { useState, useCallback } from 'react'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus, Search } from 'lucide-react'
import { Project } from '@/types'

interface ProjectsClientProps {
  projects: Project[]
  clients: { id: string; name: string; company: string }[]
  userRole?: string
}

const statuses: { value: string; label: string }[] = [
  { value: 'all', label: 'All Projects' },
  { value: 'planning', label: 'Planning' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
]

export function ProjectsClient({ projects: initialProjects, clients, userRole = 'member' }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', project.id)

    if (error) {
      const { toast } = await import('sonner')
      toast.error('Failed to delete project: ' + error.message)
    } else {
      setProjects(prev => prev.filter(p => p.id !== project.id))
      const { toast } = await import('sonner')
      toast.success('Project deleted successfully')
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProject(null)
  }

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} premium client accounts active`}
        action={
          userRole === 'admin' ? (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} /> New Project
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-950/20 border border-[rgba(255,255,255,0.03)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              className="input-base pl-10 w-64 bg-gray-950/40 border-[rgba(255,255,255,0.03)] focus:border-red-500/20"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input-base w-auto text-[14px] bg-gray-950/40 border-[rgba(255,255,255,0.03)] cursor-pointer py-2"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent Priority</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-[rgba(255,255,255,0.04)]">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all ${
                statusFilter === s.value
                  ? 'bg-[rgba(230,57,70,0.08)] text-[#e63946] border border-[rgba(230,57,70,0.18)]'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-gray-400 text-[15px] font-semibold mb-1">No active projects found</p>
          <p className="text-gray-600 text-[13px]">Try modifying your search or priority criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onEdit={userRole === 'admin' ? handleEdit : undefined} 
              onDelete={userRole === 'admin' ? handleDelete : undefined} 
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ProjectForm
          clients={clients}
          initialData={editingProject}
          onClose={handleCloseForm}
          onCreated={() => { handleCloseForm(); window.location.reload() }}
        />
      )}
    </div>
  )
}
