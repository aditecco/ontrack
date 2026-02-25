import { create } from 'zustand'
import { db, type PlanTask } from '@/lib/db'
import toast from 'react-hot-toast'

type PlanStore = {
  planTasks: PlanTask[]
  isLoading: boolean
  fetchPlanTasks: () => Promise<void>
  addPlanTask: (taskId: number) => Promise<void>
  removePlanTask: (id: number) => Promise<void>
  reorderPlanTasks: (orderedIds: number[]) => Promise<void>
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  planTasks: [],
  isLoading: false,

  fetchPlanTasks: async () => {
    set({ isLoading: true })
    try {
      const planTasks = await db.planTasks.orderBy('order').toArray()
      set({ planTasks })
    } catch (error) {
      toast.error('Failed to load plan')
      console.error(error)
    } finally {
      set({ isLoading: false })
    }
  },

  addPlanTask: async (taskId) => {
    try {
      const existing = await db.planTasks.where('taskId').equals(taskId).first()
      if (existing) {
        toast.error('Task is already in the plan')
        return
      }
      const all = await db.planTasks.toArray()
      const maxOrder = all.length > 0 ? Math.max(...all.map((p) => p.order)) : -1
      await db.planTasks.add({ taskId, order: maxOrder + 1, addedAt: new Date() })
      await get().fetchPlanTasks()
    } catch (error) {
      toast.error('Failed to add task to plan')
      console.error(error)
    }
  },

  removePlanTask: async (id) => {
    try {
      await db.planTasks.delete(id)
      await get().fetchPlanTasks()
    } catch (error) {
      toast.error('Failed to remove task from plan')
      console.error(error)
    }
  },

  reorderPlanTasks: async (orderedIds) => {
    try {
      await db.transaction('rw', db.planTasks, async () => {
        for (let i = 0; i < orderedIds.length; i++) {
          await db.planTasks.update(orderedIds[i], { order: i })
        }
      })
      await get().fetchPlanTasks()
    } catch (error) {
      toast.error('Failed to reorder plan')
      console.error(error)
    }
  },
}))
