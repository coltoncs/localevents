import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.event.deleteMany()

  // Create sample events
  const event1 = await prisma.event.create({
    data: {
      title: 'React Meetup Raleigh',
      description: 'Join us for an evening of React discussions, networking, and learning!',
      date: '2025-01-15',
      location: 'The Frontier RTP',
      address: '800 Park Offices Dr, Durham, NC 27709',
      latitude: 35.9049,
      longitude: -78.8734,
      categories: ['Technology', 'Networking'],
      cost: 'Free',
      times: '6:00 PM - 8:00 PM',
      city: 'Durham',
      region: 'Research Triangle Park',
      createdBy: 'system',
    }
  })

  const event2 = await prisma.event.create({
    data: {
      title: 'Food Truck Friday',
      description: 'Enjoy delicious food from local food trucks and live music!',
      date: '2025-01-10',
      location: 'Fayetteville Street',
      address: 'Fayetteville St, Raleigh, NC 27601',
      latitude: 35.7796,
      longitude: -78.6382,
      categories: ['Food', 'Music'],
      cost: 'Free',
      times: '11:00 AM - 2:00 PM',
      city: 'Raleigh',
      region: 'Downtown Raleigh',
      recurrence: 'Every Friday',
      createdBy: 'system',
    }
  })

  console.log('✅ Seeding completed!')
  console.log(`Created ${await prisma.event.count()} events`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
