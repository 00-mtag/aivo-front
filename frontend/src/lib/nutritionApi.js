import { api } from './api'
import { toYmd } from './nutrition'

const num = (v) => (v == null || v === '' ? 0 : Number(v))
const day = (v) => String(v ?? '').slice(0, 10)

// Decimal columns arrive from Laravel as strings ("182.00"), so everything is turned into numbers here.
export const normFood = (f) => ({
  food_id: Number(f.food_id), uploaded_by: f.uploaded_by ?? null, name: f.name, ingredients: f.ingredients ?? '',
  calories: num(f.calories), protein: num(f.protein), carbohydrates: num(f.carbohydrates), fat: num(f.fat),
  serving_size: f.serving_size ?? '1', serving_unit: f.serving_unit ?? 'serving',
})
export const normMeal = (m) => ({
  meal_id: Number(m.meal_id), meal_type: m.meal_type, meal_date: day(m.meal_date), notes: m.notes ?? '',
  is_done: Boolean(m.is_done),
  items: (m.items ?? []).map((i) => ({
    meal_item_id: Number(i.meal_item_id), food_id: Number(i.food_id), food_name: i.food_name ?? '', quantity: num(i.quantity),
    calories: num(i.calories), protein: num(i.protein), carbohydrates: num(i.carbohydrates), fat: num(i.fat), notes: i.notes ?? '',
  })),
})
export const normGoal = (g) => ({
  goal_id: Number(g.goal_id), daily_calories: num(g.daily_calories), daily_protein: num(g.daily_protein),
  daily_carbohydrates: num(g.daily_carbohydrates), daily_fat: num(g.daily_fat), start_date: day(g.start_date), end_date: g.end_date ? day(g.end_date) : null,
})

// The goal that applies today (the newest one that has started and not ended), else the newest goal.
export function pickGoal(goals) {
  const t = toYmd(new Date())
  return goals.find((g) => g.start_date <= t && (!g.end_date || g.end_date >= t)) ?? goals[0] ?? null
}

// Newest meal wins when the server holds more than one for the same day and meal type.
export function dedupeMeals(meals) {
  const seen = new Set()
  return meals.filter((m) => { const k = `${m.meal_date}|${m.meal_type}`; if (seen.has(k)) return false; seen.add(k); return true })
}

export function messageOf(err) {
  const d = err.response?.data
  if (d?.errors) { const first = Object.values(d.errors)[0]; return Array.isArray(first) ? first[0] : String(first) }
  if (d?.message) return d.message
  if (!err.response) return "Can't reach the server."
  return `Server error (${err.response.status}).`
}
const reason = (err, what) => {
  if (!err.response) return "can't reach the server"
  if (err.response.status === 401) return "you're not signed in"
  if (err.response.status === 404) return `the ${what} endpoint was not found`
  return `the server returned an error (${err.response.status}) for ${what}`
}

export async function fetchNutrition() {
  const names = ['meals', 'goals', 'foods']
  const res = await Promise.allSettled([api.get('/nutrition/meals'), api.get('/nutrition/goals'), api.get('/nutrition/foods')])
  const bad = res.findIndex((r) => r.status === 'rejected')
  if (bad >= 0) throw new Error(reason(res[bad].reason, names[bad]))
  return {
    meals: (res[0].value.data.meals ?? []).map(normMeal),
    goals: (res[1].value.data.nutrition_goals ?? []).map(normGoal),
    foods: (res[2].value.data.foods ?? []).map(normFood),
  }
}

export const mealBody = (m) => ({
  meal_type: m.meal_type, meal_date: m.meal_date, notes: m.notes || null,
  // The API only accepts these keys on an item.
  items: m.items.map((i) => ({ food_id: i.food_id, quantity: i.quantity, calories: i.calories, protein: i.protein, carbohydrates: i.carbohydrates, fat: i.fat, notes: i.notes || null })),
})
export const goalBody = (g) => ({
  daily_calories: g.daily_calories, daily_protein: g.daily_protein, daily_carbohydrates: g.daily_carbohydrates, daily_fat: g.daily_fat,
  start_date: g.start_date || toYmd(new Date()), end_date: g.end_date || null,
})
export const foodBody = (f) => ({ name: f.name, ingredients: f.ingredients || null, calories: f.calories, protein: f.protein, carbohydrates: f.carbohydrates, fat: f.fat, serving_size: f.serving_size, serving_unit: f.serving_unit })

export const saveMeal = (m) => (typeof m.meal_id === 'number' ? api.put(`/nutrition/meals/${m.meal_id}`, mealBody(m)) : api.post('/nutrition/meals', mealBody(m)))
export const markMealDone = (mealId) => api.post(`/nutrition/meals/${mealId}/done`)
export const saveGoal = (g) => (g.goal_id ? api.put(`/nutrition/goals/${g.goal_id}`, goalBody(g)) : api.post('/nutrition/goals', goalBody(g)))
export const createFood = (f) => api.post('/nutrition/foods', foodBody(f))
