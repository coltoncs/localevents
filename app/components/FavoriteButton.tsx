import { useFetcher } from 'react-router'

interface FavoriteButtonProps {
  eventId: string
  initialVoted: boolean
  initialCount: number
  isAuthenticated: boolean
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export default function FavoriteButton({
  eventId,
  initialVoted,
  initialCount,
  isAuthenticated,
  size = 'md',
  showCount = true,
}: FavoriteButtonProps) {
  const fetcher = useFetcher()

  // Optimistic UI: show pending state immediately
  const isOptimistic = fetcher.formData !== undefined
  const isVoted = isOptimistic ? !initialVoted : initialVoted
  const count = isOptimistic
    ? initialCount + (isVoted ? 1 : -1)
    : initialCount

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!isAuthenticated) {
      return
    }

    fetcher.submit(
      { eventId },
      { method: 'post', action: '/api/vote' }
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isAuthenticated || fetcher.state !== 'idle'}
      className={`flex items-center gap-1 transition-colors ${
        isAuthenticated
          ? 'hover:text-red-400 cursor-pointer'
          : 'cursor-not-allowed opacity-50'
      } ${isVoted ? 'text-red-500' : 'text-slate-400'}`}
      title={isAuthenticated ? (isVoted ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite'}
    >
      <svg
        className={sizeClasses[size]}
        fill={isVoted ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showCount && <span className={textSizes[size]}>{count}</span>}
    </button>
  )
}
