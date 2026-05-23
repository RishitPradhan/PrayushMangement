'use client'

import { useState } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { Bell, CheckSquare, FolderKanban, CreditCard, MessageSquare, Upload, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  type: string
  created_at: string
}

interface NotificationsClientProps {
  initialNotifications: Notification[]
}

const typeIcons: Record<string, any> = {
  task:     CheckSquare,
  project:  FolderKanban,
  payment:  CreditCard,
  comment:  MessageSquare,
  deadline: Bell,
  file:     Upload,
  note:     MessageSquare,
  client:   Users,
}

const typeColors: Record<string, string> = {
  task:     '#f59e0b',
  project:  '#6366f1',
  payment:  '#10b981',
  comment:  '#8b5cf6',
  deadline: '#e63946',
  file:     '#10b981',
  note:     '#e63946',
  client:   '#3b82f6',
}

const getRedirectUrl = (type: string) => {
  switch(type) {
    case 'task': return '/tasks'
    case 'project': return '/projects'
    case 'client': return '/clients'
    case 'file': return '/files'
    case 'note': return '/tasks'
    default: return '/notifications'
  }
}

export function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const router = useRouter()

  const handleNotifClick = async (notif: Notification) => {
    const supabase = createClient()
    if (!notif.read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    }
    router.push(getRedirectUrl(notif.type))
  }

  const handleDeleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
    const supabase = createClient()
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete notification')
    } else {
      toast.success('Notification deleted')
    }
  }

  const handleMarkAllRead = async () => {
    const supabase = createClient()
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    toast.success('All marked as read')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-black text-white tracking-tight leading-none mb-2 uppercase">Notifications</h1>
          <p className="text-[13px] text-gray-400 font-medium">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-ghost text-[12px] py-1.5 px-3 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-red-500/20"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-12 text-center border border-[rgba(255,255,255,0.03)] bg-gray-950/20 rounded-2xl">
          <Bell size={36} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#444] text-[14px] font-bold">No notifications yet</p>
          <p className="text-[#333] text-[12px] mt-1">You&apos;ll be notified about deadlines, assignments, and updates</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notifications.map(notif => {
              const type = (notif.type ?? 'project')
              const Icon = typeIcons[type] ?? Bell
              const color = typeColors[type] ?? '#666'

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleNotifClick(notif)}
                  className={`glass-card p-4 flex items-start gap-4 cursor-pointer hover:bg-gray-950/40 hover:border-red-500/20 transition-all group rounded-xl border border-[rgba(255,255,255,0.03)] ${!notif.read ? 'bg-gray-950/20 border-[rgba(230,57,70,0.1)] shadow-inner' : 'bg-transparent'}`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: color + '15' }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`text-[13.5px] font-bold tracking-tight ${notif.read ? 'text-gray-400 font-medium' : 'text-white'}`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e63946] flex-shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[12px] text-gray-300 leading-relaxed font-medium">{notif.message}</p>
                    <p className="text-[11px] text-gray-500 mt-1.5 font-semibold">{formatRelativeTime(notif.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNotif(e, notif.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
