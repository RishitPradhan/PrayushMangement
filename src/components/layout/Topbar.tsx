import { Bell, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/shared/Avatar'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'Task Board',
  '/clients': 'Clients',
  '/team': 'Team',
  '/payments': 'Payments',
  '/files': 'Files & Links',
  '/notifications': 'Notifications',
  '/portal': 'Client Portal',
}

interface TopbarProps {
  userProfile?: { full_name: string; avatar_url?: string | null }
  onMenuToggle?: () => void
  hasUnread?: boolean
}

export function Topbar({ userProfile, onMenuToggle, hasUnread }: TopbarProps) {
  const pathname = usePathname()
  const title = Object.entries(pageTitles).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] ?? 'Dashboard'

  return (
    <header className="h-20 flex items-center justify-between px-4 sm:px-8 lg:px-12 flex-shrink-0 border-b border-[rgba(255,255,255,0.03)]">
      {/* Left: Page title + Menu button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors lg:hidden mr-1"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className="text-[16px] sm:text-[18px] font-bold text-white tracking-tight">{title}</h2>
        <span className="hidden sm:block text-gray-600 text-[13px]">/ Prayush Studios</span>
      </div>

      {/* Right: Notifications + Avatar */}
      <div className="flex items-center gap-3 sm:gap-5">

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-[#121216] border border-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.08)] transition-all group"
        >
          <Bell size={15} className="text-gray-400 group-hover:text-white transition-colors" />
          {hasUnread && (
            <span className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 w-1.5 h-1.5 rounded-full bg-[#eab308] ring-2 ring-[#121216]" />
          )}
        </Link>

        {/* Avatar */}
        <div className="pl-1 sm:pl-2">
          <Avatar
            name={userProfile?.full_name ?? 'User'}
            avatarUrl={userProfile?.avatar_url}
            size="sm"
          />
        </div>
      </div>
    </header>
  )
}
