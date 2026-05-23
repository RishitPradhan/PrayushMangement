'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  redBorder?: boolean
  animate?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className, redBorder, animate = true, onClick }: GlassCardProps) {
  const Comp = animate ? motion.div : 'div'
  const animProps = animate
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }
    : {}

  return (
    <Comp
      className={cn('glass-card p-4', redBorder && 'glass-card-red', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      {...animProps}
    >
      {children}
    </Comp>
  )
}
