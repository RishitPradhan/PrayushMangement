import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Building2, FolderKanban, CreditCard } from 'lucide-react'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: client } = await supabase
    .from('clients')
    .select('*, projects(*, payment:payments(total_amount, advance_paid, balance, status))')
    .eq('id', id)
    .single()

  if (!client) notFound()

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <Link href="/clients" className="flex items-center gap-1.5 text-[12px] text-[#555] hover:text-white transition-colors w-fit">
        <ArrowLeft size={13} /> Back to Clients
      </Link>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <Avatar name={client.name} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-[13px] text-[#555] flex items-center gap-1.5 mb-3">
              <Building2 size={12} /> {client.company || 'No company'}
            </p>
            <div className="flex flex-wrap gap-4 text-[12px] text-[#666]">
              <span className="flex items-center gap-1.5"><Mail size={12} /> {client.email}</span>
              {client.phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {client.phone}</span>}
            </div>
          </div>
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[12px] text-[#555] leading-relaxed">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FolderKanban size={14} className="text-[#e63946]" />
          <h2 className="text-[13px] font-semibold text-white">Projects ({(client.projects ?? []).length})</h2>
        </div>
        {(client.projects ?? []).length === 0 ? (
          <p className="text-[#444] text-[12px] text-center py-6">No projects for this client</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Payment</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {(client.projects ?? []).map((project: {
                id: string; name: string; status: string; priority: string;
                due_date?: string; payment?: { total_amount: number; balance: number; status: string }
              }) => (
                <tr key={project.id}>
                  <td>
                    <Link href={`/projects/${project.id}`} className="text-white hover:text-[#e63946] transition-colors">
                      {project.name}
                    </Link>
                  </td>
                  <td><StatusBadge status={project.status} /></td>
                  <td><StatusBadge status={project.priority} /></td>
                  <td>{formatDate(project.due_date)}</td>
                  <td>{project.payment ? formatCurrency(project.payment.total_amount) : '—'}</td>
                  <td>
                    {project.payment ? (
                      <span className={project.payment.balance > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'}>
                        {formatCurrency(project.payment.balance)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
