'use client'

import { ActivityLog } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { FolderKanban, CheckSquare, Upload, MessageSquare, CreditCard, User } from 'lucide-react'

const entityIcons = {
  project: FolderKanban,
  task: CheckSquare,
  file: Upload,
  comment: MessageSquare,
  payment: CreditCard,
  client: User,
}

const entityColors = {
  project: '#a855f7', // purple
  task: '#eab308', // yellow
  file: '#22c55e', // green
  comment: '#c084fc', // soft purple
  payment: '#22c55e', // green
  client: '#ef4444', // red
}

interface ActivityFeedProps {
  activities: ActivityLog[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-[14px]">
        No recent activity.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => {
        const Icon = entityIcons[activity.entity_type] ?? CheckSquare
        const color = entityColors[activity.entity_type] ?? '#666'
        return (
          <div
            key={activity.id}
            className="flex items-start gap-5 p-5 rounded-[16px] bg-gray-950/20 hover:bg-gray-950/40 transition-all group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.02)]"
              style={{ background: color + '15' }}
            >
              <Icon size={14} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {activity.user && (
                  <span className="text-[13px] font-bold text-white">
                    {activity.user.full_name}
                  </span>
                )}
                <span className="text-[13px] text-gray-400 font-medium">{activity.action}</span>
              </div>
              <span className="text-[11px] text-gray-500 font-semibold uppercase">
                {formatRelativeTime(activity.created_at)}
              </span>
            </div>
            {activity.user && (
              <Avatar name={activity.user.full_name} avatarUrl={activity.user.avatar_url} size="xs" className="flex-shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}
