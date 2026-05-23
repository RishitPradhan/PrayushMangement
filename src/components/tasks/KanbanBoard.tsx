'use client'

import { useState, useEffect } from 'react'
import { Task, TaskStatus, ProjectFile } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import { NotesSection } from '@/components/shared/NotesSection'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Calendar, X, MessageSquare, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Column {
  id: TaskStatus
  title: string
  color: string
  dotColor: string
}

const COLUMNS: Column[] = [
  { id: 'todo',        title: 'To Do',      color: 'rgba(156,163,175,0.02)',  dotColor: '#9ca3af' },
  { id: 'in-progress', title: 'In Progress', color: 'rgba(234,179,8,0.02)', dotColor: '#eab308' },
  { id: 'review',      title: 'Review',      color: 'rgba(168,85,247,0.02)', dotColor: '#a855f7' },
  { id: 'completed',   title: 'Completed',   color: 'rgba(34,197,94,0.02)', dotColor: '#22c55e' },
]

interface KanbanBoardProps {
  initialTasks: Task[]
  projects: { id: string; name: string }[]
  members: { id: string; full_name: string; avatar_url?: string }[]
  userRole?: string
}

interface NewTaskForm {
  title: string
  project_id: string
  assignee_id: string
  priority: string
  due_date: string
  description: string
}

