import { userKey } from './profile'


export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
export const GOALS = ['Lose weight', 'Build muscle', 'Improve endurance', 'Maintain fitness']
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full body', 'Cardio']

export const uid = () => Math.random().toString(36).slice(2, 9)
const emptyWeek = () => Object.fromEntries(DAYS.map((d) => [d, []]))

export function loadPlans() {
  try {
    const v = JSON.parse(localStorage.getItem(userKey('aivo_workouts')) ?? 'null')
    if (Array.isArray(v)) return v
  } catch { /* fall through to an empty list */ }
  return []
}
export const savePlans = (plans) => localStorage.setItem(userKey('aivo_workouts'), JSON.stringify(plans))
export const newPlan = ({ name, description = '', goal, level, minutes, weeks = 4 }) => ({
  id: uid(), name: name.trim(), description: description.trim(), goal, level, minutes: Number(minutes), weeks: Number(weeks) || 4, active: true, schedule: emptyWeek(),
})

export function normalizeWorkout(workout) {
  const schedule = emptyWeek()
  for (const item of workout.exercises ?? []) {
    const day = DAYS.includes(item.day) ? item.day : DAYS[0]
    schedule[day].push({
      id: item.workout_exercise_id,
      exerciseId: Number(item.exercise_id),
      name: item.name,
      sets: Number(item.sets) || 3,
      reps: item.reps ?? '10',
      muscle: item.muscle ?? item.catalog_muscle_group ?? MUSCLES[0],
      notes: item.notes ?? '',
      weight: item.weight ?? '',
      duration: item.duration ?? '',
      weightORduration: item.weightORduration ?? 'weight',
      rest_seconds: item.rest_seconds ?? '',
    })
  }

  const durationWeeks = Number.parseInt(workout.duration, 10)

  return {
    id: Number(workout.workout_id),
    name: workout.plan_name,
    description: workout.description ?? '',
    goal: workout.goal ?? '',
    level: workout.level ?? LEVELS[0],
    minutes: Number(workout.minutes_per_session) || 45,
    weeks: durationWeeks || 4,
    active: Boolean(workout.active ?? true),
    schedule,
  }
}

export function workoutBody(plan) {
  return {
    plan_name: plan.name,
    description: plan.description || null,
    goal: plan.goal || null,
    level: plan.level || null,
    minutes_per_session: String(plan.minutes),
    duration: `${planWeeks(plan)} weeks`,
    active: isActive(plan),
    // Custom exercises (typed in by the user) stay on this device. The server only gets catalog exercises.
    exercises: DAYS.flatMap((day) => (plan.schedule[day] ?? []).filter((exercise) => !exercise.custom && exercise.exerciseId != null).map((exercise, sortOrder) => ({
      day,
      exercise_id: exercise.exerciseId,
      sets: String(exercise.sets),
      reps: String(exercise.reps),
      weight: exercise.weight || null,
      duration: exercise.duration || null,
      rest_seconds: exercise.rest_seconds ? String(exercise.rest_seconds) : null,
      notes: exercise.notes || null,
      muscle: exercise.muscle || null,
      sort_order: sortOrder,
    }))),
  }
}

const GOAL_TEXT = {
  'Lose weight': 'Burn calories and lose fat with a steady routine.',
  'Build muscle': 'Build muscle and gain strength with a balanced routine.',
  'Improve endurance': 'Improve endurance and stamina over time.',
  'Maintain fitness': 'Stay active and keep your fitness steady.',
}
export const planDescription = (plan) => plan.description || GOAL_TEXT[plan.goal] || ''
export const planWeeks = (plan) => plan.weeks ?? 4
export const isActive = (plan) => plan.active !== false
export const dayCount = (plan) => DAYS.filter((d) => plan.schedule[d]?.length).length
export const exerciseCount = (plan) => DAYS.reduce((n, d) => n + (plan.schedule[d]?.length ?? 0), 0)

// "45 sec" -> 45, "2 min" -> 120, "10" -> null (a rep-based exercise, no countdown).
export function timedSeconds(reps) {
  const m = String(reps).match(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)\b/i)
  if (!m) return null
  const n = parseFloat(m[1])
  return Math.round(/^m/i.test(m[2]) ? n * 60 : n)
}

