import { useEffect, useMemo, useState } from 'react'
import { PROGRESS_EVENT, buildProgress, readAll } from './progress'

// Live progress for a given week (0 = this week, -1 = last week, ...).
// Re-computes whenever Workouts/Nutrition log something, even from another tab.
export default function useProgress(weekOffset = 0) {
  const [raw, setRaw] = useState(readAll)
  useEffect(() => {
    const refresh = () => setRaw(readAll())
    window.addEventListener(PROGRESS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return useMemo(() => buildProgress(raw, weekOffset), [raw, weekOffset])
}
