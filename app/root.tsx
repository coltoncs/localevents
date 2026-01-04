import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, Link } from 'react-router'
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server'
import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/react-router'
import { Toaster } from 'sonner'
import { useUIStore } from './stores'
import { useUserRole } from './hooks/useUserRole'

import type { Route } from './+types/root'
import stylesheet from './app.css?url'

export const middleware: Route.MiddlewareFunction[] = [clerkMiddleware()]
export const loader = (args: Route.LoaderArgs) => rootAuthLoader(args)

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  { rel: 'stylesheet', href: stylesheet },
]
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

function ResponsiveHeader() {
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore()
  const { role, isAdmin, isAuthor, isActuallyAdmin } = useUserRole()

  const canCreateEvents = isAdmin || isAuthor
  const canApplyForAuthor = role === 'user'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800">
      <div className="flex items-center justify-between py-4 px-4">
        <Link to="/" className="font-bold text-xl hover:text-slate-300">919 Events</Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          <Link to="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <Link to="/map" className="hover:text-slate-300 transition-colors">Map</Link>
          <Link to="/events" className="hover:text-slate-300 transition-colors">Events</Link>
          <SignedIn>
            {canCreateEvents && (
              <Link to="/my-events" className="hover:text-slate-300 transition-colors">My Events</Link>
            )}
            {canApplyForAuthor && (
              <Link to="/apply-author" className="hover:text-slate-300 transition-colors">Become an Author</Link>
            )}
            {isActuallyAdmin && (
              <Link to="/admin" className="hover:text-yellow-300 transition-colors text-yellow-400">Admin</Link>
            )}
          </SignedIn>
        </nav>

        <div className="flex items-center gap-4">
          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded hover:bg-slate-800 focus:outline-none focus:ring"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden border-t border-slate-800 bg-slate-950/95">
          <div className="px-4 py-4 flex flex-col gap-3">
            <Link to="/" onClick={closeMobileMenu} className="block py-2 hover:text-slate-300 transition-colors">Home</Link>
            <Link to="/map" onClick={closeMobileMenu} className="block py-2 hover:text-slate-300 transition-colors">Map</Link>
            <Link to="/events" onClick={closeMobileMenu} className="block py-2 hover:text-slate-300 transition-colors">Events</Link>
            <SignedIn>
              {canCreateEvents && (
                <Link to="/my-events" onClick={closeMobileMenu} className="block py-2 hover:text-slate-300 transition-colors">My Events</Link>
              )}
              {canApplyForAuthor && (
                <Link to="/apply-author" onClick={closeMobileMenu} className="block py-2 hover:text-slate-300 transition-colors">Become an Author</Link>
              )}
              {isActuallyAdmin && (
                <Link to="/admin" onClick={closeMobileMenu} className="block py-2 hover:text-yellow-300 transition-colors text-yellow-400">Admin</Link>
              )}
            </SignedIn>

            <div className="pt-3 border-t border-slate-800 mt-2">
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}

// Pull in the `loaderData` from the `rootAuthLoader()` function
export default function App({ loaderData }: Route.ComponentProps) {
  return (
    // Pass the `loaderData` to the `<ClerkProvider>` component
    <ClerkProvider loaderData={loaderData}>
      <ResponsiveHeader />
      <main className="pt-16">
        <Outlet />
      </main>
    </ClerkProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
