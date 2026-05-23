'use client'

import { useState } from 'react'
import { ProjectFile } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Plus, X, ExternalLink, Search, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const FILE_TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  drive:  { emoji: '📁', label: 'Google Drive', color: '#4285f4' },
  figma:  { emoji: '🎨', label: 'Figma',        color: '#f24e1e' },
  url:    { emoji: '🔗', label: 'Link',          color: '#6366f1' },
  upload: { emoji: '📎', label: 'Upload',        color: '#10b981' },
}

interface FilesClientProps {
  files: (ProjectFile & { project?: { name: string } })[]
  projects: { id: string; name: string }[]
  userId: string
}

export function FilesClient({ files: initialFiles, projects, userId }: FilesClientProps) {
  const [files, setFiles] = useState(initialFiles)
  const [showForm, setShowForm] = useState(false)
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', type: 'url', project_id: '' })

  const field = (key: string) => ({
    value: form[key as keyof typeof form],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  const openNewForm = () => {
    setEditingFile(null)
    setForm({ name: '', url: '', type: 'url', project_id: '' })
    setShowForm(true)
  }

  const openEditForm = (e: React.MouseEvent, file: ProjectFile) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingFile(file)
    setForm({
      name: file.name || '',
      url: file.url || '',
      type: file.type || 'url',
      project_id: file.project_id || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (e: React.MouseEvent, file: ProjectFile) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) return

    const supabase = createClient()
    const { error } = await supabase.from('files').delete().eq('id', file.id)

    if (error) {
      toast.error(error.message)
    } else {
      setFiles(prev => prev.filter(f => f.id !== file.id))
      toast.success('Item deleted successfully')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const payload = {
      ...form,
      project_id: form.project_id || null,
      uploaded_by: userId
    }

    if (editingFile) {
      const { error } = await supabase.from('files').update(payload).eq('id', editingFile.id)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Item updated!')
        window.location.reload()
      }
    } else {
      const { data, error } = await supabase
        .from('files')
        .insert([payload])
        .select('*, project:projects(name)')
        .single()
      if (error) {
        toast.error(error.message)
      } else {
        setFiles(prev => [data, ...prev])
        toast.success('File added!')
        setShowForm(false)
        setForm({ name: '', url: '', type: 'url', project_id: '' })
      }
    }
    setLoading(false)
  }

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.project?.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Group by project
  const grouped = filtered.reduce((acc, file) => {
    const key = file.project?.name ?? 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(file)
    return acc
  }, {} as Record<string, typeof filtered>)

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title="Files & Links"
        subtitle={`${files.length} items`}
        action={
          <button onClick={openNewForm} className="btn-primary">
            <Plus size={14} /> Add File
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-6 w-64">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
        <input
          type="text"
          placeholder="Search files..."
          className="input-base pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grouped Files */}
      {Object.entries(grouped).length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Upload size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#444] text-[14px]">No files or links yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([projectName, projectFiles]) => (
            <div key={projectName}>
              <h3 className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-3">
                📁 {projectName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectFiles.map((file, i) => {
                  const meta = FILE_TYPE_META[file.type] ?? FILE_TYPE_META.url
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <div className="relative group block h-full">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-card p-4 flex items-start gap-3 hover:border-[rgba(230,57,70,0.2)] transition-all h-full"
                        >
                          <span className="text-xl flex-shrink-0">{meta.emoji}</span>
                          <div className="flex-1 min-w-0 pr-12">
                            <p className="text-[12px] font-medium text-white group-hover:text-[#e63946] transition-colors truncate">
                              {file.name}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: meta.color + 'aa' }}>{meta.label}</p>
                            <p className="text-[10px] text-[#444] mt-1">{formatDate(file.created_at)}</p>
                          </div>
                          <ExternalLink size={12} className="text-[#444] flex-shrink-0 mt-0.5 group-hover:text-[#e63946] transition-colors" />
                        </a>

                        {/* Actions overlay */}
                        <div className="absolute top-3 right-8 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#121216] p-1 rounded-lg border border-[rgba(255,255,255,0.05)] shadow-lg z-10">
                          <button onClick={(e) => openEditForm(e, file)} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                          </button>
                          <button onClick={(e) => handleDelete(e, file)} className="p-1 text-gray-400 hover:text-[#ef4444] hover:bg-red-500/10 rounded transition-colors" title="Delete">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold text-white">{editingFile ? 'Edit File / Link' : 'Add File / Link'}</h2>
                <button onClick={() => setShowForm(false)} className="text-[#555] hover:text-white"><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Name *</label>
                  <input type="text" className="input-base" placeholder="Homepage Design v2" required {...field('name')} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">URL *</label>
                  <input type="url" className="input-base" placeholder="https://..." required {...field('url')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Type</label>
                    <select className="input-base" {...field('type')}>
                      <option value="drive">Google Drive</option>
                      <option value="figma">Figma</option>
                      <option value="url">Link</option>
                      <option value="upload">Upload</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Project</label>
                    <select className="input-base" {...field('project_id')}>
                      <option value="">General</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? (editingFile ? 'Saving...' : 'Adding...') : (editingFile ? 'Save Changes' : 'Add File')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
