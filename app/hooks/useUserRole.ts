import { useUser } from '@clerk/react-router'
import type { UserRole } from '~/types/roles'
import { useRoleSimulationStore } from '~/stores'

export function useUserRole() {
  const { user } = useUser()
  const actualRole = (user?.publicMetadata?.role as UserRole) || 'user'
  const { simulatedRole } = useRoleSimulationStore()

  // Use simulated role if active, otherwise use actual role
  const role = simulatedRole || actualRole

  return {
    role,
    actualRole, // Always expose the actual role for admin dashboard
    isSimulating: simulatedRole !== null,
    isAdmin: role === 'admin',
    isAuthor: role === 'author',
    isUser: role === 'user',
    isActuallyAdmin: actualRole === 'admin' // For showing admin dashboard
  }
}
