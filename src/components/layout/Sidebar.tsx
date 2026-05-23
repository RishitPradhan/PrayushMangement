'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, CreditCard,
  FileText, Bell, Globe, LogOut, ChevronLeft, ChevronRight, Zap,
  Building2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects',      icon: FolderKanban,    label: 'Projects' },
  { href: '/tasks',         icon: CheckSquare,     label: 'Tasks' },
  { href: '/clients',       icon: Building2,       label: 'Clients' },
  { href: '/team',          icon: Users,           label: 'Team' },
  { href: '/payments',      icon: CreditCard,      label: 'Payments' },
  { href: '/files',         icon: FileText,        label: 'Files' },
  { href: '/notifications', icon: Bell,            label: 'Notifications' },
  { href: '/portal',        icon: Globe,           label: 'Client Portal' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="h-full flex flex-col bg-[#000000] flex-shrink-0 overflow-hidden z-40 relative"
    >
      {/* Logo */}
      <div className="flex items-center gap-4 px-6 py-8">
        <div className="w-10 h-10 rounded-2xl bg-[#a855f7] flex items-center justify-center flex-shrink-0 shadow-[0_0_24px_rgba(168,85,247,0.4)]">
          <Zap size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-[16px] font-bold text-white tracking-tight truncate">Prayush Studios</span>
              <span className="text-[11px] text-gray-400 font-bold tracking-widest uppercase truncate mt-0.5">Agency OS</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'sidebar-item',
                isActive && 'active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={17} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 space-y-1 border-t border-[rgba(255,255,255,0.04)] pt-4">
        <button
          onClick={handleSignOut}
          className={cn(
            'sidebar-item w-full text-left text-gray-400 hover:text-white',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={17} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'sidebar-item w-full text-left text-gray-400 hover:text-white',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
