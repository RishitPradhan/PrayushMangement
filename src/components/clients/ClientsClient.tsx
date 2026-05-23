'use client'

import { useState } from 'react'
import { Client } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/shared/Avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Mail, Phone, Building2, Search, X, FolderKanban } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface ClientsClientProps {
  clients: (Client & { active_projects_count: number })[]
  userRole?: string
}

interface ClientFormState {
  name: string; company: string; email: string; phone: string; status: string; notes: string
}

export function ClientsClient({ clients: initialClients, userRole = 'member' }: ClientsClientProps) {
  const [clients, setClients] = useState(initialClients)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ClientFormState>({
    name: '', company: '', email: '', phone: '', status: 'active', notes: '',
  })

  const field = (key: keyof ClientFormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  const openNewForm = () => {
    setEditingClient(null)
    setForm({ name: '', company: '', email: '', phone: '', status: 'active', notes: '' })
    setShowForm(true)
  }

  const openEditForm = (e: React.MouseEvent, client: Client) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingClient(client)
    setForm({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      status: client.status || 'active',
      notes: client.notes || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (e: React.MouseEvent, client: Client) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete "${client.name}"?`)) return
    
    const supabase = createClient()
    const { error } = await supabase.from('clients').delete().eq('id', client.id)
    if (error) { toast.error(error.message) } else {
      toast.success('Client deleted!')
      setClients(prev => prev.filter(c => c.id !== client.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    
    if (editingClient) {
      const { error } = await supabase.from('clients').update(form).eq('id', editingClient.id)
      if (error) { toast.error(error.message) } else {
        toast.success('Client updated!')
        window.location.reload()
      }
    } else {
      const { error } = await supabase.from('clients').insert([form])
      if (error) { toast.error(error.message) } else {
        toast.success('Client added!')
        window.location.reload()
      }
    }
    setLoading(false)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} clients`}
        action={
          userRole === 'admin' ? (
            <button onClick={openNewForm} className="btn-primary">
              <Plus size={14} /> Add Client
            </button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="relative mb-6 w-64">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
        <input
          type="text"
          placeholder="Search clients..."
          className="input-base pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client, i) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link href={`/clients/${client.id}`} className="block h-full relative group">
              <div className="glass-card p-5 h-full hover:border-[rgba(230,57,70,0.2)] hover:shadow-[0_0_20px_rgba(230,57,70,0.06)] transition-all cursor-pointer">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4 relative">
                  <Avatar name={client.name} size="md" />
                  <div className="flex-1 min-w-0 pr-16">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-white truncate">{client.name}</h3>
                      <StatusBadge status={client.status} />
                    </div>
                    <p className="text-[11px] text-[#555] flex items-center gap-1 mt-0.5">
                      <Building2 size={10} /> {client.company}
                    </p>
                  </div>
                  
                  {/* Actions overlay */}
                  {userRole === 'admin' && (
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#121216] p-1 rounded-lg border border-[rgba(255,255,255,0.05)] shadow-lg z-10">
                      <button onClick={(e) => openEditForm(e, client)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </button>
                      <button onClick={(e) => handleDelete(e, client)} className="p-1.5 text-gray-400 hover:text-[#ef4444] hover:bg-red-500/10 rounded-md transition-colors" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-[12px] text-[#666]">
                    <Mail size={11} className="text-[#444] flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#666]">
                      <Phone size={11} className="text-[#444] flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Projects count */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#555] pt-3 border-t border-[rgba(255,255,255,0.05)] mt-auto">
                  <FolderKanban size={11} className="text-[#e63946]" />
                  <span>{client.active_projects_count} active project{client.active_projects_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Form Modal */}
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
                <h2 className="text-[15px] font-semibold text-white">{editingClient ? 'Edit Client' : 'Add Client'}</h2>
                <button onClick={() => setShowForm(false)} className="text-[#555] hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Name *</label>
                    <input type="text" className="input-base" placeholder="Ayush Sharma" required {...field('name')} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Company</label>
                    <input type="text" className="input-base" placeholder="Acme Corp" {...field('company')} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Email *</label>
                  <input type="email" className="input-base" placeholder="client@company.com" required {...field('email')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Phone</label>
                    <input type="tel" className="input-base" placeholder="+91 98765 43210" {...field('phone')} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Status</label>
                    <select className="input-base" {...field('status')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="prospect">Prospect</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Notes</label>
                  <textarea className="input-base resize-none" rows={3} placeholder="Internal notes about this client..." {...field('notes')} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? (editingClient ? 'Saving...' : 'Adding...') : (editingClient ? 'Save Changes' : 'Add Client')}
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
