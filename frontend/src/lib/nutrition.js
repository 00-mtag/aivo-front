import { userKey } from './profile'
import { uid } from './workouts'

/*
  Data shapes mirror the database tables so the move to Laravel is a straight swap:
    food            -> { food_id, uploaded_by, name, description, calories, protein, carbohydrates, fat, serving_size, serving_unit }
    meals           -> { meal_id, meal_type, meal_date (YYYY-MM-DD), notes, items: [...] }
    meal_items      -> { meal_item_id, food_id, quantity, calories, protein, carbohydrates, fat, notes }
    nutrition_goal  -> { daily_calories, daily_protein, daily_carbohydrates, daily_fat, start_date, end_date }
  TODO: load and save through the API instead of localStorage.
*/

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const MACROS = ['calories', 'protein', 'carbohydrates', 'fat']

const f = (food_id, name, calories, protein, carbohydrates, fat, serving_size, serving_unit) =>
  ({ food_id, uploaded_by: null, name, description: '', calories, protein, carbohydrates, fat, serving_size, serving_unit })

// Typical values per serving. They are estimates and vary by brand and cooking method.
export const FOOD_LIBRARY = [
  f('oatmeal', 'Oatmeal (cooked)', 166, 6, 28, 3.6, '1', 'cup'),
  f('eggs2', 'Scrambled eggs', 182, 12, 2, 14, '2', 'large eggs'),
  f('egg1', 'Boiled egg', 78, 6.3, 0.6, 5.3, '1', 'large egg'),
  f('toast', 'Whole wheat toast', 81, 4, 14, 1.1, '1', 'slice'),
  f('yogurt', 'Greek yogurt (plain, nonfat)', 100, 17, 6, 0.7, '170', 'g'),
  f('banana', 'Banana', 105, 1.3, 27, 0.4, '1', 'medium'),
  f('pb', 'Peanut butter', 94, 4, 3, 8, '1', 'tbsp'),
  f('milk', 'Milk (2%)', 122, 8, 12, 5, '1', 'cup'),
  f('chicken', 'Grilled chicken breast', 165, 31, 0, 3.6, '100', 'g'),
  f('brown_rice', 'Brown rice (cooked)', 216, 5, 45, 1.8, '1', 'cup'),
  f('white_rice', 'White rice (cooked)', 205, 4.3, 45, 0.4, '1', 'cup'),
  f('salmon', 'Baked salmon', 206, 22, 0, 12, '100', 'g'),
  f('tuna', 'Canned tuna in water', 116, 26, 0, 0.8, '100', 'g'),
  f('sweet_potato', 'Sweet potato (baked)', 103, 2.3, 24, 0.2, '1', 'medium'),
  f('broccoli', 'Broccoli (steamed)', 55, 3.7, 11, 0.6, '1', 'cup'),
  f('salad', 'Garden salad', 50, 2, 8, 1, '1', 'bowl'),
  f('beef', 'Lean ground beef (cooked)', 217, 26, 0, 12, '100', 'g'),
  f('tofu', 'Firm tofu', 144, 17, 3, 9, '100', 'g'),
  f('pasta', 'Whole wheat pasta (cooked)', 174, 7.5, 37, 0.8, '1', 'cup'),
  f('apple', 'Apple', 95, 0.5, 25, 0.3, '1', 'medium'),
  f('almonds', 'Almonds', 164, 6, 6, 14, '28', 'g'),
  f('whey', 'Whey protein shake', 120, 24, 3, 1.5, '1', 'scoop'),
  f('cottage', 'Cottage cheese (low-fat)', 82, 14, 3, 1.2, '1/2', 'cup'),
  f('hummus', 'Hummus', 70, 2, 4, 6, '2', 'tbsp'),
  f('carrots', 'Carrot sticks', 52, 1.2, 12, 0.3, '1', 'cup'),
  f('avocado', 'Avocado', 114, 1.4, 6, 10.5, '1/2', 'medium'),
  f('olive_oil', 'Olive oil', 119, 0, 0, 13.5, '1', 'tbsp'),
]

/* ---------- dates ---------- */
const p2 = (n) => String(n).padStart(2, '0')
export const toYmd = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const fromYmd = (s) => new Date(`${s}T00:00:00`)
export function weekDates(offsetWeeks = 0) {
  const n = new Date()
  const mon = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 6) % 7) + offsetWeeks * 7)
  return Array.from({ length: 7 }, (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i))
}

/* ---------- maths ---------- */
const r1 = (n) => Math.round(n * 10) / 10
export const macrosFor = (food, qty) => Object.fromEntries(MACROS.map((k) => [k, r1((Number(food[k]) || 0) * qty)]))
const sum = (items) => items.reduce((t, i) => Object.fromEntries(MACROS.map((k) => [k, t[k] + (Number(i[k]) || 0)])), { calories: 0, protein: 0, carbohydrates: 0, fat: 0 })
export const mealTotals = (meal) => sum(meal?.items ?? [])
export const dayTotals = (meals, date) => sum(meals.filter((m) => m.meal_date === date).flatMap((m) => m.items))

