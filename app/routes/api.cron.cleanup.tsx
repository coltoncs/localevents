import { prisma } from '~/utils/db.server'

export async function loader({ request }: { request: Request }) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  })

  // Delete non-recurring events that have passed
  // For recurring events, check the endDate if it exists
  const expiredEvents = await prisma.event.deleteMany({
    where: {
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
    },
  })

  console.log(`[Cron] Cleaned up ${expiredEvents.count} expired events`)

  return Response.json({
    success: true,
    deleted: expiredEvents.count,
    timestamp: new Date().toISOString(),
  })
}
