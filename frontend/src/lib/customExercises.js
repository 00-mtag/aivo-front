// Exercises the user typed in themselves (not in the server's catalog).
//
// Your server only knows exercises that already exist in its catalog, so custom exercises are kept on this
// device: a "library" of the exercises the user created, and a "placement" list of where each one sits in a plan.
// They are shown and run like any other exercise. They are never sent in the workout the server saves.
import { userKey } from './profile'
import { DAYS } from './workouts'

const read = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback } catch { return fallback }
}
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage full or blocked */ } }
const libKey = () => userKey('aivo_custom_exercises')
const placeKey = () => userKey('aivo_custom_in_plans')
export const newCustomId = () => `c_${Math.random().toString(36).slice(2, 9)}`

/* ---------- the user's own exercise library ---------- */
export function loadLibrary() {
  const list = read(libKey(), [])
  return Array.isArray(list) ? list : []
}

// Create or update. The same name (ignoring capitals) always means the same exercise.
export function saveToLibrary({ id, name, muscles, equipment, timed }) {
  const list = loadLibrary()
  const clean = String(name).trim()
  const at = list.findIndex((e) => e.id === id || e.name.toLowerCase() === clean.toLowerCase())
  const entry = {
    id: at >= 0 ? list[at].id : (id ?? newCustomId()),
    name: clean,
    muscles,
    equipment,
    timed: Boolean(timed),
    createdAt: at >= 0 ? list[at].createdAt : Date.now(),
  }
  write(libKey(), at >= 0 ? list.map((e, i) => (i === at ? entry : e)) : [entry, ...list])
  return entry
}
export const removeFromLibrary = (id) => write(libKey(), loadLibrary().filter((e) => e.id !== id))

// The library in the same shape as the server's catalog, so the picker can list both together.
export const libraryAsCatalog = () => loadLibrary().map((e) => ({
  id: e.id,
  custom: true,
  name: e.name,
  timed: e.timed,
  weightORduration: e.timed ? 'duration' : 'weight',
  muscle: e.muscles[0],
  muscles: e.muscles,
  equipment: e.equipment,
}))

/* ---------- where custom exercises sit inside each plan ---------- */
const placements = () => {
  const v = read(placeKey(), {})
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

// The custom exercises found in a schedule, by day.
export function customOf(schedule) {
  const out = {}
  for (const day of DAYS) {
    const items = (schedule?.[day] ?? []).filter((e) => e.custom)
    if (items.length) out[day] = items
  }
  return out
}
export function saveCustomForPlan(planId, schedule) {
  const all = placements()
  const mine = customOf(schedule)
  if (Object.keys(mine).length) all[planId] = mine; else delete all[planId]
  write(placeKey(), all)
}
export function removeCustomForPlan(planId) {
  const all = placements()
  delete all[planId]
  write(placeKey(), all)
}
// Copy one plan's custom exercises to another plan (used by "Duplicate plan").
export function cloneCustomForPlan(fromId, toId) {
  const from = placements()[fromId]
  if (!from) return
  const all = placements()
  all[toId] = Object.fromEntries(Object.entries(from).map(([day, items]) => [day, items.map((e) => ({ ...e, id: newCustomId() }))]))
  write(placeKey(), all)
}
// A plan from the server plus the custom exercises saved for it. Safe to call more than once.
export function mergeCustom(plan) {
  const stored = placements()[plan.id] ?? {}
  return {
    ...plan,
    schedule: Object.fromEntries(DAYS.map((d) => [d, [...(plan.schedule?.[d] ?? []).filter((e) => !e.custom), ...(stored[d] ?? [])]])),
  }
}

/* ---------- rough calories for custom exercises (the server cannot calculate these) ---------- */
// MET = how hard the activity is compared with sitting still. kcal = MET x 3.5 x kg / 200 x minutes.
export function metFor(exercise) {
  const muscles = exercise.muscles ?? [exercise.muscle]
  const gear = exercise.equipment ?? []
  if (muscles.includes('Cardio')) return 8
  if (muscles.includes('Full body')) return 6
  if (muscles.includes('Core') && exercise.weightORduration === 'duration') return 3.8
  if (gear.some((g) => ['barbell', 'machine', 'cable', 'dumbbell', 'kettlebell'].includes(g))) return 5
  if (gear.includes('band')) return 3.8
  return 4.5
}
export function estimateKcal(exercise, seconds, kg = 70) {
  const minutes = Math.max(0, Number(seconds) || 0) / 60
  return Math.round(metFor(exercise) * 3.5 * (Number(kg) || 70) / 200 * minutes)
}
