'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DashboardShellProps {
  children: React.ReactNode
  userRole: string
  userProfile: any
}

export function DashboardShell({ children, userRole, userProfile }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!userProfile?.id) return

    const supabase = createClient()

    // Subscribe to real-time notification inserts
    const channel = supabase
      .channel(`realtime-notifications-${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          if (payload.new.user_id === userProfile.id) {
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
            toast(payload.new.title, {
              description: payload.new.message,
              duration: 6000,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = getRedirectUrl(payload.new.type)
                }
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile?.id])

  return (
    <div className="flex h-screen overflow-hidden bg-[#000000] relative">
      {/* Sidebar */}
      <Sidebar 
        userRole={userRole} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0a0c] relative">
        <Topbar 
          userProfile={userProfile} 
          onMenuToggle={() => setSidebarOpen(prev => !prev)} 
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  )
}