export function KanbanBoard({ initialTasks, projects, members, userRole = 'member' }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: '', project_id: '', assignee_id: '', priority: 'medium', due_date: '', description: '',
  })
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({})
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function fetchDataCounts() {
      // Fetch notes counts
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('entity_id')
        .eq('entity_type', 'task')
      
      if (!notesError && notesData) {
        const counts: Record<string, number> = {}
        notesData.forEach(note => {
          counts[note.entity_id] = (counts[note.entity_id] || 0) + 1
        })
        setNoteCounts(counts)
      }

      // Fetch files counts
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('task_id')
        .not('task_id', 'is', null)
      
      if (!filesError && filesData) {
        const counts: Record<string, number> = {}
        filesData.forEach(file => {
          if (file.task_id) {
            counts[file.task_id] = (counts[file.task_id] || 0) + 1
          }
        })
        setFileCounts(counts)
      }
    }
    fetchDataCounts()
  }, [tasks])

  const [taskFiles, setTaskFiles] = useState<ProjectFile[]>([])
  const [uploadingTaskFile, setUploadingTaskFile] = useState(false)

  useEffect(() => {
    if (!editingTask) {
      setTaskFiles([])
      return
    }
    const taskId = editingTask.id
    const supabase = createClient()
    async function fetchTaskFiles() {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('task_id', taskId)
      if (!error && data) {
        setTaskFiles(data)
      }
    }
    fetchTaskFiles()
  }, [editingTask])

  const handleUploadTaskFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingTask) return
    const file = e.target.files[0]
    const taskId = editingTask.id
    const projectId = editingTask.project_id
    setUploadingTaskFile(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setUploadingTaskFile(false)
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file)

    if (uploadError) {
      toast.error('File upload failed: ' + uploadError.message)
      setUploadingTaskFile(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath)

    const payload = {
      name: file.name,
      url: publicUrl,
      type: 'upload',
      project_id: projectId || null,
      task_id: taskId,
      uploaded_by: user.id
    }

    const { data: newFile, error: insertError } = await supabase
      .from('files')
      .insert([payload])
      .select('*')
      .single()

    if (insertError) {
      toast.error('Failed to link file to task: ' + insertError.message)
    } else {
      setTaskFiles(prev => [...prev, newFile as any])
      toast.success('File uploaded and attached to task!')
    }
    setUploadingTaskFile(false)
  }

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  // Drag & Drop
  const handleDragStart = (taskId: string) => setDraggedTaskId(taskId)
  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }
  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault()
    if (!draggedTaskId) return
    const task = tasks.find(t => t.id === draggedTaskId)
    if (!task || task.status === newStatus) { setDraggedTaskId(null); setDragOverColumn(null); return }

    setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: newStatus } : t))
    setDraggedTaskId(null)
    setDragOverColumn(null)

    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', draggedTaskId)
    if (error) {
      toast.error('Failed to update task')
      setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: task.status } : t))
    }
  }

  const handleCreateTask = async (status: TaskStatus) => {
    if (!newTask.title.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: newTask.title,
        project_id: newTask.project_id || null,
        assignee_id: newTask.assignee_id || null,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        description: newTask.description || null,
        status,
      }])
      .select('*, assignee:profiles(full_name, avatar_url), project:projects(name)')
      .single()
    if (error) { toast.error('Failed to create task'); return }
    setTasks(prev => [...prev, data])
    setAddingToColumn(null)
    setNewTask({ title: '', project_id: '', assignee_id: '', priority: 'medium', due_date: '', description: '' })
    toast.success('Task created!')
  }

  const handleUpdateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return
    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .update({
        title: editingTask.title,
        project_id: editingTask.project_id || null,
        assignee_id: editingTask.assignee_id || null,
        priority: editingTask.priority,
        due_date: editingTask.due_date || null,
        description: editingTask.description || null,
      })
      .eq('id', editingTask.id)
    
    if (error) { toast.error('Failed to update task'); return }
    
    // We update local state. For full assignee/project names we should ideally refetch or match from props, 
    // but a quick reload or local update is fine for now.
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...editingTask, 
      project: projects.find(p => p.id === editingTask.project_id) || null,
      assignee: members.find(m => m.id === editingTask.assignee_id) || null
    } as any : t))
    setEditingTask(null)
    toast.success('Task updated!')
  }

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) { toast.error('Failed to delete task'); return }
    setTasks(prev => prev.filter(t => t.id !== task.id))
    toast.success('Task deleted!')
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-200px)]">
      {COLUMNS.map(col => {
        const colTasks = tasksByStatus(col.id)
        const isOver = dragOverColumn === col.id

        return (
          <div
            key={col.id}
            className="kanban-column flex flex-col gap-4 w-[320px] flex-shrink-0 bg-gray-950/20 border border-[rgba(255,255,255,0.03)] rounded-2xl p-4 transition-all"
            style={{
              background: isOver ? col.color : undefined,
              borderColor: isOver ? col.dotColor + '40' : undefined,
            }}
            onDragOver={e => handleDragOver(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.dotColor }} />
                <span className="text-[14px] font-bold text-white tracking-tight">{col.title}</span>
                <span className="text-[11px] text-gray-400 font-extrabold bg-gray-950/60 rounded-full px-2.5 py-0.5 border border-[rgba(255,255,255,0.02)]">
                  {colTasks.length}
                </span>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={() => setAddingToColumn(col.id)}
                  className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
                >
                  <Plus size={15} />
                </button>
              )}
            </div>

            {/* Tasks Container */}
            <div className="flex-1 space-y-3.5 min-h-[300px]">
              <AnimatePresence>
                {colTasks.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    draggable={userRole === 'admin'}
                    onDragStart={() => userRole === 'admin' && handleDragStart(task.id)}
                    onClick={() => setEditingTask(task)}
                    className="kanban-card bg-gray-950/40 border border-[rgba(255,255,255,0.03)] hover:border-red-500/20 hover:bg-gray-950/70 p-4 rounded-xl cursor-pointer transition-all group"
                    style={{
                      opacity: draggedTaskId === task.id ? 0.3 : 1,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5 relative">
                      <div className="flex-1 min-w-0 pr-14">
                        <p className={`text-[13.5px] font-bold leading-snug tracking-tight ${task.status === 'completed' ? 'line-through text-gray-500 font-medium' : 'text-white group-hover:text-[#e63946] transition-colors'}`}>
                          {task.title}
                        </p>
                        <div className="mt-1.5">
                          <StatusBadge status={task.priority} className="flex-shrink-0 text-[10px]" />
                        </div>
                      </div>
                      
                      {userRole === 'admin' && (
                        <div className="absolute top-0 right-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#111115] p-1 rounded-md border border-[rgba(255,255,255,0.05)] shadow-lg z-10">
                          <button onClick={(e) => { e.stopPropagation(); setEditingTask(task) }} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task) }} className="p-1 text-gray-400 hover:text-[#ef4444] hover:bg-red-500/10 rounded transition-colors" title="Delete">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-[13px] text-gray-400 leading-relaxed mb-3 line-clamp-2">{task.description}</p>
                    )}

                    {task.project && (
                      <p className="text-[11.5px] font-bold text-gray-500 truncate mb-3 flex items-center gap-1.5">
                        <span className="text-[10px]">📁</span> {task.project.name}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.03)]">
                      <div className="flex items-center gap-3">
                        {task.due_date ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                            <Calendar size={12} className="text-gray-600" />
                            {formatDate(task.due_date)}
                          </div>
                        ) : null}

                        {noteCounts[task.id] > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-[#e63946] font-bold bg-[#e63946]/10 px-2 py-0.5 rounded-md border border-[#e63946]/15" title={`${noteCounts[task.id]} notes`}>
                            <MessageSquare size={11} className="text-[#e63946]" />
                            <span>{noteCounts[task.id]}</span>
                          </div>
                        )}

                        {fileCounts[task.id] > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-[#10b981] font-bold bg-[#10b981]/10 px-2 py-0.5 rounded-md border border-[#10b981]/15" title={`${fileCounts[task.id]} files attached`}>
                            <Upload size={11} className="text-[#10b981]" />
                            <span>{fileCounts[task.id]}</span>
                          </div>
                        )}
                      </div>
                      
                      {task.assignee && (
                        <Avatar name={task.assignee.full_name} avatarUrl={task.assignee.avatar_url} size="xs" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Task Inline */}
              {addingToColumn === col.id && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111115] border border-[rgba(230,57,70,0.2)] rounded-xl p-4 space-y-3.5 shadow-2xl"
                >
                  <input
                    autoFocus
                    type="text"
                    className="input-base text-[13.5px] py-2 px-3"
                    placeholder="Task title..."
                    value={newTask.title}
                    onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleCreateTask(col.id)}
                  />
                  <select
                    className="input-base text-[13.5px] py-2 px-3"
                    value={newTask.project_id}
                    onChange={e => setNewTask(f => ({ ...f, project_id: e.target.value }))}
                  >
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select
                    className="input-base text-[13.5px] py-2 px-3"
                    value={newTask.assignee_id}
                    onChange={e => setNewTask(f => ({ ...f, assignee_id: e.target.value }))}
                  >
                    <option value="">No assignee</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                   <select
                    className="input-base text-[13.5px] py-2 px-3"
                    value={newTask.priority}
                    onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Priority</option>
                  </select>
                  <input
                    type="date"
                    className="input-base text-[13.5px] py-2 px-3"
                    value={newTask.due_date}
                    onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreateTask(col.id)}
                      className="btn-primary flex-1 justify-center text-[12px] py-2 px-3"
                    >
                      Add Task
                    </button>
                    <button
                      onClick={() => setAddingToColumn(null)}
                      className="btn-ghost text-[12px] py-2 px-2.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
              {/* Edit Task Modal */}
              {editingTask && editingTask.status === col.id && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#111115] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 w-full max-w-4xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold">Edit Task</h3>
                      <button onClick={() => setEditingTask(null)} className="text-gray-500 hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Form Side */}
                      <div className="space-y-4">
                        <input
                          autoFocus
                          type="text"
                          className="input-base text-[13.5px] py-2 px-3 w-full"
                          placeholder="Task title..."
                          value={editingTask.title}
                          onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                          disabled={userRole === 'member'}
                        />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            className="input-base text-[13.5px] py-2 px-3"
                            value={editingTask.project_id || ''}
                            onChange={e => setEditingTask({ ...editingTask, project_id: e.target.value })}
                            disabled={userRole === 'member'}
                          >
                            <option value="">No Project</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>

                          <select
                            className="input-base text-[13.5px] py-2 px-3"
                            value={editingTask.assignee_id || ''}
                            onChange={e => setEditingTask({ ...editingTask, assignee_id: e.target.value })}
                            disabled={userRole === 'member'}
                          >
                            <option value="">Unassigned</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                          </select>

                          <select
                            className="input-base text-[13.5px] py-2 px-3"
                            value={editingTask.priority}
                            onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                            disabled={userRole === 'member'}
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                            <option value="urgent">Urgent</option>
                          </select>

                          <input
                            type="date"
                            className="input-base text-[13.5px] py-2 px-3"
                            value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                            onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value })}
                            disabled={userRole === 'member'}
                          />
                        </div>

                        <textarea
                          className="input-base text-[13.5px] py-2 px-3 w-full resize-none"
                          rows={2}
                          placeholder="Description..."
                          value={editingTask.description || ''}
                          onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                          disabled={userRole === 'member'}
                        />

                        {/* Task Attachments Section */}
                        <div className="space-y-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-medium text-[#666] uppercase tracking-wider">Attached Files ({taskFiles.length})</label>
                            <label className="text-[10px] text-gray-400 hover:text-white cursor-pointer flex items-center gap-1 bg-[#1a1a24] px-2 py-1 rounded-md border border-[rgba(255,255,255,0.03)] hover:border-red-500/20 transition-all">
                              <Upload size={10} />
                              <span>{uploadingTaskFile ? 'Uploading...' : 'Attach from PC'}</span>
                              <input 
                                type="file" 
                                onChange={handleUploadTaskFile} 
                                disabled={uploadingTaskFile}
                                className="hidden" 
                              />
                            </label>
                          </div>
                          
                          {taskFiles.length === 0 ? (
                            <p className="text-[11px] text-[#444] italic">No files attached to this task.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                              {taskFiles.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-950/20 border border-[rgba(255,255,255,0.03)] text-[12px]">
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#e63946] text-gray-300 truncate pr-4">
                                    <span className="text-[11px]">📎</span>
                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                  </a>
                                  {userRole === 'admin' && (
                                    <button 
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;
                                        const supabase = createClient();
                                        const { error } = await supabase.from('files').delete().eq('id', file.id);
                                        if (error) toast.error(error.message);
                                        else setTaskFiles(prev => prev.filter(f => f.id !== file.id));
                                      }}
                                      className="text-gray-500 hover:text-red-500 transition-colors px-1"
                                      title="Delete file"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {userRole === 'admin' && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                            <button onClick={() => setEditingTask(null)} className="btn-ghost py-1.5 px-3 text-[13px]">Cancel</button>
                            <button onClick={handleUpdateTask} className="btn-primary py-1.5 px-3 text-[13px]">Save Changes</button>
                          </div>
                        )}
                      </div>

                      {/* Notes Side */}
                      <div className="h-full min-h-[300px]">
                        <NotesSection entityId={editingTask.id} entityType="task" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
