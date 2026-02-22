import { useLocalStorage } from './useLocalStorage'
import {
  formatDate as _formatDate,
  formatDateTime as _formatDateTime,
  type DateFormat,
} from '@/lib/utils'

export function useDateFormat() {
  const [dateFormat, setDateFormat] = useLocalStorage<DateFormat>(
    'ontrack-date-format',
    'dd/mm/yyyy',
  )

  return {
    dateFormat,
    setDateFormat,
    formatDate: (date: Date | string) => _formatDate(date, dateFormat),
    formatDateTime: (date: Date | string) => _formatDateTime(date, dateFormat),
  }
}
