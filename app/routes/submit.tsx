import { useState } from 'react'
import { Form, useNavigate, redirect, useActionData } from 'react-router'
import { getAuth } from '@clerk/react-router/server'
import { createClerkClient } from '@clerk/backend'
import type { Route } from './+types/submit'
import { createEvent } from '~/utils/events.server'
import { canUserCreateEvent } from '~/utils/permissions.server'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  const cookieHeader = args.request.headers.get('Cookie')
  const canCreate = await canUserCreateEvent(userId, cookieHeader)
  if (!canCreate) {
    throw new Response('Only Authors and Admins can create events', { status: 403 })
  }

  return null
}

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  // Get the user's name from Clerk
  const user = await clerkClient.users.getUser(userId)
  const createdByName = user.username || user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User'

  const formData = await args.request.formData()

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const location = formData.get('location') as string
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const region = formData.get('region') as string
  const latitude = formData.get('latitude') as string
  const longitude = formData.get('longitude') as string
  const cost = formData.get('cost') as string
  const times = formData.get('times') as string
  const url = formData.get('url') as string
  const imageUrl = formData.get('imageUrl') as string
  const recurrence = formData.get('recurrence') as string
  const endDate = formData.get('endDate') as string

  // Get all categories from form
  const categories: string[] = []
  let index = 0
  while (formData.has(`category-${index}`)) {
    const category = formData.get(`category-${index}`) as string
    if (category.trim()) {
      categories.push(category.trim())
    }
    index++
  }

  // Validate required fields
  if (!title || !description || !date || !location) {
    return {
      error: 'All required fields must be filled out'
    }
  }

  // Validate dates are not in the past (using US Eastern Time)
  const todayEastern = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  todayEastern.setHours(0, 0, 0, 0)
  const eventDate = new Date(date + 'T00:00:00')

  if (eventDate < todayEastern) {
    return {
      error: 'Event date cannot be in the past'
    }
  }

  if (endDate) {
    const eventEndDate = new Date(endDate + 'T00:00:00')
    if (eventEndDate < todayEastern) {
      return {
        error: 'End date cannot be in the past'
      }
    }
    if (eventEndDate < eventDate) {
      return {
        error: 'End date cannot be before the event start date'
      }
    }
  }

  // Create the event
  await createEvent({
    title,
    description,
    date,
    location,
    address: address || undefined,
    city: city || undefined,
    region: region || undefined,
    coordinates: latitude && longitude
      ? { lat: parseFloat(latitude), lng: parseFloat(longitude) }
      : undefined,
    cost: cost || undefined,
    times: times || undefined,
    url: url || undefined,
    imageUrl: imageUrl || undefined,
    recurrence: recurrence || undefined,
    endDate: endDate || undefined,
    categories: categories.length > 0 ? categories : undefined,
    createdBy: userId,
    createdByName,
  })

  return redirect('/events')
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - Submit Event' },
    { name: 'description', content: 'Submit a new event to the 919 Events calendar' },
  ]
}

export default function SubmitPage() {
  const navigate = useNavigate()
  const actionData = useActionData<typeof action>()
  const [categories, setCategories] = useState<string[]>([])
  const [hasRecurrence, setHasRecurrence] = useState(false)

  // Get today's date in US Eastern Time for min attribute
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
    .toISOString().split('T')[0]

  const addCategory = () => {
    setCategories([...categories, ''])
  }

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index))
  }

  const updateCategory = (index: number, value: string) => {
    const newCategories = [...categories]
    newCategories[index] = value
    setCategories(newCategories)
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Submit an Event</h1>

      {actionData?.error && (
        <div className="max-w-2xl mb-4 p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
          {actionData.error}
        </div>
      )}

      <Form method="post" className="max-w-2xl space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Basic Information</h2>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Event Title *
            </label>
            <input
              id="title"
              name="title"
              required
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Community Meetup"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none min-h-32"
              placeholder="Tell us about your event..."
            />
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium mb-2">
              Image URL
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-2">
              Event Website
            </label>
            <input
              id="url"
              name="url"
              type="url"
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/event"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Date & Time</h2>

          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-2">
              Date *
            </label>
            <input
              id="date"
              name="date"
              type="date"
              min={today}
              required
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="times" className="block text-sm font-medium mb-2">
              Times
            </label>
            <input
              id="times"
              name="times"
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="6:00 PM - 8:00 PM"
            />
          </div>

          <div>
            <label htmlFor="recurrence" className="block text-sm font-medium mb-2">
              Recurrence
            </label>
            <input
              id="recurrence"
              name="recurrence"
              onChange={(e) => setHasRecurrence(e.target.value.trim() !== '')}
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Every Monday, Weekly, etc."
            />
          </div>

          {hasRecurrence && (
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                End Date *
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                min={today}
                required
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Location</h2>

          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-2">
              Venue Name *
            </label>
            <input
              id="location"
              name="location"
              required
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none capitalize"
              placeholder="Community Center"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-2">
              Address
            </label>
            <input
              id="address"
              name="address"
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-2">
                City
              </label>
              <input
                id="city"
                name="city"
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none capitalize"
                placeholder="Raleigh"
              />
            </div>
            <div>
              <label htmlFor="region" className="block text-sm font-medium mb-2">
                Region
              </label>
              <input
                id="region"
                name="region"
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none capitalize"
                placeholder="Downtown"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium mb-2">
                Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., 35.7796"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium mb-2">
                Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., -78.6382"
              />
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Additional Details</h2>

          <div>
            <label htmlFor="cost" className="block text-sm font-medium mb-2">
              Cost
            </label>
            <input
              id="cost"
              name="cost"
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Free, $10, $5-$15, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Categories
            </label>
            <div className="space-y-2">
              {categories.length > 0 && (
                <div className="space-y-2 max-w-md">
                  {categories.map((category, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        name={`category-${index}`}
                        value={category}
                        onChange={(e) => updateCategory(index, e.target.value)}
                        className="flex-1 px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none capitalize"
                        placeholder="e.g., Technology, Music, Food"
                      />
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addCategory}
                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                + Add Category
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Submit Event
          </button>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-6 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Form>
    </main>
  )
}
