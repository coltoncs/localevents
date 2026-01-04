import { Form, redirect, useLoaderData, useActionData } from 'react-router'
import { getAuth, clerkClient } from '@clerk/react-router/server'
import type { Route } from './+types/apply-author'
import { getUserRole } from '~/utils/roles.server'
import { createAuthorApplication, getApplicationByUserId } from '~/utils/author-applications.server'
import ShaderBackground from '~/components/ShaderBackground'

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  // Check if user is already an admin or author
  const cookieHeader = args.request.headers.get('Cookie')
  const role = await getUserRole(userId, cookieHeader)
  if (role === 'admin' || role === 'author') {
    return redirect('/my-events')
  }

  // Check if user already has a pending or approved application
  const existingApplication = await getApplicationByUserId(userId)
  if (existingApplication && (existingApplication.status === 'pending' || existingApplication.status === 'approved')) {
    return redirect('/')
  }

  // Get user details from Clerk
  const user = await clerkClient(args).users.getUser(userId)

  return {
    userEmail: user.emailAddresses[0]?.emailAddress || '',
    userName: user.fullName || '',
    existingApplication
  }
}

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  // Check role again
  const cookieHeader = args.request.headers.get('Cookie')
  const role = await getUserRole(userId, cookieHeader)
  if (role !== 'user') {
    return { error: 'You already have author or admin privileges' }
  }

  const formData = await args.request.formData()

  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const bio = formData.get('bio') as string
  const experience = formData.get('experience') as string

  // Validate required fields
  if (!fullName || !email || !bio) {
    return {
      error: 'Please fill out all required fields'
    }
  }

  // Create application
  await createAuthorApplication({
    userId,
    fullName,
    email,
    bio,
    experience: experience || undefined
  })

  return redirect('/?application=submitted')
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - Apply for Author' },
    { name: 'description', content: 'Apply to become an event author' },
  ]
}

export default function ApplyAuthorPage() {
  const { userEmail, userName, existingApplication } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <main className="min-h-screen relative overflow-hidden">
      <ShaderBackground variant="aurora" />

      <div className="absolute inset-0 bg-black/70 z-0" />

      <div className="relative z-10 pt-20 pb-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6 text-white">Apply to Become an Author</h1>

          {existingApplication && existingApplication.status === 'rejected' && (
            <div className="max-w-2xl mb-6 p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
              <h3 className="font-semibold mb-2">Previous Application Rejected</h3>
              <p className="text-sm">Your previous application was reviewed and not approved.</p>
              {existingApplication.reviewNotes && (
                <p className="text-sm mt-2"><strong>Admin notes:</strong> {existingApplication.reviewNotes}</p>
              )}
              <p className="text-sm mt-2">You can submit a new application below.</p>
            </div>
          )}

          {actionData?.error && (
            <div className="max-w-2xl mb-4 p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
              {actionData.error}
            </div>
          )}

          <div className="max-w-2xl mb-6 p-4 bg-slate-800/80 border border-slate-700 rounded backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white mb-3">What is an Author?</h2>
            <p className="text-slate-300 mb-2">
              Authors can submit and publish events immediately to the 919 Events platform.
              As an author, you'll have the ability to create, edit, and manage your own events.
            </p>
            <p className="text-slate-300">
              Please tell us about yourself and why you'd like to become an author.
              Applications are reviewed by our admin team.
            </p>
          </div>

          <Form method="post" className="max-w-2xl space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-white">
                Full Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                defaultValue={userName}
                required
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white capitalize"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={userEmail}
                required
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-2 text-white">
                Why do you want to be an author? *
              </label>
              <textarea
                id="bio"
                name="bio"
                required
                rows={6}
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white"
                placeholder="Tell us about your interest in organizing or promoting events in the 919 area..."
              />
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-medium mb-2 text-white">
                Previous Event Experience (Optional)
              </label>
              <textarea
                id="experience"
                name="experience"
                rows={4}
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white"
                placeholder="Share any relevant experience organizing or promoting events..."
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Submit Application
              </button>
              <a
                href="/"
                className="px-6 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                Cancel
              </a>
            </div>
          </Form>
        </div>
      </div>
    </main>
  )
}
