import { DAYS, uid } from './workouts'

// Used only when someone opens the dashboard without finishing onboarding (e.g. /preview).
export const DEFAULT_PROFILE = { gender: 'Male', birthDate: '2000-01-01', heightCm: 170, weightKg: 70, goal: 'Build muscle', experience: 'Beginner' }

/* ---------- BMI ---------- */
export const BMI_SEGMENTS = [
  { label: 'Underweight', range: '< 18.5', color: '#3b82f6', pill: '#ffffff', lo: 15, hi: 18.5, message: 'Your BMI is below the healthy range.' },
  { label: 'Normal', range: '18.5 - 24.9', color: '#4caf50', pill: '#ffffff', lo: 18.5, hi: 25, message: 'Your BMI is within the healthy range.' },
  { label: 'Overweight', range: '25 - 29.9', color: '#f5b82e', pill: '#111111', lo: 25, hi: 30, message: 'Your BMI is above the healthy range.' },
  { label: 'Obese', range: '>30', color: '#ef4444', pill: '#ffffff', lo: 30, hi: 40, message: 'Your BMI is well above the healthy range.' },
]
export function bmiInfo(kg, m) {
  const bmi = kg / (m * m)
  const seg = bmi < 18.5 ? BMI_SEGMENTS[0] : bmi < 25 ? BMI_SEGMENTS[1] : bmi < 30 ? BMI_SEGMENTS[2] : BMI_SEGMENTS[3]
  return { bmi, category: seg.label, color: seg.color, pill: seg.pill, message: seg.message }
}

const CONDITION = {
  Underweight: 'Below the healthy range. Focus on strength and eating enough.',
  Normal: 'In the healthy range. Keep your routine steady.',
  Overweight: 'A bit above the healthy range. Regular training helps.',
  Obese: 'Well above the healthy range. Start gentle and build up.',
}
const FOCUS = {
  'Lose weight': 'Mix strength and cardio, and keep a small calorie deficit.',
  'Build muscle': 'Lift with progressive overload and eat enough protein.',
  'Improve endurance': 'Build up cardio time gradually and add some leg and core work.',
  'Maintain fitness': 'Stay consistent with balanced full-body sessions.',
}

