'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface Client {
  id: string
  name: string
  company: string
}

interface ProjectFormProps {
  clients: Client[]
  initialData?: any // Full Project object
  onClose: () => void
  onCreated: () => void // Acts as onSaved now
}

export function ProjectForm({ clients, initialData, onClose, onCreated }: ProjectFormProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData
  const [form, setForm] = useState({
    name: initialData?.name || '',
    client_id: initialData?.client_id || '',
    description: initialData?.description || '',
    status: initialData?.status || 'planning',
    priority: initialData?.priority || 'medium',
    due_date: initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '',
    progress: initialData?.progress || 0,
    fee: initialData?.payment?.total_amount?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    
    const payload = {
      name: form.name,
      client_id: form.client_id || null,
      description: form.description,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      progress: form.progress,
    }

    let projectId = initialData?.id

    if (isEditing) {
      const { error } = await supabase.from('projects').update(payload).eq('id', initialData.id)
      if (error) {
        toast.error('Failed to update project: ' + error.message)
        setLoading(false)
        return
      }
    } else {
      const { data, error } = await supabase.from('projects').insert([payload]).select('id').single()
      if (error) {
        toast.error('Failed to create project: ' + error.message)
        setLoading(false)
        return
      }
      projectId = data.id
    }

    // Handle payments total_amount (Project Fee) sync
    if (form.fee) {
      const feeVal = parseFloat(form.fee)
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle()

      if (existingPayment) {
        const newStatus = (existingPayment.advance_paid ?? 0) >= feeVal ? 'paid' : 'partial'
        const { error } = await supabase
          .from('payments')
          .update({ 
            total_amount: feeVal,
            status: newStatus
          })
          .eq('id', existingPayment.id)
        if (error) console.error('Failed to sync project fee to payments:', error.message)
      } else {
        const { error } = await supabase
          .from('payments')
          .insert([{
            project_id: projectId,
            total_amount: feeVal,
            advance_paid: 0,
            status: 'pending'
          }])
        if (error) console.error('Failed to initialize project fee in payments:', error.message)
      }
    }

    toast.success(isEditing ? 'Project updated!' : 'Project created!')
    onCreated()
    setLoading(false)
  }

  const field = (key: string) => ({
    value: form[key as keyof typeof form],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
          <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">{isEditing ? 'Edit Project Details' : 'Initialize New Project'}</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Project Name *</label>
            <input type="text" className="input-base" placeholder="e.g. Brand Identity Redesign" required {...field('name')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Client *</label>
              <select className="input-base" required {...field('client_id')}>
                <option value="">-- Select Client Profile --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Project Fee (INR) *</label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                className="input-base" 
                placeholder="e.g. 50000" 
                required
                {...field('fee')} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Due Date</label>
              <input type="date" className="input-base text-[13px]" {...field('due_date')} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Priority</label>
              <select className="input-base" {...field('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Status</label>
              <select className="input-base" {...field('status')}>
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">
                Progress: {form.progress}%
              </label>
              <div className="pt-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  className="w-full accent-white"
                  value={form.progress}
                  onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Description</label>
            <textarea
              className="input-base resize-none"
              rows={3}
              placeholder="Project brief, goals, notes..."
              {...field('description')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
