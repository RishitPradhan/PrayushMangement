'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Payment, Expense, Profile } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  Plus, X, Trash2, Users, Building, ArrowUpRight, ArrowDownRight, Edit2, Globe, TrendingUp 
} from 'lucide-react'

interface FinanceClientProps {
  initialPayments: (Payment & { project?: { name: string; client?: { name: string } } })[]
  initialExpenses: (Expense & { user?: Profile; project?: { name: string; client?: { name: string } } })[]
  profiles: Profile[]
  clients: { id: string; name: string; email?: string; company?: string }[]
  projects: { id: string; name: string; status: string }[]
}

type TabType = 'all' | 'revenue' | 'expenses' | 'business' | 'team' | 'client'

export function FinanceClient({ initialPayments, initialExpenses, profiles, clients, projects }: FinanceClientProps) {
  const [payments, setPayments] = useState(initialPayments)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingRevenue, setEditingRevenue] = useState<Expense | null>(null)
  const [expenseForm, setExpenseForm] = useState({
    category: 'business' as 'business' | 'team' | 'client' | 'revenue',
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    user_id: '',
    client_id: '',
    project_id: '',
    description: ''
  })

  // Calculate metrics
  const totalRevenue = expenses
    .filter(e => e.category === 'revenue')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  
  const totalBusinessSpending = expenses
    .filter(e => e.category === 'business')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalTeamSpending = expenses
    .filter(e => e.category === 'team')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalClientSpending = expenses
    .filter(e => e.category === 'client')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalExpenditure = totalBusinessSpending + totalTeamSpending + totalClientSpending
  const netProfit = totalRevenue - totalExpenditure

  // Combine all transactions chronologically for the Unified Ledger from the expenses table
  const ledgerItems = expenses.map(e => {
    const isRevenue = e.category === 'revenue'
    return {
      id: `trans-${e.id}`,
      type: isRevenue ? ('revenue' as const) : ('expense' as const),
      category: e.category, // 'business' | 'team' | 'client' | 'revenue'
      title: isRevenue ? (e.title || `Revenue Payment`) : e.title,
      subtitle: isRevenue 
        ? `Project: ${e.project?.name || '—'} (Client: ${e.project?.client?.name || '—'})`
        : e.category === 'team' 
          ? `Team Member: ${e.user?.full_name || e.recipient || '—'}` 
          : e.category === 'client' 
            ? `Client: ${e.recipient || '—'}`
            : `Vendor: ${e.recipient || '—'}`,
      amount: isRevenue ? Number(e.amount) : -Number(e.amount),
      date: e.date,
      recipient: isRevenue ? 'Prayush Studios' : (e.recipient || '—'),
      details: e.description || 'No description provided.',
      raw: e
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Filter items based on active tab
  const filteredLedger = ledgerItems.filter(item => {
    if (activeTab === 'all') return true
    if (activeTab === 'revenue') return item.type === 'revenue'
    if (activeTab === 'expenses') return item.type === 'expense'
    if (activeTab === 'business') return item.type === 'expense' && item.category === 'business'
    if (activeTab === 'team') return item.type === 'expense' && item.category === 'team'
    if (activeTab === 'client') return item.type === 'expense' && item.category === 'client'
    return true
  })

  // Synchronize aggregate project payment status (total contracts & paid balance) inside the payments table
  const syncProjectPayment = async (projectId: string) => {
    const supabase = createClient()
    
    // 1. Sum up all revenue entries for this project
    const { data: revenueExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('project_id', projectId)
      .eq('category', 'revenue')
    
    const totalPaid = (revenueExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

    // 2. Fetch or update payments table row to keep projects & portals correct
    const { data: existing } = await supabase
      .from('payments')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (existing) {
      const newStatus = totalPaid >= (existing.total_amount ?? 0) ? 'paid' : 'partial'
      await supabase
        .from('payments')
        .update({
          advance_paid: totalPaid,
          status: newStatus
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('payments')
        .insert([{
          project_id: projectId,
          total_amount: totalPaid,
          advance_paid: totalPaid,
          status: 'paid'
        }])
    }

    // Refresh payments state
    const { data: refetchedPayments } = await supabase
      .from('payments')
      .select('*, project:projects(id, name, client:clients(name))')
    if (refetchedPayments) setPayments(refetchedPayments)
  }

  // Open creation modal
  const openCreateModal = () => {
    setEditingExpense(null)
    setEditingRevenue(null)
    setExpenseForm({
      category: 'business',
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      recipient: '',
      user_id: '',
      client_id: '',
      project_id: '',
      description: ''
    })
    setShowExpenseModal(true)
  }

  // Open edit modal for expenses
  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense)
    setEditingRevenue(null)
    
    // Check if recipient matches one of our clients to set client_id
    const matchedClient = clients.find(c => c.name === expense.recipient)

    setExpenseForm({
      category: expense.category,
      title: expense.title,
      amount: expense.amount.toString(),
      date: expense.date,
      recipient: expense.recipient || '',
      user_id: expense.user_id || '',
      client_id: matchedClient?.id || '',
      project_id: '',
      description: expense.description || ''
    })
    setShowExpenseModal(true)
  }

  // Open edit modal for payments/revenue
  const openEditRevenueModal = (rev: Expense) => {
    setEditingExpense(null)
    setEditingRevenue(rev)
    
    setExpenseForm({
      category: 'revenue',
      title: rev.title || '',
      amount: rev.amount.toString(),
      date: rev.date,
      recipient: 'Prayush Studios',
      user_id: '',
      client_id: '',
      project_id: rev.project_id || '',
      description: rev.description || ''
    })
    setShowExpenseModal(true)
  }

  // Handle delete expenditure (business / team / client)
  const handleDeleteExpense = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete expenditure "${name}"?`)) return

    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete expense: ' + error.message)
    } else {
      toast.success('Expenditure deleted successfully')
      setExpenses(prev => prev.filter(e => e.id !== id))
    }
  }

  // Handle delete revenue entry
  const handleDeleteRevenue = async (id: string, name: string, projectId: string | undefined) => {
    if (!window.confirm(`Are you sure you want to delete revenue entry "${name}"?`)) return

    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete revenue entry: ' + error.message)
    } else {
      toast.success('Revenue entry deleted successfully')
      setExpenses(prev => prev.filter(e => e.id !== id))
      if (projectId) {
        await syncProjectPayment(projectId)
      }
    }
  }

  // Handle Form submit
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const supabase = createClient()

    if (expenseForm.category === 'revenue') {
      if (!expenseForm.project_id || !expenseForm.amount) {
        setIsSubmitting(false)
        return
      }

      const amt = parseFloat(expenseForm.amount)
      const projectName = projects.find(p => p.id === expenseForm.project_id)?.name || 'Project'
      
      const payload = {
        category: 'revenue' as const,
        title: expenseForm.title || `Payment for ${projectName}`,
        amount: amt,
        date: expenseForm.date,
        recipient: 'Prayush Studios',
        project_id: expenseForm.project_id || null,
        description: expenseForm.description
      }

      if (editingRevenue) {
        // Update revenue row
        const { data: updated, error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingRevenue.id)
          .select('*, user:profiles(*), project:projects(id, name, client:clients(name))')
          .single()

        if (error) {
          toast.error('Failed to update revenue entry: ' + error.message)
        } else {
          toast.success('Revenue entry updated successfully!')
          setExpenses(prev => prev.map(e => e.id === editingRevenue.id ? updated : e))
          setShowExpenseModal(false)
          await syncProjectPayment(expenseForm.project_id)
        }
      } else {
        // Insert new independent revenue row (separate entry)
        const { data: inserted, error } = await supabase
          .from('expenses')
          .insert([payload])
          .select('*, user:profiles(*), project:projects(id, name, client:clients(name))')
          .single()

        if (error) {
          toast.error('Failed to record revenue entry: ' + error.message)
        } else {
          toast.success('Revenue entry recorded successfully!')
          setExpenses(prev => [inserted, ...prev])
          setShowExpenseModal(false)
          await syncProjectPayment(expenseForm.project_id)
        }
      }

      setIsSubmitting(false)
      return
    }

    // Handlers for expense formats (business / team / client)
    if (!expenseForm.title || !expenseForm.amount) {
      setIsSubmitting(false)
      return
    }

    let finalRecipient = expenseForm.recipient
    if (expenseForm.category === 'team') {
      finalRecipient = profiles.find(p => p.id === expenseForm.user_id)?.full_name || expenseForm.recipient
    } else if (expenseForm.category === 'client') {
      finalRecipient = clients.find(c => c.id === expenseForm.client_id)?.name || expenseForm.recipient
    }

    const payload = {
      category: expenseForm.category,
      title: expenseForm.title,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      recipient: finalRecipient,
      user_id: expenseForm.category === 'team' ? (expenseForm.user_id || null) : null,
      description: expenseForm.description
    }

    if (editingExpense) {
      // Update
      const { data: updated, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', editingExpense.id)
        .select('*, user:profiles(*), project:projects(id, name, client:clients(name))')
        .single()

      if (error) {
        toast.error('Failed to update expense: ' + error.message)
      } else {
        toast.success('Expenditure updated successfully!')
        setExpenses(prev => prev.map(e => e.id === editingExpense.id ? updated : e))
        setShowExpenseModal(false)
      }
    } else {
      // Insert
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select('*, user:profiles(*), project:projects(id, name, client:clients(name))')
        .single()

      if (error) {
        toast.error('Failed to create expense: ' + error.message)
      } else {
        toast.success('Expenditure recorded successfully!')
        setExpenses(prev => [inserted, ...prev])
        setShowExpenseModal(false)
      }
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-8">
      
      {/* 1. Main Page Content (Animated separately to isolate modals from layout containment) */}
      <div className="animate-fade-in space-y-8">
        
        {/* Simple Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Finance & Ledger
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">Track company profit margins, overheads, and payouts</p>
          </div>
          <button 
            onClick={openCreateModal}
            className="btn-primary py-2 px-3.5 text-xs font-bold"
          >
            Record Financial Entry
          </button>
        </div>

        {/* Minimal Financial Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Net Profit Card */}
          <div className="glass-card p-5 border border-white/5 bg-[#0a0a0c]/40 hover:border-white/10 transition-colors">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Net Profit</span>
            <div className={`text-xl sm:text-2xl font-black mt-2 tracking-tight ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {formatCurrency(netProfit)}
            </div>
            <div className="text-[9px] text-[#444] mt-1 font-semibold uppercase tracking-wider">Revenue minus expenses</div>
          </div>

          {/* Total Revenue Card */}
          <div className="glass-card p-5 border border-white/5 bg-[#0a0a0c]/40 hover:border-white/10 transition-colors">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Revenues</span>
            <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-white">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-[9px] text-emerald-500/50 mt-1 font-semibold uppercase tracking-wider">Collected payments</div>
          </div>

          {/* Business Expenses Card */}
          <div className="glass-card p-5 border border-white/5 bg-[#0a0a0c]/40 hover:border-white/10 transition-colors">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business Overheads</span>
            <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-white">
              {formatCurrency(totalBusinessSpending)}
            </div>
            <div className="text-[9px] text-blue-500/50 mt-1 font-semibold uppercase tracking-wider">Software, hosting & tools</div>
          </div>

          {/* Team / Client Salaries Card */}
          <div className="glass-card p-5 border border-white/5 bg-[#0a0a0c]/40 hover:border-white/10 transition-colors">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payouts (Team & Client)</span>
            <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-white">
              {formatCurrency(totalTeamSpending + totalClientSpending)}
            </div>
            <div className="text-[9px] text-rose-500/50 mt-1 font-semibold uppercase tracking-wider">Contractors & refunds</div>
          </div>

        </div>

        {/* Minimal Ledger List */}
        <div className="space-y-4">
          
          {/* Header tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Entries' },
                { id: 'revenue', label: 'Incoming Revenue' },
                { id: 'expenses', label: 'All Expenses' },
                { id: 'business', label: 'Overheads' },
                { id: 'team', label: 'Team Payouts' },
                { id: 'client', label: 'Client Payouts' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-black font-extrabold shadow-sm' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="text-[11px] text-gray-500 uppercase tracking-widest font-black">
              {filteredLedger.length} items logged
            </div>
          </div>

          {/* Clean Ledger table */}
          <div className="glass-card p-0 overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Entity</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Recipient</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-[#444] text-xs font-semibold">
                        No financial records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((item) => {
                      const isRevenue = item.type === 'revenue'
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.01]">
                          
                          {/* Title */}
                          <td>
                            <div className="font-bold text-white text-[13px]">{item.title}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{item.details}</div>
                          </td>

                          {/* Entity */}
                          <td className="text-xs text-gray-400">
                            {item.subtitle}
                          </td>

                          {/* Type */}
                          <td>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              isRevenue 
                                ? 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5' 
                                : item.category === 'team'
                                  ? 'text-rose-400 border-rose-500/10 bg-rose-500/5'
                                  : item.category === 'client'
                                    ? 'text-amber-400 border-amber-500/10 bg-amber-500/5'
                                    : 'text-blue-400 border-blue-500/10 bg-blue-500/5'
                            }`}>
                              {isRevenue ? 'Incoming' : item.category === 'client' ? 'Client Payout' : item.category}
                            </span>
                          </td>

                          {/* Amount */}
                          <td>
                            <span className={`font-extrabold text-[13px] ${isRevenue ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isRevenue ? '+' : ''}{formatCurrency(item.amount)}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="text-gray-500 font-semibold text-xs">
                            {formatDate(item.date)}
                          </td>

                          {/* Recipient */}
                          <td className="text-gray-400 text-xs">
                            {item.recipient}
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  if (isRevenue) {
                                    openEditRevenueModal(item.raw as Expense)
                                  } else {
                                    openEditModal(item.raw as Expense)
                                  }
                                }}
                                className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (isRevenue) {
                                    handleDeleteRevenue((item.raw as Expense).id, item.title, (item.raw as Expense).project_id)
                                  } else {
                                    handleDeleteExpense((item.raw as Expense).id, item.title)
                                  }
                                }}
                                className="p-1 text-gray-500 hover:text-rose-400 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* 2. Modals outside the animated container entirely (Prevents coordinate translation/clipping) */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
            <motion.div 
              className="modal-content !max-w-md"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
            >
              
              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">
                  {editingExpense || editingRevenue ? 'Modify Entry' : 'Record Financial Entry'}
                </h2>
                <button onClick={() => setShowExpenseModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                
                {/* Category toggles */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Category *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!!editingRevenue || !!editingExpense}
                      onClick={() => setExpenseForm(f => ({ ...f, category: 'business' }))}
                      className={`py-2 px-1 text-center rounded-lg text-[11px] font-semibold border transition-all ${
                        expenseForm.category === 'business'
                          ? 'border-white bg-white/5 text-white'
                          : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                      } disabled:opacity-50`}
                    >
                      Business Overhead
                    </button>
                    <button
                      type="button"
                      disabled={!!editingRevenue || !!editingExpense}
                      onClick={() => setExpenseForm(f => ({ ...f, category: 'team' }))}
                      className={`py-2 px-1 text-center rounded-lg text-[11px] font-semibold border transition-all ${
                        expenseForm.category === 'team'
                          ? 'border-white bg-white/5 text-white'
                          : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                      } disabled:opacity-50`}
                    >
                      Team Payout
                    </button>
                    <button
                      type="button"
                      disabled={!!editingRevenue || !!editingExpense}
                      onClick={() => setExpenseForm(f => ({ ...f, category: 'client' }))}
                      className={`py-2 px-1 text-center rounded-lg text-[11px] font-semibold border transition-all ${
                        expenseForm.category === 'client'
                          ? 'border-white bg-white/5 text-white'
                          : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                      } disabled:opacity-50`}
                    >
                      Client Refund
                    </button>
                    <button
                      type="button"
                      disabled={!!editingRevenue || !!editingExpense}
                      onClick={() => setExpenseForm(f => ({ ...f, category: 'revenue' }))}
                      className={`py-2 px-1 text-center rounded-lg text-[11px] font-semibold border border-dashed transition-all ${
                        expenseForm.category === 'revenue'
                          ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : 'border-emerald-500/20 text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/5'
                      } disabled:opacity-50`}
                    >
                      + Incoming Revenue
                    </button>
                  </div>
                </div>

                {/* Form inputs depending on whether it is Revenue or Expense */}
                {expenseForm.category === 'revenue' ? (
                  <>
                    {/* Project Selector for Revenue */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Select Project *</label>
                      <select
                        className="input-base text-sm cursor-pointer border-emerald-500/20 focus:border-emerald-500"
                        required
                        disabled={!!editingRevenue}
                        value={expenseForm.project_id}
                        onChange={e => setExpenseForm(f => ({ ...f, project_id: e.target.value }))}
                      >
                        <option value="">-- Choose Target Project --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                        ))}
                      </select>
                    </div>

                    {/* Revenue Transaction Title */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Payment Label / Milestone *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Booking Advance, Phase 1 Completion..."
                        className="input-base border-emerald-500/20 focus:border-emerald-500"
                        value={expenseForm.title}
                        onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>

                    {/* Revenue Amount and Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Amount Received (INR) *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.01" 
                          min="0.01"
                          placeholder="0.00"
                          className="input-base border-emerald-500/20 focus:border-emerald-500"
                          value={expenseForm.amount}
                          onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Payment Date *</label>
                        <input 
                          type="date" 
                          required 
                          className="input-base text-[13px]"
                          value={expenseForm.date}
                          onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Revenue description / notes */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Payment Notes</label>
                      <textarea 
                        rows={2} 
                        placeholder="e.g. Wire transfer reference, client review comments..."
                        className="input-base resize-none"
                        value={expenseForm.description}
                        onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Expense Title */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Title *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Adobe Creative Cloud, Contractor Payout"
                        className="input-base"
                        value={expenseForm.title}
                        onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>

                    {/* Amount and Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Amount (INR) *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.01" 
                          min="0.01"
                          placeholder="0.00"
                          className="input-base"
                          value={expenseForm.amount}
                          onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Date *</label>
                        <input 
                          type="date" 
                          required 
                          className="input-base text-[13px]"
                          value={expenseForm.date}
                          onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Dynamic fields */}
                    {expenseForm.category === 'team' ? (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Team Profile *</label>
                        <select
                          className="input-base text-sm cursor-pointer"
                          required
                          value={expenseForm.user_id}
                          onChange={e => setExpenseForm(f => ({ ...f, user_id: e.target.value }))}
                        >
                          <option value="">-- Choose Member Profile --</option>
                          {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.full_name}</option>
                          ))}
                        </select>
                      </div>
                    ) : expenseForm.category === 'client' ? (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Select Client *</label>
                        <select
                          className="input-base text-sm cursor-pointer"
                          required
                          value={expenseForm.client_id}
                          onChange={e => setExpenseForm(f => ({ ...f, client_id: e.target.value }))}
                        >
                          <option value="">-- Choose Client Profile --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Vendor / Recipient</label>
                        <input 
                          type="text" 
                          placeholder="e.g. AWS, Office Rental Co."
                          className="input-base"
                          value={expenseForm.recipient}
                          onChange={e => setExpenseForm(f => ({ ...f, recipient: e.target.value }))}
                        />
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Description</label>
                      <textarea 
                        rows={2} 
                        placeholder="Short transaction description..."
                        className="input-base resize-none"
                        value={expenseForm.description}
                        onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowExpenseModal(false)} 
                    className="btn-ghost py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="btn-primary py-2 px-3.5 text-xs font-bold"
                  >
                    {isSubmitting ? 'Recording...' : (editingExpense || editingRevenue) ? 'Save' : 'Record'}
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
