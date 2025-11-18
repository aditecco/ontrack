import { create } from 'zustand'
import { db, type TimeEntry } from '@/lib/db'
import toast from 'react-hot-toast'

type TimeEntryStore = {
  timeEntries: TimeEntry[]
  isLoading: boolean
  fetchTimeEntries: () => Promise<void>
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => Promise<void>
  deleteTimeEntry: (id: number) => Promise<void>
  getEntriesByTask: (taskId: number) => TimeEntry[]
  getEntriesByDate: (date: string) => TimeEntry[]
}

export const useTimeEntryStore = create<TimeEntryStore>((set, get) => ({
  timeEntries: [],
  isLoading: false,

  fetchTimeEntries: async () => {
    set({ isLoading: true })
    try {
      const entries = await db.timeEntries.orderBy('createdAt').reverse().toArray()
      set({ timeEntries: entries })
    } catch (error) {
      toast.error('Failed to load time entries')
      console.error(error)
    } finally {
      set({ isLoading: false })
    }
  },

  addTimeEntry: async (entryData) => {
    try {
      const entry: TimeEntry = {
        ...entryData,
        createdAt: new Date(),
      }
      await db.timeEntries.add(entry)
      await get().fetchTimeEntries()
      toast.success('Time entry added successfully')
    } catch (error) {
      toast.error('Failed to add time entry')
      console.error(error)
    }
  },

  deleteTimeEntry: async (id) => {
    try {
      await db.timeEntries.delete(id)
      await get().fetchTimeEntries()
      toast.success('Time entry deleted')
    } catch (error) {
      toast.error('Failed to delete time entry')
      console.error(error)
    }
  },

  getEntriesByTask: (taskId) => {
    return get().timeEntries.filter((entry) => entry.taskId === taskId)
  },

  getEntriesByDate: (date) => {
    return get().timeEntries.filter((entry) => entry.date === date)
  },
}))
