import { create } from 'zustand'

interface UIStore {
  isSidebarOpen: boolean
  isMobileMenuOpen: boolean
  isLoading: boolean
  toggleSidebar: () => void
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
  setLoading: (loading: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: false,
  isMobileMenuOpen: false,
  isLoading: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
