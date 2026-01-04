import { create } from 'zustand'

export interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  coordinates?: {
    lat: number
    lng: number
  }
  imageUrl?: string
  categories?: string[]
  cost?: string
  times?: string
  address?: string
  url?: string
  region?: string
  recurrence?: string
  endDate?: string
  city?: string
  createdBy: string
  createdByName?: string
}

interface EventStore {
  events: Event[]
  selectedEvent: Event | null
  setEvents: (events: Event[]) => void
  addEvent: (event: Event) => void
  selectEvent: (event: Event | null) => void
  clearEvents: () => void
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  selectedEvent: null,
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  selectEvent: (event) => set({ selectedEvent: event }),
  clearEvents: () => set({ events: [], selectedEvent: null }),
}))
