import { create } from 'zustand'
import type { UserRole } from '~/types/roles'

interface RoleSimulationStore {
  simulatedRole: UserRole | null
  setSimulatedRole: (role: UserRole | null) => void
  clearSimulation: () => void
}

export const useRoleSimulationStore = create<RoleSimulationStore>((set) => ({
  simulatedRole: null,
  setSimulatedRole: (role) => set({ simulatedRole: role }),
  clearSimulation: () => set({ simulatedRole: null }),
}))
