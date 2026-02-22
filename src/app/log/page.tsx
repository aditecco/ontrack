'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTaskStore } from '@/store/useTaskStore'
import { useTimeEntryStore } from '@/store/useTimeEntryStore'
import { formatDateTime, formatTime, parseTimeInput } from '@/lib/utils'
import { FileText, Trash2, Sparkles, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'
import { TaskDrawer } from '@/components/TaskDrawer'
import toast from 'react-hot-toast'

export default function LogPage() {
  const { tasks, fetchTasks } = useTaskStore()
  const { timeEntries, fetchTimeEntries, updateTimeEntry, deleteTimeEntry } = useTimeEntryStore()
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [editingTimeInput, setEditingTimeInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null)

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

  // Pagination calculations
  const totalPages = Math.ceil(enrichedEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEntries = enrichedEntries.slice(startIndex, endIndex)

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

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
            Complete history of all time entries ({enrichedEntries.length} total
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`})
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
                  {paginatedEntries.map((entry, index) => (
                    <tr 
                      key={entry.id}
                      className={index % 2 === 0 ? 'bg-background/50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/track?date=${entry.date}`}
                          className="hover:text-primary hover:underline transition-colors"
                          title="View this day in Track"
                        >
                          {entry.date}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setDrawerTaskId(entry.taskId)}
                          className="font-medium hover:text-primary hover:underline transition-colors text-left"
                          title="View task details"
                        >
                          {entry.taskName}
                        </button>
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

        {/* Pagination Controls */}
        {enrichedEntries.length > 0 && totalPages > 1 && (
          <motion.div
            className="flex items-center justify-between bg-card border border-border rounded-lg p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Items per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-muted-foreground ml-4">
                Showing {startIndex + 1}-{Math.min(endIndex, enrichedEntries.length)} of {enrichedEntries.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <motion.button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
                whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>

              {getPageNumbers().map((page, idx) => (
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <motion.button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`min-w-[40px] px-3 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-accent'
                    }`}
                    whileHover={currentPage !== page ? { scale: 1.05 } : {}}
                    whileTap={currentPage !== page ? { scale: 0.95 } : {}}
                  >
                    {page}
                  </motion.button>
                )
              ))}

              <motion.button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
                whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>

      <TaskDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} />
    </PageTransition>
  )
}
