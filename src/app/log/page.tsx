'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useTimeEntryStore } from '@/store/useTimeEntryStore'
import { formatDateTime, formatTime, parseTimeInput } from '@/lib/utils'
import { FileText, Trash2, Sparkles, Pencil, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'
import toast from 'react-hot-toast'

export default function LogPage() {
  const { tasks, fetchTasks } = useTaskStore()
  const { timeEntries, fetchTimeEntries, updateTimeEntry, deleteTimeEntry } = useTimeEntryStore()
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [editingTimeInput, setEditingTimeInput] = useState('')

  useEffect(() => {
    fetchTasks()
    fetchTimeEntries()
  }, [fetchTasks, fetchTimeEntries])

  function handleStartEdit(entryId: number, hours: number, minutes: number) {
    setEditingEntryId(entryId)
    setEditingTimeInput(formatTime(hours, minutes, false))
  }

  function handleCancelEdit() {
    setEditingEntryId(null)
    setEditingTimeInput('')
  }

  async function handleSaveEdit(entryId: number) {
    const parsed = parseTimeInput(editingTimeInput)
    if (!parsed) {
      toast.error('Invalid time format')
      return
    }

    await updateTimeEntry(entryId, {
      hours: parsed.hours,
      minutes: parsed.minutes,
    })

    setEditingEntryId(null)
    setEditingTimeInput('')
  }

  const enrichedEntries = useMemo(() => {
    return timeEntries.map(entry => {
      const task = tasks.find(t => t.id === entry.taskId)
      return {
        ...entry,
        taskName: task?.name || 'Unknown Task',
        customer: task?.customer || 'Unknown',
      }
    }).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [timeEntries, tasks])

  return (
    <PageTransition>
    <div className="h-full p-8 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold mb-2">Activity Log</h1>
          <p className="text-muted-foreground text-sm">
            Complete history of all time entries ({enrichedEntries.length} total)
          </p>
        </motion.div>

        {enrichedEntries.length === 0 ? (
          <motion.div 
            className="bg-card border border-border rounded-lg p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No time entries yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start tracking time to see your activity log
            </p>
          </motion.div>
        ) : (
          <motion.div 
            className="bg-card border border-border rounded-lg overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold">Date</th>
                    <th className="text-left px-6 py-4 font-semibold">Task</th>
                    <th className="text-left px-6 py-4 font-semibold">Customer</th>
                    <th className="text-right px-6 py-4 font-semibold">Time</th>
                    <th className="text-right px-6 py-4 font-semibold">Logged At</th>
                    <th className="text-right px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedEntries.map((entry, index) => (
                    <tr 
                      key={entry.id}
                      className={index % 2 === 0 ? 'bg-background/50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{entry.taskName}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {entry.customer}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingEntryId === entry.id ? (
                          <input
                            type="text"
                            value={editingTimeInput}
                            onChange={(e) => setEditingTimeInput(e.target.value)}
                            className="w-32 px-3 py-1.5 text-sm bg-background border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono font-bold transition-all"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(entry.id!)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                          />
                        ) : (
                          <div className="font-mono font-bold">
                            {formatTime(entry.hours, entry.minutes)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingEntryId === entry.id ? (
                            <>
                              <motion.button
                                onClick={() => handleSaveEdit(entry.id!)}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Save changes"
                              >
                                <Check className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                onClick={handleCancelEdit}
                                className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors inline-flex"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </motion.button>
                            </>
                          ) : (
                            <>
                              <motion.button
                                onClick={() => handleStartEdit(entry.id!, entry.hours, entry.minutes)}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Edit time"
                              >
                                <Pencil className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                onClick={() => {
                                  if (confirm('Delete this time entry?')) {
                                    deleteTimeEntry(entry.id!)
                                  }
                                }}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors inline-flex"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
    </PageTransition>
  )
}
