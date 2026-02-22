import { db, type Task, type TimeEntry, type DayNote, type ReportPreset, type ReportTemplate } from './db'
import { formatDate, formatTime, getDateString } from './utils'

export interface ReportData {
  dateRange: {
    from: string
    to: string
  }
  tasks: Array<{
    task: Task
    entries: TimeEntry[]
    totalHours: number
    totalMinutes: number
  }>
  dayNotes: DayNote[]
  totalHours: number
  totalMinutes: number
}

/**
 * Calculate the date range based on the preset
 */
export function calculateDateRange(preset: ReportPreset): { from: string; to: string } {
  const today = new Date()
  const to = preset.includeCurrentDay ? getDateString(today) : getDateString(new Date(today.getTime() - 24 * 60 * 60 * 1000))

  const fromDate = new Date(today)
  const daysToSubtract = preset.includeCurrentDay ? preset.daysBack : preset.daysBack + 1
  fromDate.setDate(today.getDate() - daysToSubtract)
  const from = getDateString(fromDate)

  return { from, to }
}

/**
 * Fetch all data needed for the report
 */
export async function fetchReportData(dateRange: { from: string; to: string }, includeDayNotes: boolean): Promise<ReportData> {
  // Fetch time entries in date range
  const allEntries = await db.timeEntries
    .where('date')
    .between(dateRange.from, dateRange.to, true, true)
    .toArray()

  // Group entries by task
  const taskEntriesMap = new Map<number, TimeEntry[]>()
  allEntries.forEach(entry => {
    if (!taskEntriesMap.has(entry.taskId)) {
      taskEntriesMap.set(entry.taskId, [])
    }
    taskEntriesMap.get(entry.taskId)!.push(entry)
  })

  // Fetch all tasks
  const taskIds = Array.from(taskEntriesMap.keys())
  const tasks = await db.tasks.where('id').anyOf(taskIds).toArray()

  // Calculate totals for each task
  const tasksWithTotals = tasks.map(task => {
    const entries = taskEntriesMap.get(task.id!) || []
    let totalMinutes = 0
    entries.forEach(entry => {
      totalMinutes += entry.hours * 60 + entry.minutes
    })
    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    return {
      task,
      entries,
      totalHours,
      totalMinutes: remainingMinutes,
    }
  })

  // Calculate overall totals
  let overallMinutes = 0
  allEntries.forEach(entry => {
    overallMinutes += entry.hours * 60 + entry.minutes
  })
  const overallHours = Math.floor(overallMinutes / 60)
  const overallRemainingMinutes = overallMinutes % 60

  // Fetch day notes if needed
  let dayNotes: DayNote[] = []
  if (includeDayNotes) {
    dayNotes = await db.dayNotes
      .where('date')
      .between(dateRange.from, dateRange.to, true, true)
      .toArray()
  }

  return {
    dateRange,
    tasks: tasksWithTotals,
    dayNotes,
    totalHours: overallHours,
    totalMinutes: overallRemainingMinutes,
  }
}

/**
 * Simple template engine for variable replacement
 */
