import type { UserRole } from '~/types/roles'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md' | 'lg'
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const styles = {
    admin: 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/50',
    author: 'bg-purple-600/30 text-purple-300 border border-purple-600/50',
    user: 'bg-slate-600/30 text-slate-300 border border-slate-600/50'
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  return (
    <span className={`rounded-full font-medium ${styles[role]} ${sizes[size]}`}>
      {role.toUpperCase()}
    </span>
  )
}
