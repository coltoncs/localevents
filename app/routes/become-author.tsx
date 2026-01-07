import { redirect } from 'react-router'
import { getAuth } from '@clerk/react-router/server'
import { SignInButton } from '@clerk/react-router'
import type { Route } from './+types/become-author'
import { getUserRole } from '~/utils/roles.server'
import ShaderBackground from '~/components/ShaderBackground'

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  if (userId) {
    // User is signed in, check their role
    const cookieHeader = args.request.headers.get('Cookie')
    const role = await getUserRole(userId, cookieHeader)

    if (role === 'admin' || role === 'author') {
      // Already an author/admin, redirect to submit
      return redirect('/submit')
    } else {
      // Regular user, redirect to apply
      return redirect('/apply-author')
    }
  }

  // Not signed in, show the page
  return null
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - Become an Author' },
    { name: 'description', content: 'Sign in to create events on 919 Events' },
  ]
}

export default function BecomeAuthorPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <ShaderBackground variant="aurora" />

      <div className="absolute inset-0 bg-black/70 z-0" />

      <div className="relative z-10 pt-20 pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-6 text-white">Create Events on 919 Events</h1>

            <div className="mb-8 p-6 bg-slate-800/80 border border-slate-700 rounded-lg backdrop-blur-sm text-left">
              <h2 className="text-xl font-semibold text-white mb-4">How it works</h2>
              <ol className="space-y-4 text-slate-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</span>
                  <div>
                    <p className="font-medium text-white">Create an account or sign in</p>
                    <p className="text-sm">Sign up with your email or social account to get started.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</span>
                  <div>
                    <p className="font-medium text-white">Apply to become an author</p>
                    <p className="text-sm">Tell us about yourself and why you'd like to share events with the community.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">3</span>
                  <div>
                    <p className="font-medium text-white">Start creating events</p>
                    <p className="text-sm">Once approved, you can immediately create and publish events to the platform.</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignInButton mode="modal">
                <button className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg">
                  Sign In to Get Started
                </button>
              </SignInButton>
              <a
                href="/"
                className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium text-lg"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
