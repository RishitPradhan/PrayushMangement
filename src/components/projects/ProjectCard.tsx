'use client'

import { useState } from 'react'
import { Project } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import { formatDate, getDaysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface ProjectCardProps {
  project: Project
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const daysLeft = getDaysUntil(project.due_date)
  const isOverdue = daysLeft !== null && daysLeft < 0

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit?.(project)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(project)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/projects/${project.id}`} className="block h-full relative group">
        <div
          className="glass-card p-6 h-full flex flex-col gap-5 cursor-pointer bg-gray-950/10 border-[rgba(255,255,255,0.03)]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            borderColor: hovered ? 'rgba(230,57,70,0.25)' : undefined,
            boxShadow: hovered ? '0 12px 36px rgba(0,0,0,0.6)' : undefined,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 relative">
            <div className="flex-1 min-w-0 pr-16">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <h3 className="text-[16px] font-bold text-white tracking-tight truncate group-hover:text-[#e63946] transition-colors">{project.name}</h3>
                <StatusBadge status={project.status} className="flex-shrink-0" />
              </div>
              <p className="text-[13px] text-gray-500 font-medium truncate">{project.client?.name ?? 'No client'}</p>
            </div>

            {/* Actions overlay */}
            {(onEdit || onDelete) && (
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#121216] p-1 rounded-lg border border-[rgba(255,255,255,0.05)] shadow-lg z-10">
                {onEdit && (
                  <button onClick={handleEdit} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  </button>
                )}
                {onDelete && (
                  <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-[#ef4444] hover:bg-red-500/10 rounded-md transition-colors" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-[13.5px] text-gray-400 line-clamp-2 flex-1 leading-relaxed">{project.description}</p>
          )}

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Progress</span>
              <span className="text-[12px] font-bold text-white">{project.progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${project.progress}%` }} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-[12px] text-gray-400 font-medium">
              <Calendar size={13} className="text-gray-500" />
              {project.due_date ? (
                <span className={isOverdue ? 'text-[#e63946] font-semibold' : ''}>
                  {isOverdue ? `${Math.abs(daysLeft!)}d overdue` : formatDate(project.due_date)}
                </span>
              ) : (
                <span>No deadline</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={project.priority} />
              <ArrowRight
                size={14}
                className="text-gray-500 transition-transform"
                style={{ transform: hovered ? 'translateX(3px)' : 'none', transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </div>
          </div>

          {/* Members */}
          {project.members && project.members.length > 0 && (
            <div className="flex items-center gap-1.5 pt-3 border-t border-[rgba(255,255,255,0.03)]">
              {project.members.slice(0, 4).map(member => (
                <Avatar key={member.id} name={member.full_name} avatarUrl={member.avatar_url} size="xs" />
              ))}
              {project.members.length > 4 && (
                <span className="text-[11px] text-gray-500 font-semibold ml-1">+{project.members.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
