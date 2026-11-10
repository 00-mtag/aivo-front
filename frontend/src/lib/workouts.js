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
    exercises: DAYS.flatMap((day) => (plan.schedule[day] ?? []).map((exercise, sortOrder) => ({
      day,
      exercise_id: exercise.exerciseId,
      sets: String(exercise.sets),
      reps: String(exercise.reps),
      weight: exercise.weight || null,
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
