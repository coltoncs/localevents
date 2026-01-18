import 'dotenv/config'
import { PrismaClient } from '../../prisma/generated/client.js'
import { withAccelerate } from '@prisma/extension-accelerate'

// Extended client type with Accelerate caching support
type PrismaClientWithAccelerate = ReturnType<typeof createPrismaClient>

let prisma: PrismaClientWithAccelerate

declare global {
  var __db__: PrismaClientWithAccelerate
}

function createPrismaClient() {
  return new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL!,
  }).$extends(withAccelerate())
}

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// In production, we'll have a single connection to the DB.
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient()
} else {
  if (!global.__db__) {
    global.__db__ = createPrismaClient()
  }
  prisma = global.__db__
}

export { prisma }