/* ---------- Recommended workout, scaled by experience ---------- */
const LV = { Beginner: 0, Intermediate: 1, Advanced: 2 }
const t = (name, muscle, reps) => ({ name, muscle, reps })   // reps = [beginner, intermediate, advanced]
const WORKOUTS = {
  'Lose weight': { name: 'Fat Burn Circuit', met: 7, sets: [2, 3, 4], items: [
    t('Bodyweight Squats', 'Legs', ['12', '15', '20']), t('Push-ups', 'Chest', ['8', '12', '15']), t('Jump Rope', 'Cardio', ['30 sec', '45 sec', '60 sec']),
    t('Mountain Climbers', 'Core', ['20 sec', '30 sec', '40 sec']), t('Burpees', 'Full body', ['6', '10', '12']), t('Plank', 'Core', ['20 sec', '30 sec', '45 sec'])] },
  'Build muscle': { name: 'Full Body Strength', met: 5, sets: [3, 4, 4], items: [
    t('Squat', 'Legs', ['12', '10', '8']), t('Bench Press', 'Chest', ['12', '10', '8']), t('Barbell Row', 'Back', ['12', '10', '8']),
    t('Overhead Press', 'Shoulders', ['12', '10', '8']), t('Romanian Deadlift', 'Legs', ['12', '10', '8']), t('Plank', 'Core', ['30 sec', '45 sec', '60 sec'])] },
  'Improve endurance': { name: 'Endurance Builder', met: 7.5, sets: [2, 3, 4], items: [
    t('Rowing Machine', 'Cardio', ['3 min', '4 min', '5 min']), t('Walking Lunges', 'Legs', ['10', '14', '18']), t('Jump Rope', 'Cardio', ['45 sec', '60 sec', '90 sec']),
    t('Bodyweight Squats', 'Legs', ['15', '20', '25']), t('Plank', 'Core', ['30 sec', '45 sec', '60 sec'])] },
  'Maintain fitness': { name: 'Balanced Full Body', met: 5, sets: [2, 3, 3], items: [
    t('Goblet Squat', 'Legs', ['12', '12', '10']), t('Push-ups', 'Chest', ['10', '12', '15']), t('Seated Cable Row', 'Back', ['12', '12', '10']),
    t('Walking Lunges', 'Legs', ['10', '12', '14']), t('Plank', 'Core', ['30 sec', '40 sec', '50 sec'])] },
}
const MINUTES = [30, 45, 60]
const PER_WEEK = { 'Lose weight': [3, 4, 5], 'Build muscle': [3, 4, 5], 'Improve endurance': [3, 4, 5], 'Maintain fitness': [2, 3, 4] }
const SPREAD = { 2: ['Tue', 'Fri'], 3: ['Mon', 'Wed', 'Fri'], 4: ['Mon', 'Tue', 'Thu', 'Fri'], 5: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'] }

function ageOf(birthDate) {
  const b = new Date(birthDate), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return Number.isFinite(a) && a > 0 ? a : 25
}

// All numbers are rough estimates (Mifflin-St Jeor for calories) from the onboarding answers.
export function recommend(raw) {
  const p = { ...DEFAULT_PROFILE, ...Object.fromEntries(Object.entries(raw ?? {}).filter(([, v]) => v != null && v !== '')) }
  const goal = WORKOUTS[p.goal] ? p.goal : 'Maintain fitness'
  const lv = LV[p.experience] ?? 0
  const kg = Number(p.weightKg), cm = Number(p.heightCm)
  const info = bmiInfo(kg, cm / 100)
  const age = ageOf(p.birthDate)

  const bmr = 10 * kg + 6.25 * cm - 5 * age + (p.gender === 'Male' ? 5 : p.gender === 'Female' ? -161 : -78)
  const adjust = { 'Lose weight': -500, 'Build muscle': 300, 'Improve endurance': 100, 'Maintain fitness': 0 }[goal]
  const calories = Math.max(1200, Math.round((bmr * [1.375, 1.55, 1.725][lv] + adjust) / 10) * 10)
  const protein = Math.round(kg * { 'Lose weight': 1.6, 'Build muscle': 1.8, 'Improve endurance': 1.4, 'Maintain fitness': 1.2 }[goal])
  const waterL = Math.round(Math.min(4, Math.max(1.5, kg * 0.035)) * 10) / 10

  const perWeek = PER_WEEK[goal][lv]
  const w = WORKOUTS[goal]
  const minutes = MINUTES[lv]
  const workout = {
    name: w.name, minutes,
    kcal: Math.round(((w.met * 3.5 * kg) / 200) * minutes / 5) * 5,
    exercises: w.items.map((it) => ({ name: it.name, muscle: it.muscle, sets: w.sets[lv], reps: it.reps[lv] })),
  }

  let note = ''
  if (info.category === 'Underweight' && goal === 'Lose weight') note = 'Your BMI is already below the healthy range. Building muscle or maintaining fitness is usually a better goal.'
  else if (info.category === 'Obese') note = 'Start with low-impact moves and build up gradually. A doctor or coach can help you set a safe pace.'

  return {
    goal, level: p.experience ?? 'Beginner', age, weightKg: Math.round(kg * 10) / 10, heightCm: cm,
    bmi: info.bmi, category: info.category, color: info.color, condition: CONDITION[info.category],
    focus: FOCUS[goal], note, calories, protein, waterL, perWeek, days: SPREAD[perWeek], workout,
  }
}

// A real plan (same shape as the Workouts page) built from the recommendation.
export function buildPlanFromRec(rec) {
  const schedule = Object.fromEntries(DAYS.map((d) => [d, rec.days.includes(d)
    ? rec.workout.exercises.map((e) => ({ id: uid(), name: e.name, sets: e.sets, reps: e.reps, muscle: e.muscle, notes: '' }))
    : []]))
  return { id: uid(), name: rec.workout.name, goal: rec.goal, level: rec.level, minutes: rec.workout.minutes, schedule }
}

// What the user should do today: their own plan first, otherwise the recommendation.
export function todayFocus(plans, rec) {
  const today = DAYS[(new Date().getDay() + 6) % 7]
  const mine = plans.filter((p) => p.schedule[today]?.length)
  if (mine.length) {
    const n = mine.reduce((s, p) => s + p.schedule[today].length, 0)
    return { title: mine.map((p) => p.name).join(' + '), sub: `Scheduled in your plan · ${n} exercises` }
  }
  if (plans.length === 0 && rec.days.includes(today)) return { title: rec.workout.name, sub: `Recommended today · ${rec.workout.minutes} min. Add it to your plans below.` }
  if (plans.length === 0) return { title: 'Rest day', sub: 'Recover, stretch or take a light walk. Start your plan tomorrow.' }
  return { title: 'Nothing scheduled today', sub: 'Rest up, or add exercises to today in your workout plan.' }
}
