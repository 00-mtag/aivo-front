import { dedupeMeals, normGoal, pickGoal } from './nutritionApi'
import { DEFAULT_TARGETS, dayIndex, readAll } from './progress'
import { cachedGet } from './cache'

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

  return dedupeMeals(meals.filter((meal) => intakeByMeal.has(Number(meal.meal_id)))).map((meal) => {
    const items = meal.items ?? []
    const itemTotal = (key) => items.reduce((total, item) => total + number(item[key]), 0)
    const mealId = Number(meal.meal_id)

    return {
      id: mealId,
      date: dateKey(meal.meal_date),
      type: meal.meal_type,
      name: items.map((item) => item.food_name).filter(Boolean).join(', ') || meal.meal_type,
      calories: intakeByMeal.get(mealId),
      protein: itemTotal('protein'),
      carbs: itemTotal('carbohydrates'),
      fat: itemTotal('fat'),
    }
  })
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

// Everything goes through the cache (cache.js): data that is already saved is reused, identical
// requests are shared, and only a few run at a time. Only /progress is essential. If one of the
// others fails, the page still opens with what loaded and lists what is missing in `warnings`.
export async function fetchProgressData({ force = false } = {}) {
  const get = (url) => cachedGet(url, { force })

  const [progressResult, workoutsResult, mealsResult, goalsResult] = await Promise.allSettled([
    get('/progress'),
    get('/workouts'),
    get('/nutrition/meals'),
    get('/nutrition/goals'),
  ])
  if (progressResult.status === 'rejected') throw progressResult.reason

  const warnings = []
  const valueOf = (result, label, fallback) => {
    if (result.status === 'fulfilled') return result.value
    warnings.push(label)
    return fallback
  }
  const progress = progressResult.value
  const workouts = valueOf(workoutsResult, 'workout plans', { workouts: [] })
  const meals = valueOf(mealsResult, 'meals', { meals: [] })
  const goals = valueOf(goalsResult, 'nutrition goals', { nutrition_goals: [] })

  const weightLog = (progress.progress_records ?? [])
    .filter((record) => record.weight !== null && record.weight !== undefined)
    .map((record) => ({ date: dateKey(record.record_date), kg: number(record.weight) }))

  // The profile is only needed for a starting weight when there are no weight records yet.
  let profile = null
  if (!weightLog.length) {
    try {
      profile = (await get('/profile')).profile
    } catch (error) {
      if (error.response?.status !== 404) warnings.push('profile')
    }
  }

  const local = readAll()
  const goal = pickGoal((goals.nutrition_goals ?? []).map(normGoal))
  const activePlans = activeWorkoutPlans(workouts.workouts ?? [])
  const plannedDays = new Set(activePlans.map((plan) => plan.day))
  const currentWeight = weightInKg(profile?.weight)

  return {
    warnings,
    profile: {
      weightKg: weightLog.length ? null : currentWeight,
      targets: {
        calories: goal?.daily_calories || DEFAULT_TARGETS.calories,
        protein: goal?.daily_protein || DEFAULT_TARGETS.protein,
        carbohydrates: goal?.daily_carbohydrates || DEFAULT_TARGETS.carbohydrates,
        fat: goal?.daily_fat || DEFAULT_TARGETS.fat,
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
    mealLog: mealEntries(meals.meals ?? [], progress.calorie_intake_records ?? []),
    waterLog: local.waterLog,
    weightLog,
  }
}
