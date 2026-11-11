import { api } from './api'
import { dedupeMeals, normGoal, pickGoal } from './nutritionApi'
import { DEFAULT_TARGETS, dayIndex, readAll } from './progress'

const number = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
const dateKey = (value) => String(value ?? '').slice(0, 10)

function weightInKg(value) {
  const match = String(value ?? '').match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const amount = Number(match[0])
  return /\b(lb|lbs|pound|pounds)\b/i.test(String(value)) ? amount * 0.45359237 : amount
}

function mealEntries(meals, intakeRecords) {
  const intakeByMeal = new Map()
  for (const record of intakeRecords) {
    const mealId = Number(record.meal_id)
    intakeByMeal.set(mealId, (intakeByMeal.get(mealId) ?? 0) + number(record.calories_intake))
  }

  return dedupeMeals(meals.map((meal) => {
    const items = meal.items ?? []
    const itemTotal = (key) => items.reduce((total, item) => total + number(item[key]), 0)
    const mealId = Number(meal.meal_id)

    return {
      id: mealId,
      date: dateKey(meal.meal_date),
      type: meal.meal_type,
      name: items.map((item) => item.food_name).filter(Boolean).join(', ') || meal.meal_type,
      calories: intakeByMeal.has(mealId) ? intakeByMeal.get(mealId) : itemTotal('calories'),
      protein: itemTotal('protein'),
      carbs: itemTotal('carbohydrates'),
      fat: itemTotal('fat'),
    }
  }))
}

function activeWorkoutPlans(workouts) {
  const plansByDay = new Map()
  for (const workout of workouts) {
    if (workout.active === false || workout.active === 0 || workout.active === '0') continue
    for (const exercise of workout.exercises ?? []) {
      const day = dayIndex(exercise.day)
      if (day >= 0 && !plansByDay.has(day)) {
        plansByDay.set(day, { day, name: workout.plan_name ?? workout.name ?? 'Workout' })
      }
    }
  }
  return [...plansByDay.values()].sort((a, b) => a.day - b.day)
}

export async function fetchProgressData() {
  const profileRequest = api.get('/profile').catch((error) => {
    if (error.response?.status === 404) return { data: { profile: null } }
    throw error
  })
  const [progressResponse, workoutsResponse, mealsResponse, goalsResponse, profileResponse] = await Promise.all([
    api.get('/progress'),
    api.get('/workouts'),
    api.get('/nutrition/meals'),
    api.get('/nutrition/goals'),
    profileRequest,
  ])
  const progress = progressResponse.data
  const local = readAll()
  const profile = profileResponse.data.profile
  const goal = pickGoal((goalsResponse.data.nutrition_goals ?? []).map(normGoal))
  const activePlans = activeWorkoutPlans(workoutsResponse.data.workouts ?? [])
  const plannedDays = new Set(activePlans.map((plan) => plan.day))
  const currentWeight = weightInKg(profile?.weight)
  const weightLog = (progress.progress_records ?? [])
    .filter((record) => record.weight !== null && record.weight !== undefined)
    .map((record) => ({ date: dateKey(record.record_date), kg: number(record.weight) }))

  return {
    profile: {
      weightKg: weightLog.length ? null : currentWeight,
      targets: {
        calories: goal?.daily_calories || DEFAULT_TARGETS.calories,
        protein: goal?.daily_protein || DEFAULT_TARGETS.protein,
        water: local.profile?.targets?.water || DEFAULT_TARGETS.water,
        workoutsPerWeek: plannedDays.size || DEFAULT_TARGETS.workoutsPerWeek,
      },
    },
    workoutPlan: activePlans,
    workoutLog: (progress.workout_records ?? []).map((record) => ({
      id: Number(record.progress_workout_id),
      date: dateKey(record.created_at),
      name: record.workout_name || 'Workout',
      minutes: Math.round(number(record.workout_duration) / 60),
      exercisesDone: number(record.exercises_done),
      exercisesSkipped: number(record.exercises_skipped),
    })),
    calorieBurnLog: (progress.calorie_burned_records ?? []).map((record) => ({
      id: Number(record.calorie_burned_id),
      date: dateKey(record.created_at),
      calories: number(record.calories_burned),
      exerciseName: record.exercise_name,
    })),
    mealLog: mealEntries(mealsResponse.data.meals ?? [], progress.calorie_intake_records ?? []),
    waterLog: local.waterLog,
    weightLog,
  }
}
