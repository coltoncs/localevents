import { useState, useEffect } from 'react'
import { Form, redirect, useLoaderData, useActionData } from 'react-router'
import { getAuth } from '@clerk/react-router/server'
import { toast } from 'sonner'
import type { Route } from './+types/admin'
import { canUserManageAuthors } from '~/utils/permissions.server'
import { getPendingApplications, getAllApplications, approveApplication, rejectApplication } from '~/utils/author-applications.server'
import { bulkCreateEvents } from '~/utils/events.server'
import { transformApiEvents } from '~/utils/transformApiData'
import ShaderBackground from '~/components/ShaderBackground'
import { useRoleSimulationStore } from '~/stores'
import { useUserRole } from '~/hooks/useUserRole'
import type { AuthorApplication } from '@prisma/client'

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  const canManage = await canUserManageAuthors(userId)
  if (!canManage) {
    throw new Response('Unauthorized - Admin access required', { status: 403 })
  }

  const pendingApplications = await getPendingApplications()
  const allApplications = await getAllApplications()

  return {
    pendingApplications,
    recentApplications: allApplications.filter(app => app.status !== 'pending').slice(0, 10)
  }
}

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  const canManage = await canUserManageAuthors(userId)
  if (!canManage) {
    return { error: 'Unauthorized - Admin access required' }
  }

  const formData = await args.request.formData()
  const action = formData.get('action') as string

  // Handle bulk event upload
  if (action === 'bulkUpload') {
    const file = formData.get('eventsFile') as File

    if (!file) {
      return { error: 'No file uploaded' }
    }

    try {
      const text = await file.text()
      const jsonData = JSON.parse(text)

      if (!Array.isArray(jsonData)) {
        return { error: 'Invalid JSON format: Expected an array of events' }
      }

      // Transform API events to app format
      const transformedEvents = transformApiEvents(jsonData)

      // Set createdBy to the admin's userId
      const eventsWithCreator = transformedEvents.map(event => ({
        ...event,
        createdBy: userId
      }))

      // Remove the 'id' field as it will be auto-generated
      const eventsToCreate = eventsWithCreator.map(({ id, ...rest }) => rest)

      // Bulk create events
      const result = await bulkCreateEvents(eventsToCreate)

      if (result.failed > 0) {
        return {
          success: `Uploaded ${result.success} events successfully. ${result.failed} failed.`,
          errors: result.errors
        }
      }

      return { success: `Successfully uploaded ${result.success} events!` }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { error: `Failed to process file: ${errorMessage}` }
    }
  }

  // Handle author application actions
  const applicationId = formData.get('applicationId') as string
  const notes = formData.get('notes') as string

  if (!applicationId) {
    return { error: 'Application ID is required' }
  }

  try {
    if (action === 'approve') {
      await approveApplication(applicationId, userId)
      return { success: 'Application approved successfully' }
    } else if (action === 'reject') {
      await rejectApplication(applicationId, userId, notes || undefined)
      return { success: 'Application rejected' }
    }

    return { error: 'Invalid action' }
  } catch (error) {
    console.error('Error processing application:', error)
    return { error: 'Failed to process application' }
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - Admin Dashboard' },
    { name: 'description', content: 'Manage author applications' },
  ]
}

