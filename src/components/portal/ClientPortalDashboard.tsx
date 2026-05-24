'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PortalData, ProjectStatus, Priority, FileType, Note } from '@/types'
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
  const [activeEditTab, setActiveEditTab] = useState('basic')
  const [showAddAssetModal, setShowAddAssetModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(false)

  // Edit Project state
  const activeProject = data.projects.find(p => p.id === selectedProjectId) || data.projects[0]
  const [editForm, setEditForm] = useState({
    name: activeProject?.name || '',
    description: activeProject?.description || '',
    status: activeProject?.status || 'planning',
    progress: activeProject?.progress || 0,
    fee: activeProject?.payments?.[0]?.total_amount?.toString() || '',
    advance_paid: activeProject?.payments?.[0]?.advance_paid?.toString() || '',
    invoice_url: activeProject?.payments?.[0]?.invoice_url || '',
    portal_welcome_title: activeProject?.portal_welcome_title || 'Welcome to your project portal!',
    portal_welcome_message: activeProject?.portal_welcome_message || 'This is your central hub for everything related to your website redesign. Here you’ll find project updates, deliverables, feedback tools, and everything you need to stay in the loop – all in one place.',
    portal_current_phase: activeProject?.portal_current_phase || 'Design & Development',
    portal_next_phase: activeProject?.portal_next_phase || 'Launch & Handoff',
    portal_pm_name: activeProject?.portal_pm_name || 'Sarah',
    portal_pm_email: activeProject?.portal_pm_email || 'sarah@polymark.com',
    portal_quick_start: activeProject?.portal_quick_start || 'Read through the Getting Started guide in Phase 1 below;Upload your brand assets so we can hit the ground running;Book your kickoff call using the scheduling link in Phase 1;Check back anytime to track progress and review deliverables',
    portal_roadmap: activeProject?.portal_roadmap || 'Phase 1: Discovery|Aligning on your vision, goals, and project scope|Getting started,Kickoff meeting - 15 Mar,Brand guidelines,Brand assets - 1 pending,Timeline & milestones - 21 Mar;Phase 2: Design & Development|Creating, refining, and building your new website|Design mockups - 1 Apr,Design inspiration,Feedback & revisions - 4 steps,SEO foundations - 2 keys;Phase 3: Launch & Handoff|Final files, documentation, and everything you need to go live|Final deliverables - 1 May,Site management guide,Invoice & payment,Ongoing support'
  })

  // Client Note state
  const [clientNoteMessage, setClientNoteMessage] = useState('')


  // Add Asset state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [assetForm, setAssetForm] = useState({
    name: '',
    url: '',
    type: 'url' as FileType
  })

  // Milestone / Field Edit states
  const [showEditMilestoneModal, setShowEditMilestoneModal] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<{
    pIdx: number
    iIdx: number
    name: string
    tag: string
    assetUrl: string
  } | null>(null)

  const openEditMilestoneModal = (pIdx: number, iIdx: number, item: { name: string; tag: string; assetUrl: string }) => {
    setSelectedMilestone({
      pIdx,
      iIdx,
      name: item.name,
      tag: item.tag,
      assetUrl: item.assetUrl || ''
    })
    setShowEditMilestoneModal(true)
  }

  // Milestone Details Split-Pane Modal states
  const [showMilestoneDetailsModal, setShowMilestoneDetailsModal] = useState(false)
  const [activeMilestoneDetail, setActiveMilestoneDetail] = useState<{
    pIdx: number
    iIdx: number
    phaseName: string
    name: string
    tag: string
    assetUrl: string
  } | null>(null)

  const openMilestoneDetailsModal = (pIdx: number, iIdx: number, item: { name: string; tag: string; assetUrl: string }, phaseName: string) => {
    setActiveMilestoneDetail({
      pIdx,
      iIdx,
      phaseName,
      name: item.name,
      tag: item.tag,
      assetUrl: item.assetUrl || ''
    })
    setShowMilestoneDetailsModal(true)
  }

  const [milestoneNoteMessage, setMilestoneNoteMessage] = useState('')

  const handleEditMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMilestone || !activeProject) return

    setIsSubmitting(true)
    const supabase = createClient()

    // Parse current roadmap phases
    const defaultRoadmap = 'Phase 1: Discovery|Aligning on your vision, goals, and project scope|Getting started,Kickoff meeting - 15 Mar,Brand guidelines,Brand assets - 1 pending,Timeline & milestones - 21 Mar;Phase 2: Design & Development|Creating, refining, and building your new website|Design mockups - 1 Apr,Design inspiration,Feedback & revisions - 4 steps,SEO foundations - 2 keys;Phase 3: Launch & Handoff|Final files, documentation, and everything you need to go live|Final deliverables - 15 May,Site management guide,Invoice & payment,Ongoing support'
    const roadmapStr = activeProject.portal_roadmap || defaultRoadmap

    const phases = roadmapStr.split(';').map((phaseStr, pIdx) => {
      const parts = phaseStr.split('|')
      const titlePart = parts[0] || ''
      const descPart = parts[1] || ''
      const itemsPart = parts[2] || ''

      const items = itemsPart.split(',').map((item, iIdx) => {
        if (pIdx === selectedMilestone.pIdx && iIdx === selectedMilestone.iIdx) {
          // Re-serialize with new name, tag, and assetUrl
          let res = selectedMilestone.name.trim().replace(/[,|;^]/g, '')
          
          const cleanTag = selectedMilestone.tag.trim().replace(/[,|;^]/g, '')
          if (cleanTag) {
            res += ` - ${cleanTag}`
          }
          
          const cleanUrl = selectedMilestone.assetUrl.trim().replace(/[,|;]/g, '')
          if (cleanUrl) {
            res += `^${cleanUrl}`
          }
          return res
        }
        return item
      })

      return `${titlePart}|${descPart}|${items.join(',')}`
    })

    const newRoadmapStr = phases.join(';')

    const { error } = await supabase
      .from('projects')
      .update({ portal_roadmap: newRoadmapStr })
      .eq('id', activeProject.id)

    if (error) {
      toast.error('Failed to update milestone: ' + error.message)
    } else {
      toast.success('Milestone updated successfully!')
      
      // Update local state statefully
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === activeProject.id ? {
          ...p,
          portal_roadmap: newRoadmapStr
        } : p)
      }))

      setShowEditMilestoneModal(false)
      setSelectedMilestone(null)
    }
    setIsSubmitting(false)
  }

  const parseRoadmap = (roadmapStr?: string) => {
    const defaultRoadmap = 'Phase 1: Discovery|Aligning on your vision, goals, and project scope|Getting started,Kickoff meeting - 15 Mar,Brand guidelines,Brand assets - 1 pending,Timeline & milestones - 21 Mar;Phase 2: Design & Development|Creating, refining, and building your new website|Design mockups - 1 Apr,Design inspiration,Feedback & revisions - 4 steps,SEO foundations - 2 keys;Phase 3: Launch & Handoff|Final files, documentation, and everything you need to go live|Final deliverables - 15 May,Site management guide,Invoice & payment,Ongoing support'
    const str = roadmapStr || defaultRoadmap
    
    return str.split(';').map((phaseStr, idx) => {
      const parts = phaseStr.split('|')
      const titlePart = parts[0] || `Phase ${idx + 1}`
      const descPart = parts[1] || ''
      const itemsPart = parts[2] || ''
      
      const items = itemsPart.split(',').map(item => {
        let rawNameAndTag = item
        let assetUrl = ''
        
        if (item.includes('^')) {
          const parts = item.split('^')
          rawNameAndTag = parts[0] || ''
          assetUrl = parts[1] || ''
        }

        const subparts = rawNameAndTag.split(' - ')
        const name = subparts[0] || ''
        const tag = subparts[1] || ''

        return { name, tag, assetUrl }
      })

      return {
        key: `phase${idx + 1}`,
        phaseNum: titlePart.split(':')[0]?.trim() || `Phase ${idx + 1}`,
        title: titlePart.split(':')[1]?.trim() || titlePart,
        description: descPart,
        items
      }
    })
  }

  const parsedPhases = activeProject ? parseRoadmap(activeProject.portal_roadmap) : []

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

    // Try updating all columns including the portal welcome titles and custom roadmaps
    const updatePayload: any = {
      name: editForm.name,
      description: editForm.description,
      status: editForm.status,
      progress: Number(editForm.progress),
      portal_welcome_title: editForm.portal_welcome_title,
      portal_welcome_message: editForm.portal_welcome_message,
      portal_current_phase: editForm.portal_current_phase,
      portal_next_phase: editForm.portal_next_phase,
      portal_pm_name: editForm.portal_pm_name,
      portal_pm_email: editForm.portal_pm_email,
      portal_quick_start: editForm.portal_quick_start,
      portal_roadmap: editForm.portal_roadmap
    }

    let { error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', activeProject.id)

    if (error) {
      console.warn('Expanded portal columns not present in DB yet, falling back to basic details update:', error)
      
      // Fallback update to standard fields
      const { error: fallbackError } = await supabase
        .from('projects')
        .update({
          name: editForm.name,
          description: editForm.description,
          status: editForm.status,
          progress: Number(editForm.progress)
        })
        .eq('id', activeProject.id)

      error = fallbackError
    }

    if (error) {
      toast.error('Failed to update project: ' + error.message)
    } else {
      // Sync payment details if fee or advance is specified
      let updatedPayments = activeProject.payments || []
      if (editForm.fee) {
        const feeVal = parseFloat(editForm.fee) || 0
        const advanceVal = parseFloat(editForm.advance_paid) || 0
        const balanceVal = feeVal - advanceVal
        const statusVal = balanceVal <= 0 ? 'paid' : (advanceVal > 0 ? 'partial' : 'pending')
        const invoiceUrlVal = editForm.invoice_url.trim() || null

        const { data: existingPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('project_id', activeProject.id)
          .maybeSingle()

        if (existingPayment) {
          const { data: updatedPay, error: payError } = await supabase
            .from('payments')
            .update({ 
              total_amount: feeVal,
              advance_paid: advanceVal,
              balance: balanceVal,
              status: statusVal,
              invoice_url: invoiceUrlVal
            })
            .eq('id', existingPayment.id)
            .select()
            .maybeSingle()
          
          if (!payError && updatedPay) {
            updatedPayments = [updatedPay]
          }
        } else {
          const { data: insertedPay, error: payError } = await supabase
            .from('payments')
            .insert([{
              project_id: activeProject.id,
              total_amount: feeVal,
              advance_paid: advanceVal,
              balance: balanceVal,
              status: statusVal,
              invoice_url: invoiceUrlVal
            }])
            .select()
            .maybeSingle()
          
          if (!payError && insertedPay) {
            updatedPayments = [insertedPay]
          }
        }
      }

      toast.success('Project details updated successfully!')
      
      // Update local state statefully
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === activeProject.id ? {
          ...p,
          ...editForm,
          payments: updatedPayments,
          status: editForm.status as ProjectStatus,
          progress: Number(editForm.progress)
        } : p)
      }))

      setShowEditProjectModal(false)
    }
    setIsSubmitting(false)
  }

  // Handle client note submission inside discussion feed
  const handleClientNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientNoteMessage.trim() || !activeProject) return

    setIsSubmitting(true)
    const supabase = createClient()

    // Call secure RPC to insert client note
    const { data: insertedNote, error } = await supabase.rpc('add_portal_note', {
      p_token: token,
      p_project_id: activeProject.id,
      p_content: clientNoteMessage.trim()
    })

    if (error) {
      // Fallback if RPC doesn't exist yet: use submit_portal_revision
      console.warn('add_portal_note RPC not found, falling back to submit_portal_revision:', error)
      const { data: fallbackSuccess, error: fallbackError } = await supabase.rpc('submit_portal_revision', {
        p_token: token,
        p_project_id: activeProject.id,
        p_message: 'Discussion Note: ' + clientNoteMessage.trim()
      })

      if (fallbackError) {
        toast.error('Failed to post note: ' + fallbackError.message)
      } else {
        toast.success('Note posted successfully!')
        
        // Push a local mockup note to the UI feed so they see it instantly!
        const mockNote: Note = {
          id: Math.random().toString(),
          author_id: '',
          entity_id: activeProject.id,
          entity_type: 'project',
          content: 'Discussion Note: ' + clientNoteMessage.trim(),
          created_at: new Date().toISOString(),
          author: {
            id: '',
            email: data.client.email,
            full_name: data.client.name + ' (Client)',
            role: 'member',
            created_at: new Date().toISOString()
          }
        }

        setData(prev => ({
          ...prev,
          projects: prev.projects.map(p => p.id === activeProject.id ? {
            ...p,
            notes: [mockNote, ...(p.notes || [])]
          } : p)
        }))
        setClientNoteMessage('')
      }
    } else if (insertedNote) {
      toast.success('Note posted successfully!')
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === activeProject.id ? {
          ...p,
          notes: [insertedNote, ...(p.notes || [])]
        } : p)
      }))
      setClientNoteMessage('')
    }
    setIsSubmitting(false)
  }

  // Handle milestone-specific note/comment submission
  const handleMilestoneNoteSubmit = async (e: React.FormEvent, milestoneName: string) => {
    e.preventDefault()
    if (!milestoneNoteMessage.trim() || !activeProject) return

    setIsSubmitting(true)
    const supabase = createClient()
    const prefixedMessage = `[Milestone: ${milestoneName}] ${milestoneNoteMessage.trim()}`

    // Call secure RPC to insert client note
    const { data: insertedNote, error } = await supabase.rpc('add_portal_note', {
      p_token: token,
      p_project_id: activeProject.id,
      p_content: prefixedMessage
    })

    if (error) {
      console.warn('add_portal_note RPC not found, falling back to submit_portal_revision:', error)
      const { data: fallbackSuccess, error: fallbackError } = await supabase.rpc('submit_portal_revision', {
        p_token: token,
        p_project_id: activeProject.id,
        p_message: prefixedMessage
      })

      if (fallbackError) {
        toast.error('Failed to post comment: ' + fallbackError.message)
      } else {
        toast.success('Comment posted successfully!')
        
        // Push a local mockup note to the UI feed so they see it instantly!
        const mockNote: Note = {
          id: Math.random().toString(),
          author_id: '',
          entity_id: activeProject.id,
          entity_type: 'project',
          content: prefixedMessage,
          created_at: new Date().toISOString(),
          author: {
            id: '',
            email: data.client.email,
            full_name: data.client.name + ' (Client)',
            role: 'member',
            created_at: new Date().toISOString()
          }
        }

        setData(prev => ({
          ...prev,
          projects: prev.projects.map(p => p.id === activeProject.id ? {
            ...p,
            notes: [mockNote, ...(p.notes || [])]
          } : p)
        }))
        setMilestoneNoteMessage('')
      }
    } else if (insertedNote) {
      toast.success('Comment posted successfully!')
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === activeProject.id ? {
          ...p,
          notes: [insertedNote, ...(p.notes || [])]
        } : p)
      }))
      setMilestoneNoteMessage('')
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
      description: activeProject.description || '',
      status: activeProject.status,
      progress: activeProject.progress,
      fee: activeProject.payments?.[0]?.total_amount?.toString() || '',
      advance_paid: activeProject.payments?.[0]?.advance_paid?.toString() || '',
      invoice_url: activeProject.payments?.[0]?.invoice_url || '',
      portal_welcome_title: activeProject.portal_welcome_title || 'Welcome to your project portal!',
      portal_welcome_message: activeProject.portal_welcome_message || 'This is your central hub for everything related to your website redesign. Here you’ll find project updates, deliverables, feedback tools, and everything you need to stay in the loop – all in one place.',
      portal_current_phase: activeProject.portal_current_phase || 'Design & Development',
      portal_next_phase: activeProject.portal_next_phase || 'Launch & Handoff',
      portal_pm_name: activeProject.portal_pm_name || 'Sarah',
      portal_pm_email: activeProject.portal_pm_email || 'sarah@polymark.com',
      portal_quick_start: activeProject.portal_quick_start || 'Read through the Getting Started guide in Phase 1 below;Upload your brand assets so we can hit the ground running;Book your kickoff call using the scheduling link in Phase 1;Check back anytime to track progress and review deliverables',
      portal_roadmap: activeProject.portal_roadmap || 'Phase 1: Discovery|Aligning on your vision, goals, and project scope|Getting started,Kickoff meeting - 15 Mar,Brand guidelines,Brand assets - 1 pending,Timeline & milestones - 21 Mar;Phase 2: Design & Development|Creating, refining, and building your new website|Design mockups - 1 Apr,Design inspiration,Feedback & revisions - 4 steps,SEO foundations - 2 keys;Phase 3: Launch & Handoff|Final files, documentation, and everything you need to go live|Final deliverables - 15 May,Site management guide,Invoice & payment,Ongoing support'
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
              {/* Project Metrics Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Current Phase */}
                <div className="glass-card p-5 border-l-4 border-l-[#BD00FF] relative overflow-hidden bg-[#11141D] flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#BD00FF] mb-1">Current Phase</p>
                  <h4 className="text-sm font-extrabold text-white">{activeProject.portal_current_phase || 'Design & Development'}</h4>
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#BD00FF] animate-pulse" />
                </div>
                {/* Card 2: Next Phase */}
                <div className="glass-card p-5 border-l-4 border-l-[#00F2FE] relative overflow-hidden bg-[#11141D] flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#00F2FE] mb-1">Next Phase</p>
                  <h4 className="text-sm font-extrabold text-white">{activeProject.portal_next_phase || 'Launch & Handoff'}</h4>
                </div>
                {/* Card 3: Estimated Completion */}
                <div className="glass-card p-5 border-l-4 border-l-[#39FF14] relative overflow-hidden bg-[#11141D] flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#39FF14] mb-1">Estimated Completion</p>
                  <h4 className="text-sm font-extrabold text-white">May 2026</h4>
                </div>
              </div>

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
                      {activeProject.portal_welcome_title || 'Welcome to your project portal!'}
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                      {activeProject.portal_welcome_message || 'This is your central hub for everything related to your website redesign. Here you’ll find project updates, deliverables, feedback tools, and everything you need to stay in the loop – all in one place.'}
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
                        {(activeProject.portal_quick_start || 'Read through the Getting Started guide in Phase 1 below;Upload your brand assets so we can hit the ground running;Book your kickoff call using the scheduling link in Phase 1;Check back anytime to track progress and review deliverables').split(';').map((qs, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[#e63946] font-bold">{i + 1}</span>
                            <span>{qs.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                    <Info size={16} className="text-[#a855f7] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      If you have any questions or need help navigating your portal, don’t hesitate to reach out to your project manager <strong>{activeProject.portal_pm_name || 'Sarah'}</strong> at <a href={`mailto:${activeProject.portal_pm_email || 'sarah@polymark.com'}`} className="text-[#a855f7] hover:underline font-bold">{activeProject.portal_pm_email || 'sarah@polymark.com'}</a>.
                    </p>
                  </div>
                </div>
              </section>

              {/* 2. Project Meta Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Current Phase</div>
                  <div className="text-sm font-extrabold text-[#a855f7] tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" /> {activeProject.portal_current_phase || 'Design & Development'}
                  </div>
                </div>
                <div className="glass-card p-5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Next Phase</div>
                  <div className="text-sm font-extrabold text-white tracking-wide">
                    {activeProject.portal_next_phase || 'Launch & Handoff'}
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
                  {parsedPhases.map((phase, pIdx) => {
                      const isExpanded = expandedPhases[phase.key] !== false;
                      const badgeColor = pIdx === 0 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : pIdx === 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                      return (
                        <div key={phase.key} className="glass-card p-0 overflow-hidden border border-white/5">
                          <button 
                            onClick={() => setExpandedPhases(prev => ({ ...prev, [phase.key]: !prev[phase.key] }))}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/[0.01] transition-all text-left"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                                  {phase.phaseNum}
                                </span>
                                <h4 className="text-sm font-black text-white">{phase.title}</h4>
                              </div>
                              <p className="text-xs text-gray-400">{phase.description}</p>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </button>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden border-t border-white/5 bg-black/20"
                              >
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {(() => {
                                    const getMilestoneIcon = (name: string) => {
                                      const lowercaseName = name.toLowerCase();
                                      if (lowercaseName.includes('discovery') || lowercaseName.includes('inspiration') || lowercaseName.includes('research')) {
                                        return <Sparkles className="text-[#00F2FE]" size={18} />
                                      }
                                      if (lowercaseName.includes('kickoff') || lowercaseName.includes('call') || lowercaseName.includes('meeting')) {
                                        return <MessageSquare className="text-[#a855f7]" size={18} />
                                      }
                                      if (lowercaseName.includes('brand') || lowercaseName.includes('assets') || lowercaseName.includes('logo')) {
                                        return <Folder className="text-[#BD00FF]" size={18} />
                                      }
                                      if (lowercaseName.includes('timeline') || lowercaseName.includes('milestones') || lowercaseName.includes('schedule')) {
                                        return <Calendar className="text-[#39FF14]" size={18} />
                                      }
                                      if (lowercaseName.includes('design') || lowercaseName.includes('mockup') || lowercaseName.includes('prototype')) {
                                        return <Pencil className="text-[#BD00FF]" size={18} />
                                      }
                                      if (lowercaseName.includes('seo') || lowercaseName.includes('google') || lowercaseName.includes('marketing')) {
                                        return <Info className="text-[#00F2FE]" size={18} />
                                      }
                                      if (lowercaseName.includes('invoice') || lowercaseName.includes('payment') || lowercaseName.includes('ledger')) {
                                        return <DollarSign className="text-[#39FF14]" size={18} />
                                      }
                                      return <FileText className="text-gray-400" size={18} />
                                    }

                                    return phase.items.map((item, iIdx) => {
                                      const isPending = item.tag.toLowerCase().includes('pending');
                                      const isDone = !isPending && (pIdx === 0 || iIdx < 2);
                                      return (
                                        <div 
                                          key={iIdx} 
                                          onClick={() => openMilestoneDetailsModal(pIdx, iIdx, item, phase.title)}
                                          className="p-5 rounded-2xl bg-[#11141D] hover:bg-[#151924] border border-white/5 flex flex-col justify-between hover:border-[#a855f7]/30 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                                        >
                                          <div className="absolute top-0 right-0 w-24 h-24 bg-[#a855f7] opacity-[0.01] rounded-full blur-xl pointer-events-none group-hover:opacity-[0.03] transition-all" />
                                          
                                          <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0">
                                                {getMilestoneIcon(item.name)}
                                              </div>
                                              
                                              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                                {item.tag && (
                                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                                                    isPending 
                                                      ? 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20 animate-pulse'
                                                      : 'bg-white/5 text-gray-400 border-white/5'
                                                  }`}>
                                                    {item.tag}
                                                  </span>
                                                )}
                                                <button 
                                                  type="button"
                                                  onClick={() => openEditMilestoneModal(pIdx, iIdx, item)}
                                                  className="p-1 text-gray-500 hover:text-[#a855f7] hover:bg-white/5 rounded transition-all opacity-0 group-hover:opacity-100"
                                                  title="Edit Field & Assets"
                                                >
                                                  <Pencil size={11} />
                                                </button>
                                              </div>
                                            </div>

                                            <div className="space-y-1">
                                              <h5 className="text-[13px] font-black text-white group-hover:text-[#a855f7] transition-all truncate">{item.name}</h5>
                                              <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                                                Click to view deliverables, access links, and write specific updates for {item.name}.
                                              </p>
                                            </div>
                                          </div>

                                          {item.assetUrl && (
                                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center w-full" onClick={e => e.stopPropagation()}>
                                              <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                                                <LinkIcon size={10} className="text-[#a855f7]" /> Asset Available
                                              </span>
                                              <a 
                                                href={item.assetUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#a855f7] hover:text-white transition-all"
                                              >
                                                Open <ExternalLink size={10} />
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })
                                  })()}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
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

              {/* 5. Discussion & Notes Feed */}
              <section className="glass-card p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <MessageSquare size={18} className="text-[#a855f7]" /> Project Discussions
                    </h3>
                    <p className="text-xs text-gray-500">Add notes, feedback, and coordinate directly with the studio team</p>
                  </div>
                </div>

                {/* Notes Feed container */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-custom">
                  {activeProject.notes && activeProject.notes.length > 0 ? (
                    [...activeProject.notes].reverse().map((note) => {
                      const isClient = !note.author_id || note.content.startsWith('[Client') || note.content.startsWith('Discussion Note:');
                      const cleanContent = note.content
                        .replace(/^\[Client Note\] /, '')
                        .replace(/^\[Client Revision\] /, '')
                        .replace(/^Discussion Note: /, '')
                        .replace(/^\[Discussion Note\] /, '');

                      return (
                        <div key={note.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3 hover:bg-white/[0.04] transition-all">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isClient ? 'bg-[#a855f7]/10 text-[#a855f7]' : 'bg-[#e63946]/10 text-[#e63946]'
                          }`}>
                            {note.author?.full_name ? note.author.full_name[0].toUpperCase() : 'C'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <span className="text-xs font-extrabold text-white">
                                {note.author?.full_name || `${data.client.name} (Client)`}
                              </span>
                              <span className="text-[9.5px] text-gray-500 font-semibold">{formatDate(note.created_at)}</span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare size={24} className="text-[#333] mx-auto mb-2" />
                      <p className="text-gray-500 text-xs">No discussion notes yet. Leave a note below to start the conversation!</p>
                    </div>
                  )}
                </div>

                {/* Note post form */}
                <form onSubmit={handleClientNoteSubmit} className="pt-4 border-t border-white/5 flex items-end gap-3">
                  <div className="flex-1">
                    <textarea 
                      className="input-base w-full resize-none h-16 text-[13px] bg-[#0a0a0c]/60 focus:border-[#a855f7]/30"
                      placeholder="Add a new note to this project..."
                      value={clientNoteMessage}
                      onChange={e => setClientNoteMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleClientNoteSubmit(e)
                        }
                      }}
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !clientNoteMessage.trim()}
                    className="bg-[#a855f7] text-white hover:bg-[#b56bf9] font-black h-[44px] px-5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Post Note
                  </button>
                </form>
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
              className="modal-content !max-w-2xl"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-[15px] font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Pencil size={14} className="text-[#a855f7]" /> Edit Project Workspace
                  </h2>
                  <p className="text-[10px] text-gray-500">Configure portal layout, manager credentials, and milestones</p>
                </div>
                <button onClick={() => setShowEditProjectModal(false)} className="text-[#555] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-white/5 mb-5 overflow-x-auto gap-2">
                {[
                  { id: 'basic', label: 'Basic Info' },
                  { id: 'welcome', label: 'Welcome Copy' },
                  { id: 'pm', label: 'PM & Phases' },
                  { id: 'roadmap', label: 'Milestones & Roadmap' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveEditTab(t.id)}
                    className={`pb-2.5 px-3 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 flex-shrink-0 ${
                      activeEditTab === t.id 
                        ? 'border-[#a855f7] text-[#a855f7]' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleEditProjectSubmit} className="space-y-4">
                <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-custom space-y-4">
                  {activeEditTab === 'basic' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Project Name *</label>
                        <input 
                          type="text" 
                          className="input-base" 
                          required 
                          value={editForm.name} 
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Project Status</label>
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
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Progress: {editForm.progress}%</label>
                          <div className="flex items-center gap-3 mt-2">
                            <input 
                              type="range"
                              min={0}
                              max={100}
                              className="flex-1 accent-[#a855f7]"
                              value={editForm.progress} 
                              onChange={e => setEditForm(f => ({ ...f, progress: Number(e.target.value) }))}
                            />
                            <span className="text-xs font-bold text-[#a855f7] w-8 text-right">{editForm.progress}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Description</label>
                        <textarea 
                          className="input-base resize-none h-24" 
                          placeholder="Describe the project scope..."
                          value={editForm.description} 
                          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Project Fee (INR)</label>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            className="input-base" 
                            placeholder="E.g., 50000"
                            value={editForm.fee} 
                            onChange={e => setEditForm(f => ({ ...f, fee: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Advance Paid (INR)</label>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            className="input-base" 
                            placeholder="E.g., 20000"
                            value={editForm.advance_paid} 
                            onChange={e => setEditForm(f => ({ ...f, advance_paid: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Invoice / Asset Link URL</label>
                        <input 
                          type="url" 
                          className="input-base" 
                          placeholder="https://drive.google.com/..."
                          value={editForm.invoice_url} 
                          onChange={e => setEditForm(f => ({ ...f, invoice_url: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'welcome' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Portal Welcome Title</label>
                        <input 
                          type="text" 
                          className="input-base" 
                          placeholder="E.g., Welcome to your project portal!"
                          value={editForm.portal_welcome_title} 
                          onChange={e => setEditForm(f => ({ ...f, portal_welcome_title: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Portal Welcome Message</label>
                        <textarea 
                          className="input-base resize-none h-28" 
                          placeholder="E.g., This is your central hub for everything related to your website redesign..."
                          value={editForm.portal_welcome_message} 
                          onChange={e => setEditForm(f => ({ ...f, portal_welcome_message: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'pm' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Project Manager Name</label>
                          <input 
                            type="text" 
                            className="input-base" 
                            placeholder="E.g., Sarah"
                            value={editForm.portal_pm_name} 
                            onChange={e => setEditForm(f => ({ ...f, portal_pm_name: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Project Manager Email</label>
                          <input 
                            type="email" 
                            className="input-base" 
                            placeholder="E.g., sarah@polymark.com"
                            value={editForm.portal_pm_email} 
                            onChange={e => setEditForm(f => ({ ...f, portal_pm_email: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Current Phase Label</label>
                          <input 
                            type="text" 
                            className="input-base" 
                            placeholder="E.g., Design & Development"
                            value={editForm.portal_current_phase} 
                            onChange={e => setEditForm(f => ({ ...f, portal_current_phase: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Next Phase Label</label>
                          <input 
                            type="text" 
                            className="input-base" 
                            placeholder="E.g., Launch & Handoff"
                            value={editForm.portal_next_phase} 
                            onChange={e => setEditForm(f => ({ ...f, portal_next_phase: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'roadmap' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Quick Start Checklist (separate by Semicolon `;`)</label>
                        <textarea 
                          className="input-base resize-none h-24" 
                          placeholder="Read through the Getting Started guide...;Upload your brand assets...;Book your kickoff call..."
                          value={editForm.portal_quick_start} 
                          onChange={e => setEditForm(f => ({ ...f, portal_quick_start: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Interactive Roadmap (Phase1|Desc|Item1,Item2 - Date;...)</label>
                        <textarea 
                          className="input-base resize-none h-28 text-xs font-mono" 
                          placeholder="Phase 1: Discovery|Aligning on scope|Getting started,Kickoff meeting - 15 Mar;..."
                          value={editForm.portal_roadmap} 
                          onChange={e => setEditForm(f => ({ ...f, portal_roadmap: e.target.value }))}
                        />
                        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                          Format: <code>Phase Title | Phase Subtitle | Milestone1 - Tag1, Milestone2 - Tag2 ; Phase 2 Title | ...</code>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowEditProjectModal(false)} className="btn-ghost text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                    {isSubmitting ? 'Saving...' : 'Save Workspace details'}
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

      {/* Edit Milestone Details Modal */}
      <AnimatePresence>
        {showEditMilestoneModal && selectedMilestone && (
          <div className="modal-overlay" onClick={() => setShowEditMilestoneModal(false)}>
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="space-y-0.5">
                  <h2 className="text-[15px] font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Pencil size={14} className="text-[#a855f7]" /> Edit Field & Assets
                  </h2>
                  <p className="text-[10px] text-gray-500">Add asset links and update field tags for roadmap milestone</p>
                </div>
                <button onClick={() => setShowEditMilestoneModal(false)} className="text-[#555] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditMilestoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Milestone / Field Name *</label>
                  <input 
                    type="text" 
                    className="input-base" 
                    required 
                    value={selectedMilestone.name} 
                    onChange={e => setSelectedMilestone(m => m ? { ...m, name: e.target.value } : null)}
                    placeholder="E.g., Brand guidelines or Invoice & payment"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Status / Progress Tag</label>
                  <input 
                    type="text" 
                    className="input-base" 
                    value={selectedMilestone.tag} 
                    onChange={e => setSelectedMilestone(m => m ? { ...m, tag: e.target.value } : null)}
                    placeholder="E.g., Completed, 1 pending, 2 keys, 15 Mar"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Asset / Deliverable Link URL</label>
                  <input 
                    type="url" 
                    className="input-base" 
                    value={selectedMilestone.assetUrl} 
                    onChange={e => setSelectedMilestone(m => m ? { ...m, assetUrl: e.target.value } : null)}
                    placeholder="E.g., Figma link, Google Drive link, or PDF Invoice URL"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditMilestoneModal(false)} className="btn-ghost text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                    {isSubmitting ? 'Saving...' : 'Save Milestone / Field'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Split-Pane Milestone Details & Discussion Modal */}
      <AnimatePresence>
        {showMilestoneDetailsModal && activeMilestoneDetail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div 
              className="w-full max-w-6xl h-[85vh] bg-[#0A0D14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
            >
              {/* Close Button Mobile/Global */}
              <button 
                onClick={() => setShowMilestoneDetailsModal(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all hover:scale-105"
                title="Close"
              >
                <X size={16} />
              </button>

              {/* Left Column (Sticky Sidebar - Milestone List) - 1/3 width */}
              <div className="w-full md:w-80 border-r border-white/5 bg-[#07090E]/60 flex flex-col h-full flex-shrink-0">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                  <button 
                    onClick={() => setShowMilestoneDetailsModal(false)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#a855f7] hover:text-white transition-all font-black uppercase tracking-widest"
                  >
                    <ChevronDown size={14} className="rotate-90" /> Back to Portal
                  </button>
                </div>
                
                {/* Scrollable list of phases & milestones */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-custom">
                  {parsedPhases.map((phase, pIdx) => (
                    <div key={phase.key} className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 px-2">
                        {phase.phaseNum}: {phase.title}
                      </div>
                      <div className="space-y-1">
                        {phase.items.map((item, iIdx) => {
                          const isActive = activeMilestoneDetail.pIdx === pIdx && activeMilestoneDetail.iIdx === iIdx;
                          return (
                            <button
                              key={iIdx}
                              type="button"
                              onClick={() => setActiveMilestoneDetail({
                                pIdx,
                                iIdx,
                                phaseName: phase.title,
                                name: item.name,
                                tag: item.tag,
                                assetUrl: item.assetUrl || ''
                              })}
                              className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 text-xs ${
                                isActive 
                                  ? 'bg-[#a855f7]/10 border border-[#a855f7]/25 text-white font-extrabold shadow-lg shadow-purple-500/5'
                                  : 'bg-transparent border border-transparent text-gray-400 hover:bg-white/[0.02] hover:text-white'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                isActive ? 'bg-[#a855f7] animate-pulse' : 'bg-gray-600'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate">{item.name}</p>
                                {item.tag && <p className="text-[9px] text-gray-500 mt-0.5">{item.tag}</p>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (Dynamic Content & Discussion Area) - 2/3 width */}
              <div className="flex-1 flex flex-col h-full bg-[#0A0D14]/90 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-custom">
                  
                  {/* Title and breadcrumb */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-black tracking-widest text-[#a855f7] uppercase flex items-center gap-1.5">
                      <span>{activeMilestoneDetail.phaseName}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span>Step {activeMilestoneDetail.iIdx + 1}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{activeMilestoneDetail.name}</h3>
                  </div>

                  {/* Attachment/Resource Launcher widget */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Linked Deliverables & Assets</h4>
                    {activeMilestoneDetail.assetUrl ? (
                      <div className="p-5 rounded-2xl bg-[#11141D] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-300 flex-shrink-0">
                            {activeMilestoneDetail.assetUrl.includes('figma.com') ? (
                              <FigmaIcon />
                            ) : activeMilestoneDetail.assetUrl.includes('drive.google.com') ? (
                              <Folder size={20} className="text-[#BD00FF]" />
                            ) : (
                              <LinkIcon size={20} className="text-[#00F2FE]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-sm font-bold text-white truncate">
                              {activeMilestoneDetail.assetUrl.includes('figma.com') ? 'Figma Prototype Asset' : activeMilestoneDetail.assetUrl.includes('drive.google.com') ? 'Google Drive Shared Folder' : 'External Deliverable Resource'}
                            </h5>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{activeMilestoneDetail.assetUrl}</p>
                          </div>
                        </div>

                        <a 
                          href={activeMilestoneDetail.assetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5 shrink-0"
                        >
                          Open Asset <ExternalLink size={13} />
                        </a>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/5 text-center">
                        <LinkIcon size={24} className="text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 font-bold">No active asset attached to this step yet.</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Use the "Edit Details" pencil button on the roadmap card to attach a Figma, Drive, or external URL!</p>
                      </div>
                    )}
                  </div>

                  {/* Contextual Discussion Notes Stream */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-[#a855f7]" /> Step Discussions & Revisions
                        </h4>
                        <p className="text-[10px] text-gray-500">Provide direct feedback, request changes, or add team updates for this deliverable</p>
                      </div>
                    </div>

                    {/* Milestone notes lists */}
                    <div className="space-y-3">
                      {(() => {
                        const milestoneComments = activeProject.notes 
                          ? activeProject.notes.filter(note => note.content.includes(`[Milestone: ${activeMilestoneDetail.name}]`)) 
                          : [];

                        return milestoneComments.length > 0 ? (
                          milestoneComments.map(note => {
                            const isClient = !note.author_id || note.content.startsWith('[Client') || note.content.includes('(Client)') || note.content.includes('[Client Note]');
                            const cleanContent = note.content.replace(`[Milestone: ${activeMilestoneDetail.name}]`, '').trim();
                            
                            return (
                              <div key={note.id} className="p-4 rounded-2xl bg-[#11141D] border border-white/5 space-y-2 hover:border-white/10 transition-all">
                                <div className="flex justify-between items-center">
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                    isClient 
                                      ? 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/25' 
                                      : 'bg-[#e63946]/10 text-[#e63946] border-[#e63946]/25'
                                  }`}>
                                    {note.author?.full_name || (isClient ? 'Client' : 'Studio Manager')}
                                  </span>
                                  <span className="text-[9px] text-gray-500">{formatDate(note.created_at)}</span>
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">{cleanContent}</p>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-center py-10 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                            <MessageSquare size={24} className="text-gray-600 mx-auto mb-2" />
                            <p className="text-xs text-gray-400 font-bold">No comment history for this step yet.</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Be the first to post a revision request, note, or update below!</p>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                </div>

                {/* Sticky text area form at the bottom */}
                <div className="p-4 bg-[#07090E]/80 border-t border-white/5">
                  <form 
                    onSubmit={async (e) => {
                      await handleMilestoneNoteSubmit(e, activeMilestoneDetail.name)
                    }} 
                    className="flex items-end gap-3"
                  >
                    <div className="flex-1">
                      <textarea 
                        className="input-base w-full resize-none h-14 text-[13px] bg-[#0a0a0c]/60 focus:border-[#a855f7]/30 py-2 px-3"
                        placeholder={`Write feedback or revision notes for ${activeMilestoneDetail.name}...`}
                        value={milestoneNoteMessage}
                        onChange={e => setMilestoneNoteMessage(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            await handleMilestoneNoteSubmit(e, activeMilestoneDetail.name)
                          }
                        }}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !milestoneNoteMessage.trim()}
                      className="bg-[#a855f7] text-white hover:bg-[#b56bf9] font-black h-[44px] px-5 rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                    >
                      Post Note
                    </button>
                  </form>
                </div>

              </div>

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
