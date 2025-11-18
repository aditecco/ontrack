import { create } from 'zustand'
import { db, type Task } from '@/lib/db'
import toast from 'react-hot-toast'

type TaskStore = {
  tasks: Task[]
  selectedTaskId: number | null
  isLoading: boolean
  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (id: number, task: Partial<Task>) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  setSelectedTask: (id: number | null) => void
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  isLoading: false,

  fetchTasks: async () => {
    set({ isLoading: true })
    try {
      const tasks = await db.tasks.orderBy('createdAt').reverse().toArray()
      set({ tasks })
    } catch (error) {
      toast.error('Failed to load tasks')
      console.error(error)
    } finally {
      set({ isLoading: false })
    }
  },

  addTask: async (taskData) => {
    try {
      const task: Task = {
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.tasks.add(task)
      await get().fetchTasks()
      toast.success('Task created successfully')
    } catch (error) {
      toast.error('Failed to create task')
      console.error(error)
    }
  },

  updateTask: async (id, taskData) => {
    try {
      await db.tasks.update(id, {
        ...taskData,
        updatedAt: new Date(),
      })
      await get().fetchTasks()
      toast.success('Task updated successfully')
    } catch (error) {
      toast.error('Failed to update task')
      console.error(error)
    }
  },

  deleteTask: async (id) => {
    try {
      await db.tasks.delete(id)
      await get().fetchTasks()
      toast.success('Task deleted successfully')
    } catch (error) {
      toast.error('Failed to delete task')
      console.error(error)
    }
  },

  setSelectedTask: (id) => set({ selectedTaskId: id }),
}))
