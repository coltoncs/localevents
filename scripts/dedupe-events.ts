import 'dotenv/config'
import { PrismaClient } from '../prisma/generated/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.PRISMA_POSTGRESQL_URL! })
const prisma = new PrismaClient({ adapter })

interface EventRecord {
  id: string
  title: string
  date: string
  description: string
  location: string
  times: string | null
  createdAt: Date
}

function createDuplicateKey(event: EventRecord): string {
  // Create a key from the fields that define a "duplicate"
  return [
    event.title.toLowerCase().trim(),
    event.date,
    event.description.toLowerCase().trim(),
    event.location.toLowerCase().trim(),
    (event.times || '').toLowerCase().trim(),
  ].join('|')
}

async function main() {
  console.log('🔍 Scanning for duplicate events...\n')

  // Fetch all events
  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      date: true,
      description: true,
      location: true,
      times: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }, // Oldest first so we keep the original
  })

  console.log(`Found ${events.length} total events\n`)

  // Group events by their duplicate key
  const groups = new Map<string, EventRecord[]>()

  for (const event of events) {
    const key = createDuplicateKey(event)
    const existing = groups.get(key) || []
    existing.push(event)
    groups.set(key, existing)
  }

  // Find groups with duplicates
  const duplicateGroups = Array.from(groups.entries()).filter(
    ([, events]) => events.length > 1
  )

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate events found!')
    return
  }

  console.log(`Found ${duplicateGroups.length} groups of duplicate events:\n`)

  const idsToDelete: string[] = []

  for (const [, events] of duplicateGroups) {
    // Keep the first (oldest) event, mark the rest for deletion
    const [keep, ...duplicates] = events

    console.log(`📋 "${keep.title}" (${keep.date})`)
    console.log(`   Keeping: ${keep.id} (created ${keep.createdAt.toISOString()})`)

    for (const dup of duplicates) {
      console.log(`   Deleting: ${dup.id} (created ${dup.createdAt.toISOString()})`)
      idsToDelete.push(dup.id)
    }
    console.log()
  }

  if (idsToDelete.length === 0) {
    console.log('✅ Nothing to delete!')
    return
  }

  // Check for --dry-run flag
  const isDryRun = process.argv.includes('--dry-run')

  if (isDryRun) {
    console.log(`🔍 DRY RUN: Would delete ${idsToDelete.length} duplicate events`)
    console.log('   Run without --dry-run to actually delete them')
    return
  }

  // Confirm deletion
  console.log(`⚠️  About to delete ${idsToDelete.length} duplicate events`)
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n')

  await new Promise((resolve) => setTimeout(resolve, 5000))

  // Delete duplicates
  console.log('🗑️  Deleting duplicates...')

  const result = await prisma.event.deleteMany({
    where: {
      id: { in: idsToDelete },
    },
  })

  console.log(`\n✅ Deleted ${result.count} duplicate events`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
