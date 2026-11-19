// A small data cache that sits on top of your axios `api`.
//
//  - Load once: the first visit fetches, later visits show the saved copy instantly.
//  - Quiet refresh: if the copy is older than `staleTime`, it is refreshed in the background.
//  - No duplicates: identical requests made at the same time share ONE network call.
//  - Safe: saved per user, kept in the tab's sessionStorage (so a page refresh is instant too),
//    and every change you save (POST / PUT / DELETE) marks everything for a refresh.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

export const STALE = { lists: 60_000, catalog: 10 * 60_000 }   // how long a copy counts as fresh

const PREFIX = 'aivo_cache_v1:'
const mem = new Map()        // key -> { data, at }
const inflight = new Map()   // key -> Promise
const subs = new Map()       // key -> Set of listeners

const who = () => {
  try {
    const u = JSON.parse(localStorage.getItem('aivo_user') ?? 'null')
    return String(u?.id ?? u?.user_id ?? u?.username ?? u?.email ?? 'anon')
  } catch { return 'anon' }
}
const stable = (params) => (params ? JSON.stringify(Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))) : '')
const keyOf = (url, params) => `${who()}|${url}|${stable(params)}`

function read(key) {
  if (mem.has(key)) return mem.get(key)
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw) { const entry = JSON.parse(raw); mem.set(key, entry); return entry }
  } catch { /* storage blocked or corrupt */ }
  return undefined
}
function write(key, data, at = Date.now()) {
  const entry = { data, at }
  mem.set(key, entry)
  try {
    const text = JSON.stringify(entry)
    if (text.length < 250_000) sessionStorage.setItem(PREFIX + key, text)
  } catch { /* storage full or blocked */ }
  subs.get(key)?.forEach((fn) => fn(entry))
  return entry
}
const subscribe = (key, fn) => {
  if (!subs.has(key)) subs.set(key, new Set())
  subs.get(key).add(fn)
  return () => subs.get(key)?.delete(fn)
}

// One network call per key at a time.
function fetchFresh(url, params, key) {
  if (inflight.has(key)) return inflight.get(key)
  const request = api.get(url, params ? { params } : undefined)
    .then(({ data }) => { write(key, data); return data })
    .finally(() => inflight.delete(key))
  inflight.set(key, request)
  return request
}

/** What we already have, without any request: { data, at } or undefined.  peek('/exercises', { params }) */
export const peek = (url, { params } = {}) => read(keyOf(url, params))

/** Data from the cache if it is fresh, otherwise from the network. `force` always asks the server. */
export async function cachedGet(url, { params, staleTime = STALE.lists, force = false } = {}) {
  const key = keyOf(url, params)
  const hit = read(key)
  if (hit && !force && Date.now() - hit.at < staleTime) return hit.data
  return fetchFresh(url, params, key)
}

/** Warm the cache ahead of time (errors are ignored). */
export const prefetch = (url, opts) => cachedGet(url, opts).catch(() => {})

/** Update a saved copy after you change something, so the next visit is already correct. */
export function patchCache(url, updater, { params } = {}) {
  const key = keyOf(url, params)
  const hit = read(key)
  if (hit) write(key, updater(hit.data))
}

/** Mark every saved copy as old: still shown instantly, but refreshed on the next visit. */
export function markStale() {
  for (const [key, entry] of mem) mem.set(key, { ...entry, at: 0 })
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(PREFIX)) {
        const entry = JSON.parse(sessionStorage.getItem(k))
        sessionStorage.setItem(k, JSON.stringify({ ...entry, at: 0 }))
      }
    }
  } catch { /* ignore */ }
}

/** Forget everything. Call this when the user logs out. */
export function clearCache() {
  mem.clear()
  inflight.clear()
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => sessionStorage.removeItem(k))
  } catch { /* ignore */ }
}

// Any successful save (POST / PUT / PATCH / DELETE) marks the cache stale, so nothing old lingers.
if (api?.interceptors?.response?.use && !api.__aivoCacheInstalled) {
  api.__aivoCacheInstalled = true
  api.interceptors.response.use((response) => {
    const method = String(response?.config?.method ?? 'get').toLowerCase()
    if (method !== 'get') markStale()
    return response
  })
}

/**
 * React hook: instant data from the cache, quiet refresh when old.
 *   const { data, loading, refreshing, error, reload } = useCachedGet('/workouts')
 * `loading` is true only when there is nothing to show yet.
 */
export function useCachedGet(url, { params, staleTime = STALE.lists, enabled = true } = {}) {
  const paramsKey = stable(params)
  const [state, setState] = useState(() => {
    const hit = enabled && url ? read(keyOf(url, params)) : undefined
    return { data: hit?.data, loading: Boolean(enabled && url && !hit), refreshing: false, error: null }
  })
  const live = useRef({ url, params })
  live.current = { url, params }

  useEffect(() => {
    if (!enabled || !url) { setState({ data: undefined, loading: false, refreshing: false, error: null }); return undefined }
    const key = keyOf(url, params)
    let alive = true
    const hit = read(key)
    setState({ data: hit?.data, loading: !hit, refreshing: false, error: null })
    const off = subscribe(key, (entry) => alive && setState((s) => ({ ...s, data: entry.data, loading: false })))
    if (!hit || Date.now() - hit.at >= staleTime) {
      if (hit) setState((s) => ({ ...s, refreshing: true }))
      fetchFresh(url, params, key)
        .then(() => alive && setState((s) => ({ ...s, loading: false, refreshing: false, error: null })))
        .catch((error) => alive && setState((s) => ({ ...s, loading: false, refreshing: false, error })))
    }
    return () => { alive = false; off() }
  }, [url, paramsKey, enabled, staleTime]) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => {
    const { url: u, params: p } = live.current
    if (!u) return Promise.resolve()
    setState((s) => ({ ...s, loading: s.data === undefined, refreshing: s.data !== undefined, error: null }))
    return fetchFresh(u, p, keyOf(u, p))
      .then(() => setState((s) => ({ ...s, loading: false, refreshing: false })))
      .catch((error) => setState((s) => ({ ...s, loading: false, refreshing: false, error })))
  }, [])

  return { ...state, reload }
}
