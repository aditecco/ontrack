import { create } from 'zustand'
import { db, type Task, type Tag, type TaskTag } from '@/lib/db'
import toast from 'react-hot-toast'

type TaskStore = {
  tasks: Task[]
  tags: Tag[]
  selectedTaskId: number | null
  isLoading: boolean
  fetchTasks: () => Promise<void>
  fetchTags: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, tagIds?: number[]) => Promise<number | undefined>
  updateTask: (id: number, task: Partial<Task>) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  setSelectedTask: (id: number | null) => void
  addTag: (name: string) => Promise<number | undefined>
  deleteTag: (id: number) => Promise<void>
  getTaskTags: (taskId: number) => Promise<Tag[]>
  setTaskTags: (taskId: number, tagIds: number[]) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  tags: [],
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

  fetchTags: async () => {
    try {
      const tags = await db.tags.orderBy('name').toArray()
      set({ tags })
    } catch (error) {
      toast.error('Failed to load tags')
      console.error(error)
    }
  },

  addTask: async (taskData, tagIds) => {
    try {
      const task: Task = {
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const taskId = await db.tasks.add(task)

      if (tagIds && tagIds.length > 0 && typeof taskId === 'number') {
        const taskTags = tagIds.map(tagId => ({ taskId, tagId }))
        await db.taskTags.bulkAdd(taskTags)
      }

      await get().fetchTasks()
      toast.success('Task created successfully')
      return taskId as number
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
      await db.taskTags.where('taskId').equals(id).delete()
      await db.tasks.delete(id)
      await get().fetchTasks()
      toast.success('Task deleted successfully')
    } catch (error) {
      toast.error('Failed to delete task')
      console.error(error)
    }
  },

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  addTag: async (name) => {
    try {
      const existingTag = await db.tags.where('name').equals(name).first()
      if (existingTag) {
        return existingTag.id
      }
      const tag: Tag = {
        name,
        createdAt: new Date(),
      }
      const tagId = await db.tags.add(tag)
      await get().fetchTags()
      return tagId as number
    } catch (error) {
      toast.error('Failed to create tag')
      console.error(error)
    }
  },

  deleteTag: async (id) => {
    try {
      await db.taskTags.where('tagId').equals(id).delete()
      await db.tags.delete(id)
      await get().fetchTags()
      toast.success('Tag deleted successfully')
    } catch (error) {
      toast.error('Failed to delete tag')
      console.error(error)
    }
  },

  getTaskTags: async (taskId) => {
    try {
      const taskTags = await db.taskTags.where('taskId').equals(taskId).toArray()
      const tagIds = taskTags.map(tt => tt.tagId)
      const tags = await db.tags.where('id').anyOf(tagIds).toArray()
      return tags
    } catch (error) {
      console.error('Failed to get task tags:', error)
      return []
    }
  },

  setTaskTags: async (taskId, tagIds) => {
    try {
      await db.taskTags.where('taskId').equals(taskId).delete()
      if (tagIds.length > 0) {
        const taskTags = tagIds.map(tagId => ({ taskId, tagId }))
        await db.taskTags.bulkAdd(taskTags)
      }
    } catch (error) {
      toast.error('Failed to update task tags')
      console.error(error)
    }
  },
}))
