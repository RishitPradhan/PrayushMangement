import { cn } from '@/lib/utils'

type StatusType = 'planning' | 'in-progress' | 'review' | 'completed' | 'todo' | 'overdue' |
                  'low' | 'medium' | 'high' | 'urgent' |
                  'paid' | 'partial' | 'pending' | 'active' | 'inactive' | 'prospect' | 'closed'

const statusMap: Record<StatusType, { label: string; className: string }> = {
  planning:    { label: 'Planning',     className: 'badge badge-planning' },
  'in-progress': { label: 'In Progress', className: 'badge badge-progress' },
  review:      { label: 'Review',       className: 'badge badge-review' },
  completed:   { label: 'Completed',    className: 'badge badge-completed' },
  todo:        { label: 'To Do',        className: 'badge badge-todo' },
  overdue:     { label: 'Overdue',      className: 'badge badge-overdue' },
  low:         { label: 'Low',          className: 'badge badge-low' },
  medium:      { label: 'Medium',       className: 'badge badge-medium' },
  high:        { label: 'High',         className: 'badge badge-high' },
  urgent:      { label: 'Urgent',       className: 'badge badge-urgent' },
  paid:        { label: 'Paid',         className: 'badge badge-paid' },
  partial:     { label: 'Partial',      className: 'badge badge-partial' },
  pending:     { label: 'Pending',      className: 'badge badge-pending' },
  active:      { label: 'Active',       className: 'badge badge-completed' },
  inactive:    { label: 'Inactive',     className: 'badge badge-todo' },
  prospect:    { label: 'Prospect',     className: 'badge badge-planning' },
  closed:      { label: 'Closed',       className: 'badge badge-todo' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status as StatusType] ?? { label: status, className: 'badge badge-todo' }
  return <span className={cn(config.className, className)}>{config.label}</span>
}
