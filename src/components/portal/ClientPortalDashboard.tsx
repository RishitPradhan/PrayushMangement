'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PortalData, ProjectStatus, Priority, FileType } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  FileText, MessageSquare, ExternalLink, Link as LinkIcon, 
  Download, CheckCircle2, Circle, Clock, Pencil, Plus, X, 
  Upload, Folder, Sparkles, Check, DollarSign, Calendar,
  ChevronDown, ChevronUp, Mail, Info
} from 'lucide-react'

interface ClientPortalDashboardProps {
  data: PortalData
  token: string
}

export function ClientPortalDashboard({ data: initialData, token }: ClientPortalDashboardProps) {
  const [data, setData] = useState(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revisionMessage, setRevisionMessage] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id || '')
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    phase1: true,
    phase2: true,
    phase3: true
  })

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }))
  }

  // Modals state
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showAddAssetModal, setShowAddAssetModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(false)

  // Edit Project state
  const activeProject = data.projects.find(p => p.id === selectedProjectId) || data.projects[0]
  const [editForm, setEditForm] = useState({
    name: activeProject?.name || '',
    description: activeProject?.description || '',
    status: activeProject?.status || 'planning',
    progress: activeProject?.progress || 0
  })

  // Add Asset state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [assetForm, setAssetForm] = useState({
    name: '',
    url: '',
    type: 'url' as FileType
  })

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'completed': return 'text-[#10b981] border-[#10b981]/20 bg-[#10b981]/5'
      case 'review': return 'text-[#f59e0b] border-[#f59e0b]/20 bg-[#f59e0b]/5'
      case 'in-progress': return 'text-[#3b82f6] border-[#3b82f6]/20 bg-[#3b82f6]/5'
      case 'planning': return 'text-[#8b5cf6] border-[#8b5cf6]/20 bg-[#8b5cf6]/5'
      default: return 'text-gray-400 border-gray-800 bg-gray-950/20'
    }
  }

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revisionMessage.trim() || !selectedProjectId) return

    setIsSubmitting(true)
    const supabase = createClient()
    
    const { data: success, error } = await supabase.rpc('submit_portal_revision', {
      p_token: token,
      p_project_id: selectedProjectId,
      p_message: revisionMessage
    })

    if (error || !success) {
      toast.error('Failed to submit revision request.')
    } else {
      toast.success('Revision request sent to the studio!')
      setRevisionMessage('')
    }
    setIsSubmitting(false)
  }

  // Handle Edit Project details directly on the portal page
  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeProject) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('projects')
      .update({
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        progress: Number(editForm.progress)
      })
      .eq('id', activeProject.id)

    if (error) {
      toast.error('Failed to update project: ' + error.message)
    } else {
      toast.success('Project details updated successfully!')
      
      // Update local state statefully
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === activeProject.id ? {
          ...p,
          name: editForm.name,
          description: editForm.description,
          status: editForm.status as ProjectStatus,
          progress: Number(editForm.progress)
        } : p)
      }))

      setShowEditProjectModal(false)
    }
    setIsSubmitting(false)
  }

  // Handle file selection for file upload in the portal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!assetForm.name) {
        setAssetForm(f => ({ ...f, name: file.name.split('.').slice(0, -1).join('.') }))
      }
    }
  }

  // Handle Asset insertion directly from the portal page
  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeProject) return

    setIsSubmitting(true)
    const supabase = createClient()
    let assetUrl = assetForm.url

    // Handle PC file upload to storage if type is upload
    if (assetForm.type === 'upload') {
      if (selectedFile) {
        setUploadProgress(true)
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = `portal/${activeProject.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, selectedFile)

        if (uploadError) {
          toast.error('File upload failed: ' + uploadError.message)
          setIsSubmitting(false)
          setUploadProgress(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath)

        assetUrl = publicUrl
        setUploadProgress(false)
      } else if (!assetUrl) {
        toast.error('Please choose a file to upload')
        setIsSubmitting(false)
        return
      }
    }

    // Insert file row linked to the project with null uploader
    const { data: insertedFile, error: insertError } = await supabase
      .from('files')
      .insert([{
        name: assetForm.name,
        url: assetUrl,
        type: assetForm.type,
        project_id: activeProject.id,
        uploaded_by: null // client uploaded
      }])
      .select()
      .single()

    if (insertError) {
      toast.error('Failed to create deliverable: ' + insertError.message)
    } else {
      toast.success('Asset uploaded successfully!')

      // Update local state to immediately show the new asset
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === activeProject.id ? {
          ...p,
          files: [insertedFile, ...p.files]
        } : p)
      }))

      setAssetForm({ name: '', url: '', type: 'url' })
      setSelectedFile(null)
      setShowAddAssetModal(false)
    }
    setIsSubmitting(false)
  }

  // Pre-fill Edit form when modal opens
  const openEditModal = () => {
    setEditForm({
      name: activeProject.name,
      description: activeProject.description,
      status: activeProject.status,
      progress: activeProject.progress
    })
    setShowEditProjectModal(true)
  }

  return (
    <div className="min-h-screen bg-[#020204] text-white p-4 sm:p-8 lg:p-12 font-sans overflow-x-hidden relative">
      
      {/* Dynamic neon orbs in background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#a855f7]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#e63946]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[40vw] h-[40vw] bg-[#3b82f6]/4 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="Prayush Studios Logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black tracking-widest text-[#a855f7] uppercase">
                <Sparkles size={12} /> Prayush Studios Hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-500 bg-clip-text text-transparent">
                Welcome, {data.client.name.split(' ')[0]}
              </h1>
              <p className="text-gray-400 text-sm">{data.client.company} Portal</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {data.projects.length > 1 && (
              <select 
                className="input-base w-full md:w-auto bg-[#0a0a0c]/60 border-[rgba(255,255,255,0.05)] text-sm cursor-pointer py-2 pl-4 pr-10"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {data.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </header>

        {activeProject ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 1. Welcome Onboarding Card */}
              <section className="glass-card p-6 sm:p-8 relative overflow-hidden group hover:border-[rgba(168,85,247,0.15)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#a855f7] opacity-[0.02] rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
                
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#a855f7] bg-[#a855f7]/5 border border-[#a855f7]/10 w-fit">
                      <Sparkles size={11} /> Project Workspace
                    </div>
                    
                    {/* Edit Project Button */}
                    <button 
                      onClick={openEditModal}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl border border-[rgba(255,255,255,0.04)] transition-all flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
                    >
                      <Pencil size={12} /> Edit Details
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Welcome to your project portal!
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                      This is your central hub for everything related to your website redesign. Here you’ll find project updates, deliverables, feedback tools, and everything you need to stay in the loop – all in one place.
                    </p>
                  </div>

                  {/* Onboarding grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-2 text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> What you’ll find here
                      </h4>
                      <ul className="space-y-2.5 text-xs text-gray-400 font-medium">
                        <li className="flex items-start gap-2">
                          <span className="text-[#a855f7] font-bold">✓</span>
                          <span>Project updates and current status – always know where things stand</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#a855f7] font-bold">✓</span>
                          <span>Important documents and files – easily access what you need</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#a855f7] font-bold">✓</span>
                          <span>Direct communication and feedback tools – share your thoughts anytime</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#a855f7] font-bold">✓</span>
                          <span>Clear next steps and deliverables – see what’s coming up next</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-2 text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e63946]" /> Quick start
                      </h4>
                      <ul className="space-y-2.5 text-xs text-gray-400 font-medium">
                        <li className="flex items-start gap-2">
                          <span className="text-[#e63946] font-bold">1</span>
                          <span>Read through the Getting Started guide in Phase 1 below</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#e63946] font-bold">2</span>
                          <span>Upload your brand assets so we can hit the ground running</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#e63946] font-bold">3</span>
                          <span>Book your kickoff call using the scheduling link in Phase 1</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#e63946] font-bold">4</span>
                          <span>Check back anytime to track progress and review deliverables</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                    <Info size={16} className="text-[#a855f7] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      If you have any questions or need help navigating your portal, don’t hesitate to reach out to your project manager <strong>Sarah</strong> at <a href="mailto:sarah@polymark.com" className="text-[#a855f7] hover:underline font-bold">sarah@polymark.com</a>.
                    </p>
                  </div>
                </div>
              </section>

              {/* 2. Project Meta Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Current Phase</div>
                  <div className="text-sm font-extrabold text-[#a855f7] tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" /> Design & Development
                  </div>
                </div>
                <div className="glass-card p-5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Next Phase</div>
                  <div className="text-sm font-extrabold text-white tracking-wide">
                    Launch & Handoff
                  </div>
                </div>
                <div className="glass-card p-5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Estimated Completion</div>
                  <div className="text-sm font-extrabold text-[#eab308] tracking-wide">
                    {activeProject.due_date ? formatDate(activeProject.due_date) : 'May 2026'}
                  </div>
                </div>
              </div>

              {/* 3. Interactive Roadmap (Phase 1, 2, 3) */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black tracking-tight text-white uppercase">Project Roadmap</h3>
                    <p className="text-xs text-gray-500">Track milestones, guidelines, deliverables, and approvals</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Phase 1: Discovery */}
                  <div className="glass-card p-0 overflow-hidden border border-white/5">
                    <button 
                      onClick={() => togglePhase('phase1')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/[0.01] transition-all text-left"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-black uppercase tracking-wider">Phase 1</span>
                          <h4 className="text-sm font-black text-white">Discovery</h4>
                        </div>
                        <p className="text-xs text-gray-400">Aligning on your vision, goals, and project scope</p>
                      </div>
                      {expandedPhases.phase1 ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedPhases.phase1 && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden border-t border-white/5 bg-black/20"
                        >
                          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <CheckCircle2 size={16} className="text-[#a855f7] mt-0.5 flex-shrink-0" />
                              <div>
                                <h5 className="text-[13px] font-bold text-white">Getting started</h5>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Your quick-start guide to the project and your portal.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <CheckCircle2 size={16} className="text-[#a855f7] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="text-[13px] font-bold text-white">Kickoff meeting</h5>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">15 Mar</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Let’s align on the project scope and timeline.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <CheckCircle2 size={16} className="text-[#a855f7] mt-0.5 flex-shrink-0" />
                              <div>
                                <h5 className="text-[13px] font-bold text-white">Brand guidelines</h5>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Your brand identity, colors, and typography.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="text-[13px] font-bold text-white">Brand assets</h5>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20">1 pending</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Upload your logos, fonts, and brand materials.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all md:col-span-2">
                              <CheckCircle2 size={16} className="text-[#a855f7] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="text-[13px] font-bold text-white">Timeline & milestones</h5>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">21 Mar</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Key dates and deliverables for each phase.</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Phase 2: Design & Development */}
                  <div className="glass-card p-0 overflow-hidden border border-white/5">
                    <button 
                      onClick={() => togglePhase('phase2')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/[0.01] transition-all text-left"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider">Phase 2</span>
                          <h4 className="text-sm font-black text-white">Design & Development</h4>
                        </div>
                        <p className="text-xs text-gray-400">Creating, refining, and building your new website</p>
                      </div>
                      {expandedPhases.phase2 ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedPhases.phase2 && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden border-t border-white/5 bg-black/20"
                        >
                          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0 animate-pulse" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="text-[13px] font-bold text-white">Design mockups</h5>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">1 Apr</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Visual concepts for your review and approval.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h5 className="text-[13px] font-bold text-white">Design inspiration</h5>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Mood board and visual references for your project.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="text-[13px] font-bold text-white">Feedback & revisions</h5>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black">4 steps</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Share your feedback and discuss changes with the team.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="text-[13px] font-bold text-white">SEO foundations</h5>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">2 keys</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Technical setup and content optimization.</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Phase 3: Launch & Handoff */}
                  <div className="glass-card p-0 overflow-hidden border border-white/5">
                    <button 
                      onClick={() => togglePhase('phase3')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/[0.01] transition-all text-left"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">Phase 3</span>
                          <h4 className="text-sm font-black text-white">Launch & Handoff</h4>
                        </div>
                        <p className="text-xs text-gray-400">Final files, documentation, and everything you need to go live</p>
                      </div>
                      {expandedPhases.phase3 ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedPhases.phase3 && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden border-t border-white/5 bg-black/20"
                        >
                          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="text-[13px] font-bold text-white">Final deliverables</h5>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">1 May</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Download your completed project files.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h5 className="text-[13px] font-bold text-white">Site management guide</h5>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Everything you need to manage your new site.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h5 className="text-[13px] font-bold text-white">Invoice & payment</h5>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Payment details and receipts.</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:bg-white/[0.04] transition-all">
                              <Circle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h5 className="text-[13px] font-bold text-white">Ongoing support</h5>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Your maintenance and support options.</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>

              {/* 4. Deliverables & Assets Grid */}
              <section className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-black tracking-tight text-white uppercase">Deliverables & Assets</h2>
                    <p className="text-xs text-gray-500">Project files, workspace links, and final designs</p>
                  </div>
                  
                  {/* Add Asset Button */}
                  <button 
                    onClick={() => setShowAddAssetModal(true)}
                    className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Add Asset / File
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeProject.files.length > 0 ? activeProject.files.map((file, i) => (
                    <motion.a 
                      key={file.id} 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="glass-card p-5 hover:border-[#a855f7]/30 hover:bg-[#111115]/30 transition-all group flex items-start gap-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 text-gray-300 group-hover:text-[#a855f7] group-hover:bg-[#a855f7]/5 transition-all">
                        {file.type === 'drive' ? <Folder size={18} /> : file.type === 'figma' ? <FigmaIcon /> : <LinkIcon size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-white truncate group-hover:text-[#a855f7] transition-colors">{file.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">{file.type}</p>
                        <p className="text-[9.5px] text-[#444] mt-1">{formatDate(file.created_at)}</p>
                      </div>
                      <ExternalLink size={13} className="text-[#333] group-hover:text-white transition-all flex-shrink-0" />
                    </motion.a>
                  )) : (
                    <div className="col-span-2 text-center py-16 glass-card flex flex-col items-center justify-center border-dashed">
                      <Folder size={32} className="text-[#333] mb-3" />
                      <p className="text-gray-500 text-sm font-semibold">No deliverables uploaded yet</p>
                      <p className="text-gray-600 text-xs mt-0.5">Click the "Add Asset / File" button above to upload links or files!</p>
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Right Column */}
            <div className="space-y-8">
              
              {/* Financial Ledger card */}
              <section className="glass-card p-8">
                <h2 className="text-sm font-black uppercase tracking-widest text-[#555] mb-6 flex items-center gap-2">
                  <FileText size={14} className="text-gray-500" />
                  Financial Ledger
                </h2>
                {activeProject.payments.length > 0 ? (
                  <div className="space-y-6">
                    {activeProject.payments.map((payment) => (
                      <div key={payment.id} className="space-y-4">
                        <div className="flex justify-between items-end">
                          <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">Total Fee</p>
                          <p className="text-md font-extrabold text-white">{formatCurrency(payment.total_amount)}</p>
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">Advance Received</p>
                          <p className="text-sm font-medium text-emerald-400">{formatCurrency(payment.advance_paid)}</p>
                        </div>
                        <div className="pt-4 border-t border-[rgba(255,255,255,0.04)] flex justify-between items-end">
                          <p className="text-[11px] text-[#e63946] uppercase tracking-widest font-black">Balance Due</p>
                          <p className="text-xl font-black text-[#e63946]">{formatCurrency(payment.balance)}</p>
                        </div>
                        {payment.invoice_url && (
                          <a 
                            href={payment.invoice_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-primary w-full justify-center mt-6 py-2.5 text-xs flex items-center gap-2"
                          >
                            <Download size={13} /> Download Invoice
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <DollarSign size={24} className="text-[#333] mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">No payment records found.</p>
                  </div>
                )}
              </section>

              {/* Questions / Support Manager Card */}
              <section className="glass-card p-8 relative overflow-hidden group hover:border-[#a855f7]/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#a855f7] opacity-[0.02] rounded-full blur-2xl pointer-events-none" />
                
                <h2 className="text-sm font-black uppercase tracking-widest text-[#555] mb-4 flex items-center gap-2">
                  <Mail size={14} className="text-gray-500" />
                  Questions?
                </h2>
                
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Have questions about your website redesign? Need help navigating your portal? Get in touch with your dedicated project manager.
                  </p>

                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-[#a855f7]/10 flex items-center justify-center text-[#a855f7] font-black text-sm">
                      S
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Sarah</h4>
                      <p className="text-[10px] text-gray-500">Project Manager</p>
                    </div>
                  </div>

                  <a 
                    href="mailto:sarah@polymark.com?subject=Website Redesign Inquiry"
                    className="w-full bg-[#a855f7] text-white hover:bg-[#b56bf9] font-extrabold py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Mail size={13} /> Get In Touch
                  </a>
                </div>
              </section>

              {/* Revision Requests */}
              <section className="glass-card p-8">
                <h2 className="text-sm font-black uppercase tracking-widest text-[#555] mb-4 flex items-center gap-2">
                  <MessageSquare size={14} className="text-gray-500" />
                  Request Revision
                </h2>
                <p className="text-[12px] text-gray-400 leading-relaxed mb-6">Need a modification or have feedback? Send a note directly to our project space.</p>
                
                <form onSubmit={handleRevisionSubmit} className="space-y-4">
                  <textarea 
                    className="input-base w-full resize-none h-24 text-[13px] bg-[#0a0a0c]/60 focus:border-[#a855f7]/30" 
                    placeholder="E.g., Can we update the brand color in section 2?"
                    value={revisionMessage}
                    onChange={e => setRevisionMessage(e.target.value)}
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-white text-black font-extrabold py-3 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 text-[12px] uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Sending...' : 'Submit Note'}
                  </button>
                </form>
              </section>

            </div>
          </div>
        ) : (
          <div className="text-center py-24 glass-card">
            <h2 className="text-xl font-bold mb-2">No Active Projects</h2>
            <p className="text-gray-500">You currently don't have any active projects linked to this portal.</p>
          </div>
        )}

      </div>

      {/* Edit Project details Glass Modal */}
      <AnimatePresence>
        {showEditProjectModal && (
          <div className="modal-overlay" onClick={() => setShowEditProjectModal(false)}>
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold text-white">Edit Project Info</h2>
                <button onClick={() => setShowEditProjectModal(false)} className="text-[#555] hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditProjectSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Project Name *</label>
                  <input 
                    type="text" 
                    className="input-base" 
                    required 
                    value={editForm.name} 
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Project Status</label>
                  <select 
                    className="input-base"
                    value={editForm.status} 
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
                  >
                    <option value="planning">Planning</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Progress: {editForm.progress}%</label>
                  <input 
                    type="range"
                    min={0}
                    max={100}
                    className="w-full accent-[#a855f7]"
                    value={editForm.progress} 
                    onChange={e => setEditForm(f => ({ ...f, progress: Number(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea 
                    className="input-base resize-none" 
                    rows={4}
                    placeholder="Describe the project scope..."
                    value={editForm.description} 
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditProjectModal(false)} className="btn-ghost text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                    {isSubmitting ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Asset Glass Modal */}
      <AnimatePresence>
        {showAddAssetModal && (
          <div className="modal-overlay" onClick={() => setShowAddAssetModal(false)}>
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold text-white">Add Deliverable or Asset</h2>
                <button onClick={() => setShowAddAssetModal(false)} className="text-[#555] hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddAssetSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Asset Name *</label>
                  <input 
                    type="text" 
                    className="input-base" 
                    placeholder="e.g. Design Prototype or Reference File" 
                    required 
                    value={assetForm.name} 
                    onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Asset Type</label>
                  <select 
                    className="input-base"
                    value={assetForm.type}
                    onChange={e => setAssetForm(f => ({ ...f, type: e.target.value as FileType }))}
                  >
                    <option value="url">Web Link (Any URL)</option>
                    <option value="drive">Google Drive Link</option>
                    <option value="figma">Figma Project Link</option>
                    <option value="upload">Upload File from Device</option>
                  </select>
                </div>

                {assetForm.type === 'upload' ? (
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider font-bold text-[#a855f7]">Choose File *</label>
                    <input 
                      type="file" 
                      onChange={handleFileChange} 
                      className="input-base text-[13px]" 
                      required 
                    />
                    {uploadProgress && (
                      <p className="text-[11px] text-gray-500 mt-1 animate-pulse">Uploading file to storage bucket...</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">Destination URL *</label>
                    <input 
                      type="url" 
                      className="input-base" 
                      placeholder="https://..." 
                      required 
                      value={assetForm.url} 
                      onChange={e => setAssetForm(f => ({ ...f, url: e.target.value }))}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddAssetModal(false)} className="btn-ghost text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                    {isSubmitting ? 'Uploading...' : 'Add Asset'}
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

function FigmaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/>
      <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/>
      <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/>
      <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/>
      <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>
    </svg>
  )
}
