import { useRef } from 'react'
import ShaderBackground from '~/components/ShaderBackground'
import { SignedIn } from '@clerk/react-router'
import { useUserRole } from '~/hooks/useUserRole'

export function Splash() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { role, isAdmin, isAuthor } = useUserRole()

  const canCreateEvents = isAdmin || isAuthor
  const canApplyForAuthor = role === 'user'

  return (
    <main className="w-screen h-screen -mt-16 relative overflow-hidden">
      <ShaderBackground variant='aurora' />

      <div className="absolute inset-0 flex items-center justify-center" ref={containerRef}>
        <div className="text-center text-white px-4">
          <h1 className="text-5xl font-bold mb-8 inline-flex items-center gap-3">
            <span>919 Events</span>
          </h1>
          <div className="flex flex-wrap gap-4 justify-center max-w-2xl mx-auto">
            <a
              href="/events"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Events
            </a>
            <a
              href="/map"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              View Map
            </a>
            <SignedIn>
              {canCreateEvents && (
                <a
                  href="/submit"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Submit Event
                </a>
              )}
              {canApplyForAuthor && (
                <a
                  href="/apply-author"
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
                >
                  Become an Author
                </a>
              )}
            </SignedIn>
          </div>
        </div>
      </div>
    </main>
  )
}

Splash.HydrateFallback = () => <>Loading...</>;