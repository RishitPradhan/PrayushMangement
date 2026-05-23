'use client'

import { motion } from 'framer-motion'
import { FolderKanban, CheckSquare, AlertTriangle, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats
  userRole?: string
}

const cards = (stats: DashboardStats) => [
  {
    label: 'Active Projects',
    value: stats.activeProjects,
    icon: FolderKanban,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.06)',
    border: 'rgba(168,85,247,0.15)',
    change: stats.projectsStartedThisMonth !== undefined 
      ? `+${stats.projectsStartedThisMonth} this month`
      : 'Active this month',
  },
  {
    label: 'Pending Tasks',
    value: stats.pendingTasks,
    icon: CheckSquare,
    color: '#eab308',
    bg: 'rgba(234,179,8,0.06)',
    border: 'rgba(234,179,8,0.15)',
    change: `${stats.completedTasks} completed`,
  },
  {
    label: 'Overdue Items',
    value: stats.overdueItems,
    icon: AlertTriangle,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.15)',
    change: 'Needs attention',
    pulse: stats.overdueItems > 0,
  },
  {
    label: 'Total Revenue',
    value: formatCurrency(stats.totalRevenue),
    icon: DollarSign,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.15)',
    change: `${formatCurrency(stats.pendingPayments)} pending`,
  },
]

export function StatsCards({ stats, userRole }: StatsCardsProps) {
  const allCards = cards(stats)
  const displayCards = userRole === 'admin' 
    ? allCards 
    : allCards.filter(c => c.label !== 'Total Revenue')

  const gridClass = displayCards.length === 3
    ? "grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"

  return (
    <div className={gridClass}>
      {displayCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 group flex flex-col justify-between"
        >
          {/* Top: Icon + Label */}
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner"
              style={{ background: card.bg }}
            >
              <card.icon size={15} style={{ color: card.color }} />
            </div>
            <div className="text-[14px] font-semibold text-gray-300 tracking-wide">{card.label}</div>
            {card.pulse && (
              <span className="flex h-2 w-2 ml-auto relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
              </span>
            )}
          </div>
          
          {/* Center/Bottom: Value + Sublabel */}
          <div className="relative z-10 flex-1 flex flex-col justify-end">
            <div className="text-4xl sm:text-[36px] font-bold text-white tracking-tight leading-none mb-4 truncate w-full">
              {card.value}
            </div>
            <div className="flex items-center">
              <div 
                className="text-[12px] font-bold px-2.5 py-1 rounded-full truncate max-w-full" 
                style={{ color: card.color, backgroundColor: card.bg }}
              >
                {card.change}
              </div>
            </div>
          </div>

          {/* Decorative Bottom Glow/Wave (Stakent Aesthetic) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-24 opacity-30 pointer-events-none transition-opacity duration-500 group-hover:opacity-50"
            style={{ 
              background: `radial-gradient(ellipse at bottom, ${card.color} 0%, transparent 70%)` 
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}
