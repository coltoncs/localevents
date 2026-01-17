import { prisma } from '~/utils/db.server'
import { deleteBlobImage } from '~/utils/events.server'

/**
 * Compare two date strings in YYYY-MM-DD format.
 * Returns true if dateStr is before compareDate.
 */
function isDateBefore(dateStr: string, compareDate: string): boolean {
  // Parse dates explicitly to avoid string comparison issues
  const [year1, month1, day1] = dateStr.split('-').map(Number)
  const [year2, month2, day2] = compareDate.split('-').map(Number)

  if (year1 !== year2) return year1 < year2
  if (month1 !== month2) return month1 < month2
  return day1 < day2
}

export async function loader({ request }: { request: Request }) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get today's date in YYYY-MM-DD format (US Eastern Time)
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  })

  console.log(`[Cron] Running cleanup for date: ${today}`)

  // Fetch all events to filter in code (more reliable than string comparison in DB)
  const allEvents = await prisma.event.findMany()

  // Find expired events
  const expiredEvents = allEvents.filter((event) => {
    if (event.recurrence) {
      // Recurring event: check endDate if it exists
      if (event.endDate) {
        return isDateBefore(event.endDate, today)
      }
      // Recurring events without endDate: don't auto-delete
      // (they need manual cleanup or an endDate to be set)
      return false
    } else {
      // Non-recurring event: check if date has passed
      return isDateBefore(event.date, today)
    }
  })

  console.log(`[Cron] Found ${expiredEvents.length} expired events out of ${allEvents.length} total`)

  if (expiredEvents.length === 0) {
    return Response.json({
      success: true,
      deleted: 0,
      imagesDeleted: 0,
      timestamp: new Date().toISOString(),
    })
  }

  // Delete blob images for expired events
  const imageUrls = expiredEvents
    .map((e) => e.imageUrl)
    .filter((url): url is string => url !== null)

  await Promise.all(imageUrls.map((url) => deleteBlobImage(url)))

  // Delete the expired events from the database
  const expiredIds = expiredEvents.map((e) => e.id)
  const deleteResult = await prisma.event.deleteMany({
    where: {
      id: { in: expiredIds },
    },
  })

  console.log(`[Cron] Cleaned up ${deleteResult.count} expired events and ${imageUrls.length} images`)

  return Response.json({
    success: true,
    deleted: deleteResult.count,
    imagesDeleted: imageUrls.length,
    timestamp: new Date().toISOString(),
  })
}
