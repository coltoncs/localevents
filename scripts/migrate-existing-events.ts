import 'dotenv/config'
import { prisma } from '../app/utils/db.server'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID

if (!ADMIN_USER_ID) {
  console.error('ADMIN_USER_ID environment variable not set')
  process.exit(1)
}

async function migrateEvents() {
  try {
    // Count total events
    const totalEvents = await prisma.event.count()
    console.log(`\nFound ${totalEvents} total events in database`)

    // Count events not owned by admin
    const eventsToMigrate = await prisma.event.count({
      where: { createdBy: { not: ADMIN_USER_ID } }
    })

    if (eventsToMigrate === 0) {
      console.log('✓ All events are already assigned to the admin user')
      return
    }

    console.log(`Migrating ${eventsToMigrate} events to admin user...`)

    // Update all events not owned by admin to be owned by admin
    const result = await prisma.event.updateMany({
      where: { createdBy: { not: ADMIN_USER_ID } },
      data: { createdBy: ADMIN_USER_ID }
    })

    console.log(`✓ Successfully migrated ${result.count} events to admin user: ${ADMIN_USER_ID}`)
  } catch (error) {
    console.error('✗ Error migrating events:', error)
    process.exit(1)
  }
}

migrateEvents()