/* ---------- equipment: where and how the user trains ---------- */
export const EQUIPMENT = [
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'machine', label: 'Machines' },
  { id: 'cable', label: 'Cables' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'band', label: 'Bands' },
]
export const EQUIPMENT_IDS = EQUIPMENT.map((e) => e.id)
export const TRAIN_PLACES = [
  { id: 'home', title: 'At home', desc: 'Then tap the equipment you have', equipment: ['bodyweight'] },
  { id: 'gym', title: 'At the gym', desc: 'Machines, barbells, cables and more', equipment: EQUIPMENT_IDS },
]
const GYM_GEAR = ['barbell', 'machine', 'cable']
// Older saved plans only kept a list of equipment. This works out the place from it.
export const placeOf = (list) => ((list ?? []).some((t) => GYM_GEAR.includes(t)) ? 'gym' : 'home')
// Works with a plan (uses the saved place) or with just a list of equipment.
export const placeLabel = (planOrList) => {
  const place = Array.isArray(planOrList) ? placeOf(planOrList) : planOrList?.place ?? placeOf(planOrList?.equipment)
  return TRAIN_PLACES.find((p) => p.id === place)?.title ?? 'At the gym'
}
// What is saved for each plan: { place, equipment }. (Older versions saved only the equipment list.)
export const readPlanGear = (saved) => {
  if (Array.isArray(saved) && saved.length) return { place: placeOf(saved), equipment: saved }
  if (saved?.equipment?.length) return { place: saved.place ?? placeOf(saved.equipment), equipment: saved.equipment }
  return { place: undefined, equipment: EQUIPMENT_IDS }
}
export const equipmentLabel = (id) => EQUIPMENT.find((e) => e.id === id)?.label ?? id

// The catalog may or may not say what equipment an exercise needs. If it does we use it, otherwise we read it from the name.
const EXPLICIT = [
  ['dumbbell', /dumb+ell|\bdb\b|goblet|arnold/i],
  ['kettlebell', /kettlebell|\bkb\b/i],
  ['band', /\bbands?\b|banded|resistance/i],
  ['cable', /\bcable\b|face pull|pushdown|pulldown/i],
  ['machine', /\bmachine\b|leg press|leg extension|leg curl|pec deck|hack squat|smith|treadmill|elliptical|stair ?(climber|master)|stationary|spin bike|\bcycl|rowing|assisted|seated row|chest press/i],
  ['barbell', /barbell|ez[- ]?bar|t-bar|trap bar/i],
  ['barbell', /bench press|deadlift|back squat|front squat|overhead press|military press|bent[- ]?over row|power clean|snatch|good morning|hip thrust/i],
]
const tagOf = (s) => {
  const t = String(s).toLowerCase()
  if (/dumb/.test(t)) return 'dumbbell'
  if (/kettle/.test(t)) return 'kettlebell'
  if (/band/.test(t)) return 'band'
  if (/cable/.test(t)) return 'cable'
  if (/machine/.test(t)) return 'machine'
  if (/barbell|\bbar\b/.test(t)) return 'barbell'
  if (/body|none|no equip|mat/.test(t)) return 'bodyweight'
  return null
}
export function inferEquipment(name, raw) {
  const fromRaw = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(tagOf).filter(Boolean)
  if (fromRaw.length) return [...new Set(fromRaw)]
  const hit = EXPLICIT.find(([, re]) => re.test(name ?? ''))
  return [hit ? hit[0] : 'bodyweight']
}

const MUSCLE_RULES = [
  ['Full body', /thruster|\bclean\b|snatch|turkish|man ?maker|full[- ]body/i],
  ['Cardio', /\brun|jog|sprint|jump|burpee|climber|bike|cycl|rope|skipping|elliptical|treadmill|stair|high knees|skater|cardio|jacks?\b|rowing/i],
  ['Core', /plank|crunch|sit[- ]?up|twist|leg raise|\babs?\b|\bcore\b|dead bug|bird dog|v-up|hollow|flutter|bicycle/i],
  ['Shoulders', /shoulder|lateral|overhead|military|arnold|front raise|rear delt|upright|\bpike\b|handstand/i],
  ['Chest', /chest|bench|push[- ]?ups?|press[- ]?ups?|\bfly\b|\bflye|pec\b|pec deck/i],
  ['Back', /\brow\b|pull[- ]?up|chin[- ]?up|pulldown|\blat\b|\bback\b|deadlift|superman|face pull|shrug/i],
  ['Legs', /squat|lunge|leg (curl|extension|press)|step[- ]?up|wall sit/i],
  ['Arms', /curl|tricep|bicep|\bdips?\b|skull|hammer|kickback|pushdown/i],
  ['Legs', /leg|calf|glute|hip|bridge|thrust|hamstring|quad/i],
]
const splitMuscles = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[,/&;]| and /i)).map((t) => String(t).trim()).filter(Boolean)
const muscleFromText = (text) => {
  const exact = MUSCLES.find((m) => m.toLowerCase() === text.toLowerCase())
  return exact ?? MUSCLE_RULES.find(([, re]) => re.test(text))?.[0]
}
// Every muscle group an exercise trains: what the catalog says, plus what the name says.
// A push-up is Chest, and also Shoulders and Arms if the catalog lists those.
export function inferMuscles(name, raw) {
  const out = []
  const add = (m) => { if (m && !out.includes(m)) out.push(m) }
  splitMuscles(raw).forEach((t) => add(muscleFromText(t)))
  add(muscleFromText(String(name ?? '')))
  return out.length ? out : ['Full body']
}
export const inferMuscle = (name, raw) => inferMuscles(name, raw)[0]

