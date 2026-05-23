'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, CreditCard,
  FileText, Bell, Globe, LogOut, ChevronLeft, ChevronRight, Zap,
  Building2, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',              icon: LayoutDashboard, label: 'Dashboard',   roles: ['admin', 'member'] },
  { href: '/projects',      icon: FolderKanban,    label: 'Projects',    roles: ['admin', 'member'] },
  { href: '/tasks',         icon: CheckSquare,     label: 'Tasks',       roles: ['admin', 'member'] },
  { href: '/clients',       icon: Building2,       label: 'Clients',     roles: ['admin', 'member'] },
  { href: '/team',          icon: Users,           label: 'Team',        roles: ['admin'] },
  { href: '/payments',      icon: CreditCard,      label: 'Payments',    roles: ['admin'] },
  { href: '/files',         icon: FileText,        label: 'Files',       roles: ['admin', 'member'] },
  { href: '/notifications', icon: Bell,            label: 'Notifications', roles: ['admin', 'member'] },
  { href: '/portal',        icon: Globe,           label: 'Client Portal', roles: ['admin', 'member'] },
]

interface SidebarProps {
  userRole?: string
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

export function Sidebar({ userRole = 'member', isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? 260 : (collapsed ? 80 : 260) }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 h-full flex flex-col bg-[#000000] flex-shrink-0 overflow-hidden transition-transform duration-300 ease-in-out lg:transition-none lg:translate-x-0 border-r border-[rgba(255,255,255,0.03)]",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#a855f7] flex items-center justify-center flex-shrink-0 shadow-[0_0_24px_rgba(168,85,247,0.4)]">
            <Zap size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {(!collapsed || isMobile) && (
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
        {isMobile && setIsOpen && (
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.roles.includes(userRole)).map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => isMobile && setIsOpen && setIsOpen(false)}
              className={cn(
                'sidebar-item',
                isActive && 'active',
                (collapsed && !isMobile) && 'justify-center px-2'
              )}
              title={(collapsed && !isMobile) ? label : undefined}
            >
              <Icon size={17} className="flex-shrink-0" />
              <AnimatePresence>
                {(!collapsed || isMobile) && (
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
            (collapsed && !isMobile) && 'justify-center px-2'
          )}
          title={(collapsed && !isMobile) ? 'Sign Out' : undefined}
        >
          <LogOut size={17} />
          <AnimatePresence>
            {(!collapsed || isMobile) && (
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
        {!isMobile && (
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
        )}
      </div>
    </motion.aside>
  )
}
