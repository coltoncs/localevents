import type { UserRole } from '~/types/roles'
import { createClerkClient } from '@clerk/backend'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export async function getUserRole(userId: string, cookieHeader?: string | null): Promise<UserRole> {
  const user = await clerkClient.users.getUser(userId)
  const actualRole = (user.publicMetadata?.role as UserRole) || 'user'

  // If user is an admin and has a simulatedRole cookie, use that instead
  if (actualRole === 'admin' && cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const simulatedRole = cookies['simulatedRole'] as UserRole | undefined
    if (simulatedRole && (simulatedRole === 'user' || simulatedRole === 'author')) {
      return simulatedRole
    }
  }

  return actualRole
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: { role }
  })
}

export async function isAdmin(userId: string, cookieHeader?: string | null): Promise<boolean> {
  return await getUserRole(userId, cookieHeader) === 'admin'
}

export async function isAuthor(userId: string, cookieHeader?: string | null): Promise<boolean> {
  const role = await getUserRole(userId, cookieHeader)
  return role === 'author' || role === 'admin'
}

export async function hasRole(userId: string, allowedRoles: UserRole[], cookieHeader?: string | null): Promise<boolean> {
  const role = await getUserRole(userId, cookieHeader)
  return allowedRoles.includes(role)
}
