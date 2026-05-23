import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-[13px]',
  lg: 'w-12 h-12 text-[16px]',
}

const bgColors = [
  'bg-red-900/60 border-red-800/40',
  'bg-indigo-900/60 border-indigo-800/40',
  'bg-emerald-900/60 border-emerald-800/40',
  'bg-amber-900/60 border-amber-800/40',
  'bg-violet-900/60 border-violet-800/40',
]

function getColor(name: string) {
  const idx = name.charCodeAt(0) % bgColors.length
  return bgColors[idx]
}

export function Avatar({ name, avatarUrl, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size]
  const colorClass = getColor(name)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn('rounded-full object-cover border border-white/10', sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full border flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizeClass,
        colorClass,
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
