import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(hours: number, minutes: number, useDecimal = false): string {
  if (useDecimal) {
    const decimal = formatDecimalHours(hours, minutes)
    return `${decimal.toFixed(2).replace('.', ',')}h`
  }
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export function formatDecimalHours(hours: number, minutes: number): number {
  return Number((hours + minutes / 60).toFixed(2))
}

export function parseTimeInput(input: string): { hours: number; minutes: number } | null {
  const decimalPattern = /^(\d+)[,.](\d+)$/
  const decimalMatch = input.match(decimalPattern)
  if (decimalMatch) {
    const hours = parseInt(decimalMatch[1], 10)
    const decimal = parseFloat(`0.${decimalMatch[2]}`)
    const minutes = Math.round(decimal * 60)
    return { hours, minutes }
  }

  const patterns = [
    /^(\d+):(\d+)$/,
    /^(\d+)h\s*(\d+)m?$/i,
    /^(\d+)h$/i,
    /^(\d+)$/,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) {
      const hours = parseInt(match[1], 10)
      const minutes = match[2] ? parseInt(match[2], 10) : 0
      if (minutes < 60) {
        return { hours, minutes }
      }
    }
  }

  return null
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// ── Date formatting ────────────────────────────────────────────────────────────

export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY', example: '22/02/2026' },
  { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY', example: '02/22/2026' },
  { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD', example: '2026-02-22' },
]

/** Read the stored date format preference without React (for utils/generators). */
export function getStoredDateFormat(): DateFormat {
  if (typeof window === 'undefined') return 'dd/mm/yyyy'
  try {
    const stored = localStorage.getItem('ontrack-date-format')
    if (stored === 'dd/mm/yyyy' || stored === 'mm/dd/yyyy' || stored === 'yyyy-mm-dd') return stored
  } catch { /* ignore */ }
  return 'dd/mm/yyyy'
}

/** Parse an ISO date string safely (avoids UTC-midnight timezone shifts). */
function parseDate(date: Date | string): Date {
  if (typeof date === 'string') {
    // ISO date-only strings (YYYY-MM-DD) — anchor at noon to avoid timezone shifts
    return date.length === 10 ? new Date(date + 'T12:00:00') : new Date(date)
  }
  return date
}

export function formatDate(date: Date | string, format: DateFormat = 'dd/mm/yyyy'): string {
  const d = parseDate(date)
  if (format === 'yyyy-mm-dd') {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const locale = format === 'dd/mm/yyyy' ? 'it-IT' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string, format: DateFormat = 'dd/mm/yyyy'): string {
  const d = parseDate(date)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(d, format)}, ${hh}:${mm}`
}

export function getWeekDates(date: Date = new Date()): { start: Date; end: Date } {
  const current = new Date(date)
  const day = current.getDay()
  const diff = day === 0 ? -6 : 1 - day

  const start = new Date(current)
  start.setDate(current.getDate() + diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}
