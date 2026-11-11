// Single source of truth for progress data.
// Workouts and Nutrition pages WRITE through the helpers below (logWorkout, logMeal, ...).
// The Progress page READS through useProgress(). Both stay in sync automatically.


const KEYS = {
  profile: 'aivo:profile',
  workoutPlan: 'aivo:workoutPlan',
  workoutLog: 'aivo:workoutLog',
  mealLog: 'aivo:mealLog',
  waterLog: 'aivo:waterLog',
  weightLog: 'aivo:weightLog',
}
export const PROGRESS_EVENT = 'aivo:progress-update'

// Same numbers your dashboard shows. Override with setTargets() after onboarding.
export const DEFAULT_TARGETS = { calories: 1960, protein: 134, water: 2.9, workoutsPerWeek: 3 }
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ---------- storage ---------- */
const read = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback } catch { return fallback }
}
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage full or blocked */ }
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const append = (key, entry) => { write(key, [...read(key, []), entry]); return entry }

export const readAll = () => ({
  profile: read(KEYS.profile, {}),
  workoutPlan: read(KEYS.workoutPlan, []),
  workoutLog: read(KEYS.workoutLog, []),
  mealLog: read(KEYS.mealLog, []),
  waterLog: read(KEYS.waterLog, []),
  weightLog: read(KEYS.weightLog, []),
})

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0')
export const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayKey = () => toKey(new Date())
const mondayOf = d => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/* ---------- write API (call these from Workouts / Nutrition pages) ---------- */
// logWorkout({ name: 'Full body A', minutes: 30, exercises: [{ name: 'Squats', sets: 3, reps: 12 }] })
export const logWorkout = ({ name, minutes = 0, exercises = [], date = todayKey() }) =>
  append(KEYS.workoutLog, { id: uid(), date, name, minutes: Number(minutes) || 0, exercises })

// logMeal({ type: 'Lunch', name: 'Chicken rice bowl', calories: 620, protein: 42 })
export const logMeal = ({ type = 'Meal', name, calories = 0, protein = 0, date = todayKey() }) =>
  append(KEYS.mealLog, { id: uid(), date, type, name, calories: Number(calories) || 0, protein: Number(protein) || 0 })

// logWater(0.25)  -> liters
export const logWater = (liters, date = todayKey()) =>
  append(KEYS.waterLog, { id: uid(), date, liters: Number(liters) || 0 })

export const logWeight = (kg, date = todayKey()) =>
  write(KEYS.weightLog, [...read(KEYS.weightLog, []).filter(w => w.date !== date), { date, kg: Number(kg) }])

// setWorkoutPlan([{ day: 0, name: 'Full body A' }, { day: 2, name: 'Cardio' }])  day: 0 = Mon ... 6 = Sun
export const setWorkoutPlan = plan => write(KEYS.workoutPlan, plan)

// setTargets({ calories: 1960, protein: 134, water: 2.9, workoutsPerWeek: 3 })
export const setTargets = targets =>
  write(KEYS.profile, { ...read(KEYS.profile, {}), targets: { ...DEFAULT_TARGETS, ...targets } })

export const removeEntry = (kind, id) => {
  const key = { workout: KEYS.workoutLog, meal: KEYS.mealLog, water: KEYS.waterLog }[kind]
  if (key) write(key, read(key, []).filter(e => e.id !== id))
}

export const clearProgress = () => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}

/* ---------- demo data for testing the UI ---------- */
export function seedDemo() {
  const now = new Date()
  const wd = (now.getDay() + 6) % 7
  const keyBack = n => { const d = new Date(now); d.setDate(now.getDate() - n); return toKey(d) }
  const workouts = [], meals = [], water = []
  for (let i = 0; i <= wd; i++) {
    const date = keyBack(wd - i)
    if (i % 2 === 0) workouts.push({ id: uid() + i, date, name: i === 2 ? 'Cardio + core' : 'Full body strength', minutes: 30 + i, exercises: [{ name: 'Squats', sets: 3, reps: 12 }, { name: 'Push-ups', sets: 3, reps: 10 }, { name: 'Plank', sets: 3, reps: 30 }] })
    meals.push(
      { id: uid() + 'a' + i, date, type: 'Breakfast', name: 'Oats with banana and eggs', calories: 480, protein: 28 },
      { id: uid() + 'b' + i, date, type: 'Lunch', name: 'Chicken adobo with rice', calories: 690 + i * 20, protein: 44 },
      { id: uid() + 'c' + i, date, type: 'Dinner', name: 'Grilled fish and vegetables', calories: 560, protein: 40 },
    )
    water.push({ id: uid() + 'w' + i, date, liters: 2.2 })
  }
  write(KEYS.workoutLog, workouts)
  write(KEYS.mealLog, meals)
  write(KEYS.waterLog, water)
  write(KEYS.workoutPlan, [{ day: 0, name: 'Full body' }, { day: 2, name: 'Cardio + core' }, { day: 4, name: 'Full body' }])
  write(KEYS.weightLog, [86.2, 85.6, 85.1, 84.7].map((kg, i) => ({ date: keyBack(21 - i * 7), kg })))
}
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.aivoSeedDemo = seedDemo   // run in the browser console to preview the UI
  window.aivoClear = clearProgress
}

