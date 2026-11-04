import { userKey } from './profile'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
export const GOALS = ['Lose weight', 'Build muscle', 'Improve endurance', 'Maintain fitness']
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full body', 'Cardio']
export const COMMON_EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull-ups', 'Push-ups', 'Barbell Row', 'Lat Pulldown', 'Leg Press', 'Walking Lunges', 'Plank', 'Burpees', 'Jump Rope', 'Bicep Curl', 'Tricep Pushdown']

export const uid = () => Math.random().toString(36).slice(2, 9)
const emptyWeek = () => Object.fromEntries(DAYS.map((d) => [d, []]))

// Plans live in localStorage for now. TODO: load and save them through the Laravel API.
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
