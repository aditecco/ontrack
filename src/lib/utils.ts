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

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
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
