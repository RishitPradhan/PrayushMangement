import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatRelativeTime } from '@/lib/utils'
import { Bell, CheckSquare, FolderKanban, CreditCard, MessageSquare, Upload } from 'lucide-react'

const typeIcons = {
  task:     CheckSquare,
  project:  FolderKanban,
  payment:  CreditCard,
  comment:  MessageSquare,
  deadline: Bell,
  file:     Upload,
}

const typeColors = {
  task:     '#f59e0b',
  project:  '#6366f1',
  payment:  '#10b981',
  comment:  '#8b5cf6',
  deadline: '#e63946',
  file:     '#10b981',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  const all = notifications ?? []
  const unread = all.filter(n => !n.read).length

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
      />

      {all.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell size={36} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#444] text-[14px]">No notifications yet</p>
          <p className="text-[#333] text-[12px] mt-1">You&apos;ll be notified about deadlines, assignments, and updates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {all.map(notif => {
            const type = (notif.type ?? 'project') as keyof typeof typeIcons
            const Icon = typeIcons[type] ?? Bell
            const color = typeColors[type] ?? '#666'

            return (
              <div
                key={notif.id}
                className={`glass-card p-4 flex items-start gap-3 ${!notif.read ? 'border-[rgba(230,57,70,0.15)]' : ''}`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: color + '15' }}
                >
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3 className={`text-[13px] font-medium ${notif.read ? 'text-[#888]' : 'text-white'}`}>
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#e63946] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] text-[#555]">{notif.message}</p>
                  <p className="text-[11px] text-[#444] mt-1">{formatRelativeTime(notif.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