// Targets from the onboarding answers: protein from the recommendation, 25% of calories from fat, the rest carbs.
export function defaultGoal(rec) {
  const fat = Math.round((rec.calories * 0.25) / 9)
  const carbs = Math.max(0, Math.round((rec.calories - rec.protein * 4 - fat * 9) / 4))
  return { daily_calories: rec.calories, daily_protein: rec.protein, daily_carbohydrates: carbs, daily_fat: fat, start_date: toYmd(new Date()), end_date: null }
}

/* ---------- storage ---------- */
export function loadNutrition(rec) {
  try {
    const v = JSON.parse(localStorage.getItem(userKey('aivo_nutrition')) ?? 'null')
    if (v?.goal && Array.isArray(v.meals)) return { customFoods: [], ...v }
  } catch { /* fall through to a fresh plan */ }
  return { goal: defaultGoal(rec), customFoods: [], meals: [] }
}
export const saveNutrition = (data) => localStorage.setItem(userKey('aivo_nutrition'), JSON.stringify(data))

/* ---------- meal plan generator ---------- */
const SPLIT = { Breakfast: 0.25, Lunch: 0.35, Dinner: 0.3, Snack: 0.1 }
const OPTIONS = {
  protein: {
    Breakfast: [['eggs2', 'toast', 'banana'], ['yogurt', 'oatmeal', 'pb'], ['eggs2', 'oatmeal', 'milk']],
    Lunch: [['chicken', 'brown_rice', 'broccoli'], ['tuna', 'white_rice', 'salad'], ['beef', 'sweet_potato', 'broccoli']],
    Dinner: [['salmon', 'sweet_potato', 'broccoli'], ['chicken', 'pasta', 'salad'], ['tofu', 'brown_rice', 'broccoli']],
    Snack: [['whey', 'apple'], ['cottage', 'almonds'], ['yogurt', 'carrots']],
  },
  balanced: {
    Breakfast: [['oatmeal', 'banana', 'milk'], ['toast', 'eggs2', 'avocado'], ['yogurt', 'oatmeal', 'apple']],
    Lunch: [['brown_rice', 'chicken', 'salad'], ['pasta', 'tuna', 'broccoli'], ['white_rice', 'tofu', 'carrots']],
    Dinner: [['sweet_potato', 'salmon', 'broccoli'], ['brown_rice', 'beef', 'salad'], ['pasta', 'chicken', 'broccoli']],
    Snack: [['apple', 'almonds'], ['banana', 'pb'], ['hummus', 'carrots']],
  },
}

// Foods that are mostly protein (chicken, tuna, whey...) are capped at 1.5 servings so a big calorie goal
// is filled with carbs and fats instead of an unrealistic amount of protein.
const isLean = (food) => (Number(food.protein) * 4) / (Number(food.calories) || 1) > 0.4
const half = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(n * 2) / 2))

// One day of meals sized to the calorie goal. Different days rotate through different meal ideas.
// `foods` is the list the user can actually log (from the database, or the built-in list offline);
// the recipe ideas above are matched to it by food name, and anything it does not have is skipped.
export function planDay(date, calories, goalName, foods = FOOD_LIBRARY) {
  const group = OPTIONS[goalName === 'Build muscle' || goalName === 'Lose weight' ? 'protein' : 'balanced']
  const slug = Object.fromEntries(FOOD_LIBRARY.map((x) => [x.food_id, x.name.toLowerCase()]))
  const byName = Object.fromEntries(foods.map((x) => [x.name.toLowerCase(), x]))
  const dayIndex = (fromYmd(date).getDay() + 6) % 7
  return MEAL_TYPES.map((type) => {
    const list = group[type][dayIndex % group[type].length].map((id) => byName[slug[id]]).filter(Boolean)
    if (!list.length) return null
    const target = calories * SPLIT[type]
    const lean = list.filter(isLean), other = list.filter((x) => !isLean(x))
    const base = list.reduce((sum, x) => sum + Number(x.calories), 0)
    const leanQty = half(target / base, 0.5, 1.5)
    const leanCals = lean.reduce((sum, x) => sum + Number(x.calories) * leanQty, 0)
    const otherBase = other.reduce((sum, x) => sum + Number(x.calories), 0)
    const otherQty = other.length ? half((target - leanCals) / otherBase, 0.5, 3) : 0
    return {
      meal_id: `tmp_${uid()}`, meal_type: type, meal_date: date, notes: '',
      items: list.map((food) => {
        const qty = isLean(food) ? leanQty : otherQty
        return { meal_item_id: `tmp_${uid()}`, food_id: food.food_id, food_name: food.name, quantity: qty, ...macrosFor(food, qty), notes: '' }
      }),
    }
  }).filter(Boolean)
}
