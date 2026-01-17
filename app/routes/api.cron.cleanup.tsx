import { prisma } from '~/utils/db.server'
import { deleteBlobImage } from '~/utils/events.server'

export async function loader({ request }: { request: Request }) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  })

  const whereClause = {
    OR: [
      // Non-recurring events where the date has passed
      {
        recurrence: null,
        date: { lt: today },
      },
      // Recurring events where the end date has passed
      {
        recurrence: { not: null },
        endDate: { not: null, lt: today },
      },
    ],
  }

  // First, find all expired events with their imageUrls
  const expiredEvents = await prisma.event.findMany({
    where: whereClause,
    select: { id: true, imageUrl: true },
  })

  // Delete blob images for expired events
  const imageUrls = expiredEvents
    .map((e) => e.imageUrl)
    .filter((url): url is string => url !== null)

  await Promise.all(imageUrls.map((url) => deleteBlobImage(url)))

  // Delete the expired events from the database
  const deleteResult = await prisma.event.deleteMany({
    where: whereClause,
  })

  console.log(`[Cron] Cleaned up ${deleteResult.count} expired events and ${imageUrls.length} images`)

  return Response.json({
    success: true,
    deleted: deleteResult.count,
    imagesDeleted: imageUrls.length,
    timestamp: new Date().toISOString(),
  })
}
