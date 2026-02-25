import { useLocalStorage } from './useLocalStorage'

export function useWeeklyCapacity() {
  const [weeklyCapacity, setWeeklyCapacity] = useLocalStorage<number>(
    'ontrack-weekly-capacity',
    40,
  )

  return { weeklyCapacity, setWeeklyCapacity }
}
