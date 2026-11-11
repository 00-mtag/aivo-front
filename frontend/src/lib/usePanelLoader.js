import { useCallback, useState } from 'react'

const PREFIX = 'aivo_loaded:'

const seen = (key) => {
  try { return sessionStorage.getItem(PREFIX + key) === '1' } catch { return false }
}

/** Mark a panel as already loaded this session (so it does not show the loader twice in a row). */
export function markPanelLoaded(key) {
  try { sessionStorage.setItem(PREFIX + key, '1') } catch { /* storage unavailable */ }
}

/** Call on logout so the loaders play again on the next sign-in. */
export function resetPanelLoaders() {
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => sessionStorage.removeItem(k))
  } catch { /* storage unavailable */ }
}

/**
 * Shows the loading screen the first time a panel is opened in a session.
 * Usage: const [loading, finish] = usePanelLoader('dashboard')
 *        {loading && <LoadingScreen onDone={finish} />}
 */
export default function usePanelLoader(key) {
  const [loading, setLoading] = useState(() => !seen(key))
  const finish = useCallback(() => { markPanelLoaded(key); setLoading(false) }, [key])
  return [loading, finish]
}
