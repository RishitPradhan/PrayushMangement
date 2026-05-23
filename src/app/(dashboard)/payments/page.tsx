import { createClient, getCurrentUserProfile } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'

import { redirect } from 'next/navigation'

export default async function PaymentsPage() {
  const profile = await getCurrentUserProfile()
  if (profile?.role !== 'admin') redirect('/')

  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('*, project:projects(id, name, client:clients(name))')
    .order('created_at', { ascending: false })

  const all = payments ?? []
  const totalRevenue = all.reduce((s, p) => s + (p.advance_paid ?? 0), 0)
  const totalPending = all.reduce((s, p) => s + (p.balance ?? 0), 0)
  const totalContract = all.reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const overdueCount = all.filter(p => p.status === 'overdue').length

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <PageHeader title="Payments" subtitle="Track all project financials" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Contract Value', value: formatCurrency(totalContract), icon: DollarSign, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { label: 'Received', value: formatCurrency(totalRevenue), icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Pending Balance', value: formatCurrency(totalPending), icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Overdue Invoices', value: overdueCount, icon: TrendingDown, color: '#e63946', bg: 'rgba(230,57,70,0.1)' },
        ].map(card => (
          <div key={card.label} className="glass-card p-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: card.bg }}>
              <card.icon size={16} style={{ color: card.color }} />
            </div>
            <div className="text-xl font-bold text-white mb-0.5">{card.value}</div>
            <div className="text-[12px] text-[#555]">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="p-5 border-b border-[rgba(255,255,255,0.05)]">
          <h2 className="text-[13px] font-semibold text-white">All Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Total Value</th>
                <th>Received</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {all.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#444] text-[13px]">
                    No payment records yet
                  </td>
                </tr>
              ) : (
                all.map(payment => (
                  <tr key={payment.id}>
                    <td>
                      <Link href={`/projects/${payment.project?.id}`} className="text-white hover:text-[#e63946] transition-colors">
                        {payment.project?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="text-[#666]">{payment.project?.client?.name ?? '—'}</td>
                    <td className="font-medium text-white">{formatCurrency(payment.total_amount)}</td>
                    <td className="text-[#10b981]">{formatCurrency(payment.advance_paid)}</td>
                    <td className={payment.balance > 0 ? 'text-[#f59e0b] font-medium' : 'text-[#10b981]'}>
                      {formatCurrency(payment.balance)}
                    </td>
                    <td><StatusBadge status={payment.status} /></td>
                    <td className="text-[#555]">{formatDate(payment.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