// Exercises that are held or run for a length of time instead of counted in reps.
const TIMED_RE = /plank|\bhold\b|wall sit|dead hang|\bhang\b|stretch|l-sit|jump(ing)? rope|skipping|jumping jacks?|mountain climbers?|high knees|\brunning|\bjog|sprint|cycling|treadmill|elliptical|rowing machine|stair ?(climber|master)|shadow ?box|battle rope|bear crawl/i
export const isTimedExercise = (raw) => raw?.weightORduration === 'duration' || TIMED_RE.test(raw?.name ?? '')

// One normal shape for an exercise from the catalog (works with the raw API row or an already-normal one).
export function enrichExercise(raw) {
  const name = String(raw.name ?? '')
  const timed = isTimedExercise({ name, weightORduration: raw.weightORduration })
  const muscles = Array.isArray(raw.muscles) && raw.muscles.length
    ? raw.muscles
    : inferMuscles(name, raw.muscle_group ?? raw.muscle ?? raw.target_muscle ?? raw.catalog_muscle_group)
  return {
    id: raw.custom ? raw.id : Number(raw.exercise_id ?? raw.id),
    custom: Boolean(raw.custom),
    name,
    timed,
    weightORduration: timed ? 'duration' : 'weight',
    muscle: muscles[0],
    muscles,
    equipment: inferEquipment(name, raw.equipment ?? raw.equipment_type ?? raw.equipments),
    bestFor: raw.bestFor,
  }
}
export const exerciseFits = (ex, selected) => (ex.equipment ?? inferEquipment(ex.name)).every((t) => selected.includes(t))

/* ---------- timed exercises ---------- */
export const DURATION_CHIPS = [15, 20, 30, 45, 60, 90, 120, 180, 300]
export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0))
  if (s < 60) return `${s} sec`
  const m = Math.floor(s / 60), r = s % 60
  return r ? `${m} min ${r} sec` : `${m} min`
}
export const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// Seconds for a timed exercise, or null when it is counted in reps.
export function exerciseSeconds(e) {
  if (!e) return null
  const fromDuration = e.duration ? (timedSeconds(e.duration) ?? (Number(e.duration) > 0 ? Number(e.duration) : null)) : null
  if (fromDuration) return Math.round(fromDuration)
  const fromReps = timedSeconds(e.reps ?? '')
  if (fromReps) return fromReps
  return e.weightORduration === 'duration' ? 30 : null
}
export function exerciseTarget(e) {
  const seconds = exerciseSeconds(e)
  return seconds != null
    ? { timed: true, seconds, label: fmtDuration(seconds) }
    : { timed: false, seconds: null, label: `${e?.reps ?? 10} reps` }
}
export const exerciseLine = (e) => {
  const t = exerciseTarget(e)
  return `${e.sets} sets · ${t.label}${!t.timed && e.weight ? ` · ${e.weight}` : ''}`
}

/* ---------- equipment saved per plan (the server has no field for it, so it is kept on this device) ---------- */
const eqKey = () => userKey('aivo_workout_equipment')
export function loadEquipment() {
  try {
    const v = JSON.parse(localStorage.getItem(eqKey()) ?? 'null')
    if (v && typeof v === 'object' && !Array.isArray(v)) return v
  } catch { /* fall through */ }
  return {}
}
export const saveEquipment = (map) => { try { localStorage.setItem(eqKey(), JSON.stringify(map)) } catch { /* storage full or blocked */ } }
