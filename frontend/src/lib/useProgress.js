import { useCallback, useEffect, useMemo, useState } from 'react'
import { PROGRESS_EVENT, buildProgress, readAll } from './progress'
import { fetchProgressData } from './progressApi'

export default function useProgress(weekOffset = 0, localOnly = false) {
  const [raw, setRaw] = useState(readAll)
  const [status, setStatus] = useState(localOnly ? 'ready' : 'loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadId, setReloadId] = useState(0)
  const reload = useCallback(() => setReloadId((id) => id + 1), [])

  useEffect(() => {
    let active = true
    const refresh = async () => {
      if (localOnly) {
        setRaw(readAll())
        setStatus('ready')
        setErrorMessage('')
        return
      }
      setStatus('loading')
      setErrorMessage('')
      try {
        const data = await fetchProgressData()
        if (active) {
          setRaw(data)
          setStatus('ready')
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error.message || 'The progress data could not be loaded.')
          setStatus('error')
        }
      }
    }
    void refresh()
    window.addEventListener(PROGRESS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      active = false
      window.removeEventListener(PROGRESS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [localOnly, reloadId])

  return useMemo(() => ({
    ...buildProgress(raw, weekOffset),
    status,
    loading: status === 'loading',
    error: Boolean(errorMessage),
    errorMessage,
    reload,
  }), [raw, weekOffset, status, errorMessage, reload])
}
