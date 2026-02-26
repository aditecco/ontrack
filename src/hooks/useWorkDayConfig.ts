import { useLocalStorage } from './useLocalStorage'

export interface WorkDayConfig {
  dayStartHour: number   // e.g. 9 (9am)
  lunchHour: number      // e.g. 12 (noon; 1h break assumed)
}

const DEFAULT_CONFIG: WorkDayConfig = {
  dayStartHour: 9,
  lunchHour: 12,
}

export function useWorkDayConfig() {
  const [config, setConfig] = useLocalStorage<WorkDayConfig>(
    'ontrack-workday-config',
    DEFAULT_CONFIG,
  )

  function updateConfig(partial: Partial<WorkDayConfig>) {
    setConfig({ ...config, ...partial })
  }

  return { config, updateConfig }
}