export default function AdminPage() {
  const { pendingApplications, recentApplications } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const { setSimulatedRole, clearSimulation } = useRoleSimulationStore()
  const { role, isSimulating } = useUserRole()
  const [activeTab, setActiveTab] = useState<'applications' | 'upload' | 'simulation' | 'history'>('applications')

  // Show toast notifications based on action results
  useEffect(() => {
    if (actionData?.error) {
      toast.error(actionData.error)
    }

    if (actionData?.success) {
      toast.success(actionData.success)
    }

    if (actionData?.errors && actionData.errors.length > 0) {
      actionData.errors.forEach((error: string) => {
        toast.warning(error)
      })
    }
  }, [actionData])

  const handleRoleChange = (newRole: 'admin' | 'author' | 'user' | null) => {
    if (newRole === null || newRole === 'admin') {
      clearSimulation()
      document.cookie = 'simulatedRole=; path=/; max-age=0'
    } else {
      setSimulatedRole(newRole)
      document.cookie = `simulatedRole=${newRole}; path=/; max-age=3600`
    }
  }

  const tabs = [
    { id: 'applications' as const, label: 'Pending Applications', count: pendingApplications.length },
    { id: 'upload' as const, label: 'Bulk Upload', count: null },
    { id: 'simulation' as const, label: 'Role Simulation', count: null },
    { id: 'history' as const, label: 'Recent Decisions', count: recentApplications.length },
  ]

  return (
    <main className="min-h-screen relative overflow-hidden">
      <ShaderBackground variant="aurora" />
      <div className="absolute inset-0 bg-black/70 z-0" />

      <div className="relative z-10 pt-20 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <span className="px-3 py-1 bg-yellow-600/30 text-yellow-300 border border-yellow-600/50 rounded-full text-sm font-medium">
              ADMIN
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-slate-700">
            <nav className="flex gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content Container */}
          <div className="bg-slate-800/80 border border-slate-700 rounded backdrop-blur-sm min-h-[500px]">
            {/* Pending Applications Tab */}
            {activeTab === 'applications' && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-white mb-6">
                  Pending Applications ({pendingApplications.length})
                </h2>

                {pendingApplications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-300">No pending applications</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {pendingApplications.map((app: AuthorApplication) => (
                      <article
                        key={app.id}
                        className="p-6 bg-slate-900/50 border border-slate-600 rounded"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1">{app.fullName}</h3>
                            <p className="text-slate-400 text-sm">{app.email}</p>
                            <p className="text-slate-500 text-xs mt-1">
                              Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-blue-600/30 text-blue-300 border border-blue-600/50 rounded-full text-sm">
                            Pending
                          </span>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-white mb-2">Why they want to be an author:</h4>
                          <p className="text-slate-300 whitespace-pre-wrap">{app.bio}</p>
                        </div>

                        {app.experience && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-white mb-2">Previous experience:</h4>
                            <p className="text-slate-300 whitespace-pre-wrap">{app.experience}</p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Form method="post" className="inline">
                            <input type="hidden" name="applicationId" value={app.id} />
                            <input type="hidden" name="action" value="approve" />
                            <button
                              type="submit"
                              onClick={(e) => {
                                if (!confirm(`Approve ${app.fullName} as an author?`)) {
                                  e.preventDefault()
                                }
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                          </Form>

                          <Form method="post" className="inline">
                            <input type="hidden" name="applicationId" value={app.id} />
                            <input type="hidden" name="action" value="reject" />
                            <button
                              type="submit"
                              onClick={(e) => {
                                const notes = prompt(`Reject ${app.fullName}'s application?\n\nOptional notes for the applicant:`)
                                if (notes === null) {
                                  e.preventDefault()
                                } else if (notes) {
                                  const notesInput = document.createElement('input')
                                  notesInput.type = 'hidden'
                                  notesInput.name = 'notes'
                                  notesInput.value = notes
                                  e.currentTarget.appendChild(notesInput)
                                }
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </Form>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bulk Upload Tab */}
            {activeTab === 'upload' && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">Bulk Event Upload</h2>
                <p className="text-slate-300 text-sm mb-6">
                  Upload a JSON file containing an array of events from the API format.
                  Events will be automatically transformed and saved to the database.
                </p>

                <Form method="post" encType="multipart/form-data" className="space-y-4">
                  <input type="hidden" name="action" value="bulkUpload" />

                  <div>
                    <label htmlFor="eventsFile" className="block text-sm font-medium text-white mb-2">
                      Select JSON File
                    </label>
                    <input
                      id="eventsFile"
                      name="eventsFile"
                      type="file"
                      accept=".json,application/json"
                      required
                      className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    <p className="text-slate-400 text-xs mt-1">
                      Expected format: Array of ApiEvent objects (see transformApiData.ts)
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Upload Events
                  </button>
                </Form>

                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 font-medium">
                    Show expected JSON format
                  </summary>
                  <pre className="mt-3 p-4 bg-slate-900/50 border border-slate-600 rounded text-xs text-slate-300 overflow-x-auto">
{`[
  {
    "recId": "100768",
    "name": "Event Name",
    "teaser": "Event description",
    "location": "Venue Name",
    "coordinates": [35.7796, -78.6382],
    "date": "2025-12-23T04:59:59.000Z",
    "times": "6:00 PM - 8:00 PM",
    "cost": "Free",
    "categories": [
      { "catName": "Music", "catId": "1" }
    ],
    "media_raw": [
      { "mediaurl": "https://...", "sortorder": 1, "mediatype": "Image" }
    ],
    "listing": {
      "address1": "123 Main St",
      "region": "Downtown"
    },
    "recurrence": "Weekly",
    "endDate": "2026-01-01T00:00:00.000Z",
    "city": "Raleigh"
  }
]`}
                  </pre>
                </details>
              </div>
            )}

            {/* Role Simulation Tab */}
            {activeTab === 'simulation' && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">Role Simulation</h2>
                <p className="text-slate-300 text-sm mb-6">
                  View the site as different roles. The admin dashboard will remain visible so you can toggle back.
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <button
                    onClick={() => handleRoleChange(null)}
                    className={`px-6 py-3 rounded font-medium transition-colors ${
                      !isSimulating
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Admin (Actual Role)
                  </button>
                  <button
                    onClick={() => handleRoleChange('author')}
                    className={`px-6 py-3 rounded font-medium transition-colors ${
                      isSimulating && role === 'author'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Author
                  </button>
                  <button
                    onClick={() => handleRoleChange('user')}
                    className={`px-6 py-3 rounded font-medium transition-colors ${
                      isSimulating && role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    User
                  </button>
                </div>

                {isSimulating && (
                  <div className="p-4 bg-blue-900/30 border border-blue-700 rounded">
                    <p className="text-blue-300">
                      <strong>Currently Simulating:</strong> Viewing the site as <strong className="uppercase">{role}</strong> role.
                      Navigate around to see how the site appears for this role.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Decisions Tab */}
            {activeTab === 'history' && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-white mb-6">
                  Recent Decisions
                </h2>

                {recentApplications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-300">No recent applications</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {recentApplications.map((app: AuthorApplication) => (
                      <article
                        key={app.id}
                        className="p-4 bg-slate-900/50 border border-slate-600 rounded"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{app.fullName}</h3>
                            <p className="text-slate-400 text-sm">{app.email}</p>
                            <p className="text-slate-500 text-xs mt-1">
                              Reviewed: {app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 border rounded-full text-sm ${
                              app.status === 'approved'
                                ? 'bg-green-600/30 text-green-300 border-green-600/50'
                                : 'bg-red-600/30 text-red-300 border-red-600/50'
                            }`}
                          >
                            {app.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                        {app.reviewNotes && (
                          <p className="text-slate-400 text-sm mt-2">
                            <strong>Notes:</strong> {app.reviewNotes}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
