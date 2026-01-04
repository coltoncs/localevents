import { prisma } from './db.server'
import { updateUserRole } from './roles.server'

export async function createAuthorApplication(data: {
  userId: string
  fullName: string
  email: string
  bio: string
  experience?: string
}) {
  return await prisma.authorApplication.create({ data })
}

export async function getApplicationByUserId(userId: string) {
  return await prisma.authorApplication.findFirst({
    where: { userId },
    orderBy: { submittedAt: 'desc' }
  })
}

export async function getPendingApplications() {
  return await prisma.authorApplication.findMany({
    where: { status: 'pending' },
    orderBy: { submittedAt: 'asc' }
  })
}

export async function getAllApplications() {
  return await prisma.authorApplication.findMany({
    orderBy: { submittedAt: 'desc' }
  })
}

export async function approveApplication(applicationId: string, adminUserId: string) {
  const app = await prisma.authorApplication.update({
    where: { id: applicationId },
    data: {
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: adminUserId
    }
  })

  // Update user role to author
  await updateUserRole(app.userId, 'author')

  return app
}

export async function rejectApplication(
  applicationId: string,
  adminUserId: string,
  notes?: string
) {
  return await prisma.authorApplication.update({
    where: { id: applicationId },
    data: {
      status: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: adminUserId,
      reviewNotes: notes
    }
  })
}