/* ---------- derived progress ---------- */
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0)
const round1 = n => Math.round(n * 10) / 10

export function buildProgress(raw, weekOffset = 0) {
  const targets = { ...DEFAULT_TARGETS, ...(raw.profile?.targets || {}) }
  const today = todayKey()
  const start = mondayOf(new Date())
  start.setDate(start.getDate() + weekOffset * 7)

  const days = DAY_LABELS.map((label, i) => {
    const date = new Date(start); date.setDate(start.getDate() + i)
    const key = toKey(date)
    const workouts = raw.workoutLog.filter(w => w.date === key)
    const meals = raw.mealLog.filter(m => m.date === key)
    const plan = raw.workoutPlan.find(p => p.day === i)
    const isToday = key === today, isFuture = key > today
    return {
      key, label, shortDate: short(date), isToday, isFuture, plan,
      status: workouts.length ? 'done' : plan ? (isToday || isFuture ? 'todo' : 'missed') : 'rest',
      workouts, meals,
      minutes: sum(workouts, w => w.minutes),
      calories: sum(meals, m => m.calories),
      protein: sum(meals, m => m.protein),
      water: round1(sum(raw.waterLog.filter(w => w.date === key), w => w.liters)),
    }
  })

  const workoutsDone = sum(days, d => d.workouts.length)
  const foodDays = days.filter(d => d.meals.length)
  const waterDays = days.filter(d => d.water > 0)
  const avgCalories = foodDays.length ? Math.round(sum(foodDays, d => d.calories) / foodDays.length) : 0
  const avgProtein = foodDays.length ? Math.round(sum(foodDays, d => d.protein) / foodDays.length) : 0
  const avgWater = waterDays.length ? round1(sum(waterDays, d => d.water) / waterDays.length) : 0
  const todayDay = days.find(d => d.isToday)

  // streak = consecutive days (ending today or yesterday) with a workout or a meal logged
  const active = new Set([...raw.workoutLog, ...raw.mealLog].map(e => e.date))
  let streak = 0
  const cursor = new Date()
  if (!active.has(toKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (active.has(toKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }

  const weights = [...raw.weightLog].sort((a, b) => a.date.localeCompare(b.date))
  const startKg = weights[0]?.kg ?? raw.profile?.weightKg ?? null
  const nowKg = weights.length ? weights[weights.length - 1].kg : startKg
  const weight = { series: weights, start: startKg, now: nowKg, change: startKg != null ? round1(nowKg - startKg) : 0 }

  const hasData = raw.workoutLog.length + raw.mealLog.length + raw.waterLog.length + raw.weightLog.length > 0

  const insights = []
  if (!hasData) {
    insights.push({ tone: 'info', text: 'Log a workout or a meal and your progress will show up here.' })
  } else {
    const left = Math.max(targets.workoutsPerWeek - workoutsDone, 0)
    insights.push(left === 0
      ? { tone: 'good', text: 'You hit your weekly workout goal. Nice work.' }
      : { tone: 'info', text: `${left} more workout${left > 1 ? 's' : ''} to reach your goal of ${targets.workoutsPerWeek} this week.` })
    if (foodDays.length) {
      const diff = avgCalories - targets.calories
      if (Math.abs(diff) <= targets.calories * 0.1) insights.push({ tone: 'good', text: 'Your daily calories are right on target.' })
      else if (diff > 0) insights.push({ tone: 'warn', text: `You average ${diff.toLocaleString()} kcal over your daily target.` })
      else insights.push({ tone: 'info', text: `You average ${(-diff).toLocaleString()} kcal under your daily target.` })
      if (avgProtein < targets.protein * 0.8) insights.push({ tone: 'warn', text: `Protein is low at ${avgProtein} g a day. Your goal is ${targets.protein} g.` })
    }
    if (avgWater > 0 && avgWater < targets.water * 0.7) insights.push({ tone: 'warn', text: `You drink about ${avgWater} L a day. Aim for ${targets.water} L.` })
    if (streak >= 3) insights.push({ tone: 'good', text: `${streak}-day streak. Keep it going.` })
  }

  const badges = [
    { id: 'first', label: 'First workout', hint: 'Log any workout', earned: raw.workoutLog.length > 0 },
    { id: 'goal', label: 'Weekly goal', hint: `${targets.workoutsPerWeek} workouts in a week`, earned: workoutsDone >= targets.workoutsPerWeek },
    { id: 'protein', label: 'Protein day', hint: `Reach ${targets.protein} g in a day`, earned: days.some(d => d.protein >= targets.protein) },
    { id: 'streak3', label: '3-day streak', hint: 'Log 3 days in a row', earned: streak >= 3 },
    { id: 'streak7', label: '7-day streak', hint: 'Log 7 days in a row', earned: streak >= 7 },
  ]

  return {
    targets, days, hasData, insights, badges, weight, streak, weekOffset,
    range: `${short(start)} – ${short(days[6].date)}`,
    today: todayDay || null,
    totals: {
      workoutsDone, minutes: sum(days, d => d.minutes), avgCalories, avgProtein, avgWater,
      foodDays: foodDays.length, mealsLogged: sum(days, d => d.meals.length),
    },
  }
}