export function processTemplate(template: string, data: ReportData): string {
  let content = template

  // Replace dateRange
  const dateRangeStr = `${formatDate(data.dateRange.from)} - ${formatDate(data.dateRange.to)}`
  content = content.replace(/{{dateRange}}/g, dateRangeStr)

  // Replace generatedDate
  const generatedDate = formatDate(new Date())
  content = content.replace(/{{generatedDate}}/g, generatedDate)

  // Replace summary
  const summaryStr = `Total time tracked: ${formatTime(data.totalHours, data.totalMinutes)}\nTasks worked on: ${data.tasks.length}`
  content = content.replace(/{{summary}}/g, summaryStr)

  // Replace tasks
  let tasksStr = ''
  if (data.tasks.length === 0) {
    tasksStr = '*No tasks recorded in this period*'
  } else {
    data.tasks.forEach(({ task, entries, totalHours, totalMinutes }) => {
      tasksStr += `### [${task.name}](/tasks?id=${task.id})\n`
      tasksStr += `- **Customer:** ${task.customer}\n`
      tasksStr += `- **Time spent:** ${formatTime(totalHours, totalMinutes)}\n`

      if (entries.length > 0) {
        tasksStr += `- **Entries:** ${entries.length}\n`
        entries.forEach(entry => {
          const entryTime = formatTime(entry.hours, entry.minutes)
          const entryDate = formatDate(entry.date)
          tasksStr += `  - ${entryDate}: ${entryTime}`
          if (entry.notes) {
            tasksStr += ` - ${entry.notes}`
          }
          tasksStr += '\n'
        })
      }
      tasksStr += '\n'
    })
  }
  content = content.replace(/{{tasks}}/g, tasksStr.trim())

  // Replace entriesByDate — chronological view: groups all entries by date, showing task info inline
  let entriesByDateStr = ''
  if (data.tasks.length === 0) {
    entriesByDateStr = '*No entries recorded in this period*'
  } else {
    // Collect all entries with their task info, then sort by date
    const allEntries: Array<{ date: string; taskName: string; taskId: number; customer: string; hours: number; minutes: number; notes?: string }> = []
    data.tasks.forEach(({ task, entries }) => {
      entries.forEach(entry => {
        allEntries.push({
          date: entry.date,
          taskName: task.name,
          taskId: task.id!,
          customer: task.customer,
          hours: entry.hours,
          minutes: entry.minutes,
          notes: entry.notes,
        })
      })
    })
    allEntries.sort((a, b) => a.date.localeCompare(b.date))

    // Group by date
    const byDate = new Map<string, typeof allEntries>()
    allEntries.forEach(entry => {
      if (!byDate.has(entry.date)) byDate.set(entry.date, [])
      byDate.get(entry.date)!.push(entry)
    })

    byDate.forEach((entries, date) => {
      entriesByDateStr += `### ${formatDate(date)}\n\n`
      entries.forEach(entry => {
        const time = formatTime(entry.hours, entry.minutes)
        entriesByDateStr += `- **[${entry.taskName}](/tasks?id=${entry.taskId})** (${entry.customer}): ${time}`
        if (entry.notes) {
          entriesByDateStr += ` — ${entry.notes}`
        }
        entriesByDateStr += '\n'
      })
      entriesByDateStr += '\n'
    })
  }
  content = content.replace(/{{entriesByDate}}/g, entriesByDateStr.trim())

  // Replace dayNotes (with conditional block support)
  if (data.dayNotes.length > 0) {
    let dayNotesStr = ''
    data.dayNotes.forEach(note => {
      dayNotesStr += `### ${formatDate(note.date)}\n\n${note.notes}\n\n`
    })
    // Remove the conditional block markers and keep the content
    content = content.replace(/{{#if dayNotes}}[\s\S]*?{{dayNotes}}[\s\S]*?{{\/if}}/g, (match) => {
      return match.replace(/{{#if dayNotes}}\n?/, '').replace(/{{\/if}}\n?/, '').replace(/{{dayNotes}}/g, dayNotesStr.trim())
    })
  } else {
    // Remove the entire conditional block if no day notes
    content = content.replace(/{{#if dayNotes}}[\s\S]*?{{\/if}}\n?/g, '')
  }

  return content.trim()
}

/**
 * Generate a complete report.
 * Pass `customDateRange` and `customIncludeDayNotes` to bypass preset date calculation.
 */
export async function generateReport(
  preset: ReportPreset | null,
  template: ReportTemplate,
  title?: string,
  customDateRange?: { from: string; to: string },
  customIncludeDayNotes?: boolean
): Promise<{ content: string; dateRange: { from: string; to: string } }> {
  const dateRange = customDateRange ?? calculateDateRange(preset!)
  const includeDayNotes = customIncludeDayNotes ?? preset?.includeDayNotes ?? false
  const data = await fetchReportData(dateRange, includeDayNotes)
  const content = processTemplate(template.content, data)

  return {
    content,
    dateRange,
  }
}
