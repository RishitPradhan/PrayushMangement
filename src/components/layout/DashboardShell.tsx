'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface DashboardShellProps {
  children: React.ReactNode
  userRole: string
  userProfile: any
}

export function DashboardShell({ children, userRole, userProfile }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
