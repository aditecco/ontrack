'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTaskStore } from '@/store/useTaskStore'
import { useTimeEntryStore } from '@/store/useTimeEntryStore'
import { getDateString, formatDate, parseTimeInput, formatTime } from '@/lib/utils'
import { X, Clock, Calendar, ChevronLeft, ChevronRight, Pencil, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'
import { TaskDrawer } from '@/components/TaskDrawer'
import { db } from '@/lib/db'
import toast from 'react-hot-toast'

type DailyEntry = {
  taskId: number
  taskName: string
  timeInput: string
  hours: number
  minutes: number
}

function TrackPageContent() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const { tasks, fetchTasks } = useTaskStore()
  const { addTimeEntry, updateTimeEntry, fetchTimeEntries, timeEntries } = useTimeEntryStore()
  const [currentDate, setCurrentDate] = useState(() => {
    if (dateParam) {
      const d = new Date(dateParam + 'T12:00:00')
      if (!isNaN(d.getTime())) return d
    }
    return new Date()
  })
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [useDecimal, setUseDecimal] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [dayNotes, setDayNotes] = useState('')
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [editingTimeInput, setEditingTimeInput] = useState('')
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null)

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSearchTerm('')
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const dateString = getDateString(currentDate)

  useEffect(() => {
    fetchTasks()
    fetchTimeEntries()
  }, [fetchTasks, fetchTimeEntries])

  // Load day notes when date changes
  useEffect(() => {
    async function loadDayNotes() {
      const existingNote = await db.dayNotes.where('date').equals(dateString).first()
      const content = existingNote?.notes || ''
      setDayNotes(content)
      setShowNotes(!!content.trim())
    }
    loadDayNotes()
  }, [dateString])

  // Auto-save day notes with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasContent = dayNotes.trim().length > 0
      if (hasContent) {
        const existingNote = await db.dayNotes.where('date').equals(dateString).first()
        if (existingNote) {
          await db.dayNotes.update(existingNote.id!, {
            notes: dayNotes,
            updatedAt: new Date(),
          })
        } else {
          await db.dayNotes.add({
            date: dateString,
            notes: dayNotes,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      } else {
        // Delete if notes are empty
        const existingNote = await db.dayNotes.where('date').equals(dateString).first()
        if (existingNote) {
          await db.dayNotes.delete(existingNote.id!)
        }
      }
      setShowNotes(hasContent)
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [dayNotes, dateString])

  const existingEntries = useMemo(() => {
    return timeEntries
      .filter(e => e.date === dateString)
      .map(e => {
        const task = tasks.find(t => t.id === e.taskId)
        return {
          ...e,
          taskName: task?.name || 'Unknown',
        }
      })
  }, [timeEntries, dateString, tasks])

  const filteredTasks = tasks
    .filter(t => t.status === 'active')
    .filter(t => 
      searchTerm.length === 0 || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchTerm.toLowerCase())
    )

  function handleAddEntry(task: { id: number; name: string }) {
    setDailyEntries([...dailyEntries, {
      taskId: task.id,
      taskName: task.name,
      timeInput: '',
      hours: 0,
      minutes: 0,
    }])
    setSearchTerm('')
    setShowSuggestions(false)
  }

  function handleTimeInputChange(index: number, value: string) {
    const newEntries = [...dailyEntries]
    newEntries[index].timeInput = value
    const parsed = parseTimeInput(value)
    if (parsed) {
      newEntries[index].hours = parsed.hours
      newEntries[index].minutes = parsed.minutes
    }
    setDailyEntries(newEntries)
  }

  function handleRemoveEntry(index: number) {
    setDailyEntries(dailyEntries.filter((_, i) => i !== index))
  }

  async function handleSaveAll() {
    const valid = dailyEntries.filter(e => e.hours > 0 || e.minutes > 0)
    if (valid.length === 0) return

    for (const entry of valid) {
      await addTimeEntry({
        taskId: entry.taskId,
        date: dateString,
        hours: entry.hours,
        minutes: entry.minutes,
      })
    }

    setDailyEntries([])
    await fetchTimeEntries()
  }

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

  const totalMinutes = dailyEntries.reduce((sum, e) => {
    return sum + (e.hours * 60 + e.minutes)
  }, 0) + existingEntries.reduce((sum, e) => {
    return sum + (e.hours * 60 + e.minutes)
  }, 0)

  const totalHours = Math.floor(totalMinutes / 60)
  const totalMins = totalMinutes % 60

  return (
    <PageTransition>
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-8 py-12 space-y-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">What are you working on?</h1>
              <p className="text-muted-foreground text-sm">{formatDate(currentDate)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUseDecimal(!useDecimal)}
                className="px-3 py-1.5 text-xs bg-accent rounded-md hover:bg-accent/80 transition-colors"
              >
                {useDecimal ? 'Decimal' : 'Standard'}
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setDate(newDate.getDate() - 1)
                    setCurrentDate(newDate)
                  }}
                  className="p-2 bg-accent hover:bg-accent/80 rounded-md transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-md">
                  <Calendar className="w-4 h-4 text-primary" />
                  <input
                    type="date"
                    value={dateString}
                    onChange={(e) => setCurrentDate(new Date(e.target.value))}
                    className="bg-transparent focus:outline-none text-sm font-medium w-32"
                  />
                </div>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setDate(newDate.getDate() + 1)
                    setCurrentDate(newDate)
                  }}
                  className="p-2 bg-accent hover:bg-accent/80 rounded-md transition-colors"
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-card border border-border rounded-lg shadow-sm p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="relative">
            <motion.input
              type="text"
              placeholder="Search for a task..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full px-4 py-3 text-base bg-background border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-all"
              whileFocus={{ scale: 1.01 }}
            />
            
            <AnimatePresence>
            {showSuggestions && filteredTasks.length > 0 && (
              <motion.div 
                className="absolute z-10 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {filteredTasks.map((task, index) => (
                  <motion.button
                    key={task.id}
                    onClick={() => handleAddEntry({ id: task.id!, name: task.name })}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-0 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="font-medium">{task.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{task.customer}</div>
                  </motion.button>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Options row under main input */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Add Notes</span>
              <div
                className="w-10 h-5 rounded-full relative cursor-pointer ring-1 ring-border bg-foreground/20"
                onClick={() => setShowNotes(!showNotes)}
                aria-label="Toggle day notes"
                role="switch"
                aria-checked={showNotes}
              >
                <motion.div
                  className="absolute top-0.5 w-4 h-4 bg-primary rounded-full shadow"
                  animate={{ left: showNotes ? '22px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="px-6 py-4 bg-accent/30 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Today&apos;s Entries</h3>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-bold">{formatTime(totalHours, totalMins, useDecimal)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">

            <AnimatePresence>
            {existingEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                className="flex items-center gap-3 p-3 bg-accent/30 border border-border rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setDrawerTaskId(entry.taskId)}
                    className="font-medium text-sm hover:text-primary hover:underline transition-colors text-left truncate w-full"
                    title="View task details"
                  >
                    {entry.taskName}
                  </button>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.notes}</p>
                  )}
                </div>
                {editingEntryId === entry.id ? (
                  <>
                    <input
                      type="text"
                      value={editingTimeInput}
                      onChange={(e) => setEditingTimeInput(e.target.value)}
                      className="w-48 px-3 py-2 text-base bg-background border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono font-semibold transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(entry.id!)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                    />
                    <motion.button
                      onClick={() => handleSaveEdit(entry.id!)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Save changes"
                    >
                      <Check className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={handleCancelEdit}
                      className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </>
                ) : (
                  <>
                    <div className="text-base font-bold font-mono">
                      {formatTime(entry.hours, entry.minutes, useDecimal)}
                    </div>
                    <motion.button
                      onClick={() => handleStartEdit(entry.id!, entry.hours, entry.minutes)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Edit time"
                    >
                      <Pencil className="w-4 h-4" />
                    </motion.button>
                  </>
                )}
              </motion.div>
            ))}
            </AnimatePresence>

            {dailyEntries.map((entry, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 p-3 border border-primary rounded-lg bg-primary/5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setDrawerTaskId(entry.taskId)}
                    className="font-medium text-sm hover:text-primary hover:underline transition-colors text-left truncate w-full"
                    title="View task details"
                  >
                    {entry.taskName}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="2:30 or 1,5"
                  value={entry.timeInput}
                  onChange={(e) => handleTimeInputChange(index, e.target.value)}
                  className="w-48 px-3 py-2 text-base bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono font-semibold transition-all"
                  autoFocus
                />
                <motion.button
                  onClick={() => handleRemoveEntry(index)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
          {dailyEntries.length > 0 && (
            <div className="p-6 pt-0">
              <motion.button
                onClick={handleSaveAll}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Save All Entries
              </motion.button>
            </div>
          )}
          </AnimatePresence>
        </motion.div>

        {/* Day notes under regular tracking - visible when switch is on */}
        {showNotes && (
          <motion.div 
            className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 py-4 bg-accent/30 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Day Notes</h3>
              </div>
            </div>
            <div className="p-6">
              <textarea
                placeholder="General notes for the day (tasks not in DB, observations, etc.)..."
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={4}
                autoFocus
              />
            </div>
          </motion.div>
        )}

        <motion.div 
          className="text-xs text-muted-foreground bg-accent/30 rounded-lg p-4 border border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="font-medium mb-2">Supported time formats:</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div>2:30 → 2h 30m</div>
            <div>1,5 → 1h 30m</div>
            <div>2h 30m → 2h 30m</div>
            <div>2h → 2h</div>
          </div>
        </motion.div>
      </div>
    </div>

      <TaskDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} />
    </PageTransition>
  )
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TrackPageContent />
    </Suspense>
  )
}
