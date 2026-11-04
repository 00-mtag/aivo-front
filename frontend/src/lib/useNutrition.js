import { useEffect, useRef, useState } from 'react'
import { uid } from './workouts'
import { FOOD_LIBRARY, defaultGoal, loadNutrition, macrosFor, planDay, saveNutrition } from './nutrition'
import { createFood as createFoodRequest, dedupeMeals, fetchNutrition, messageOf, normFood, normGoal, pickGoal, saveGoal as saveGoalRequest, saveMeal } from './nutritionApi'

const SAVE_DELAY = 500
const keyOf = (date, type) => `${date}|${type}`

/*
  One place for the meal plan data.
  - Online: meals, goals and foods come from the Laravel API and every change is saved back.
  - Offline (no server, not signed in, or an endpoint is missing): the same screen works from this device's storage.
*/
export default function useNutrition(rec) {
  const [data, setData] = useState({ meals: [], goal: defaultGoal(rec), foods: FOOD_LIBRARY })
  const [status, setStatus] = useState('loading')   // 'loading' | 'online' | 'offline'
  const [notice, setNotice] = useState('')
  const [syncError, setSyncError] = useState('')
  const ref = useRef(data)
  const modeRef = useRef('loading')
  const mounted = useRef(false)
  const started = useRef(false)
  const timers = useRef({})
  const chains = useRef({})
  const dirty = useRef(new Set())

  // Every change goes through here so the sync code always reads the latest data, never a stale copy.
  const commit = (fn) => { ref.current = fn(ref.current); setData(ref.current) }

  useEffect(() => {
    mounted.current = true
    if (!started.current) {
      started.current = true
      ;(async () => {
        try {
          const r = await fetchNutrition()
          let goal = pickGoal(r.goals)
          if (!goal) {
            try { goal = normGoal((await saveGoalRequest(defaultGoal(rec))).data.nutrition_goal) } catch { goal = defaultGoal(rec) }
          }
          if (!mounted.current) return
          modeRef.current = 'online'
          commit(() => ({ meals: dedupeMeals(r.meals), goal, foods: r.foods }))
          setStatus('online')
        } catch (err) {
          const local = loadNutrition(rec)
          if (!mounted.current) return
          modeRef.current = 'offline'
          commit(() => ({ meals: local.meals, goal: local.goal, foods: [...FOOD_LIBRARY, ...local.customFoods] }))
          setNotice(`Working offline: ${err.message}. Your meal plan is saved on this device only.`)
          setStatus('offline')
        }
      })()
    }
    return () => {
      mounted.current = false
      Object.entries(timers.current).forEach(([k, t]) => { clearTimeout(t); const [d, ty] = k.split('|'); flush(d, ty) })  // don't lose a change made just before leaving
    }
  }, [])

  // Keep a local copy: it is the storage when offline, and what the dashboard reads for today's totals.
  useEffect(() => {
    if (status === 'loading') return
    saveNutrition({ goal: data.goal, meals: data.meals, customFoods: status === 'offline' ? data.foods.filter((f) => f.uploaded_by === 'me') : [] })
  }, [data, status])

  // Saves one meal (create or update). Saves for the same meal run one after another.
  function flush(date, type) {
    if (modeRef.current !== 'online') return
    const k = keyOf(date, type)
    chains.current[k] = (chains.current[k] ?? Promise.resolve()).then(async () => {
      const m = ref.current.meals.find((x) => x.meal_date === date && x.meal_type === type)
      if (!m) return
      if (typeof m.meal_id !== 'number' && !m.items.length && !m.notes) return   // nothing worth creating
      try {
        const res = await saveMeal(m)
        if (typeof m.meal_id !== 'number') {
          const id = Number(res.data.meal.meal_id)
          commit((d) => ({ ...d, meals: d.meals.map((x) => (x.meal_date === date && x.meal_type === type ? { ...x, meal_id: id } : x)) }))
        }
        dirty.current.delete(k)
        if (dirty.current.size === 0) setSyncError('')
      } catch (err) {
        dirty.current.add(k)
        setSyncError(messageOf(err))
      }
    })
  }
  const saveSoon = (date, type, delay = SAVE_DELAY) => {
    if (modeRef.current !== 'online') return
    const k = keyOf(date, type)
    clearTimeout(timers.current[k])
    timers.current[k] = setTimeout(() => { delete timers.current[k]; flush(date, type) }, delay)
  }

  // Finds (or creates) the meal for a day and type, applies a change, then schedules the save.
  const touch = (date, type, fn) => {
    commit((d) => {
      const meals = [...d.meals]
      let i = meals.findIndex((m) => m.meal_date === date && m.meal_type === type)
      if (i < 0) { meals.push({ meal_id: `tmp_${uid()}`, meal_type: type, meal_date: date, notes: '', items: [] }); i = meals.length - 1 }
      meals[i] = fn(meals[i])
      return { ...d, meals }
    })
    saveSoon(date, type)
  }

  const foodById = () => Object.fromEntries(ref.current.foods.map((f) => [f.food_id, f]))
  const withQty = (item, qty) => {
    const food = foodById()[item.food_id]
    const per = food ?? Object.fromEntries(['calories', 'protein', 'carbohydrates', 'fat'].map((k) => [k, item.quantity ? item[k] / item.quantity : 0]))
    return { ...item, quantity: qty, ...macrosFor(per, qty) }
  }

  const addItem = (date, type, food, qty) => touch(date, type, (m) => {
    const found = m.items.find((x) => x.food_id === food.food_id)
    return {
      ...m,
      items: found
        ? m.items.map((x) => (x === found ? withQty(x, x.quantity + qty) : x))
        : [...m.items, { meal_item_id: `tmp_${uid()}`, food_id: food.food_id, food_name: food.name, notes: '', ...macrosFor(food, qty), quantity: qty }],
    }
  })
  const setQty = (date, type, itemId, qty) => touch(date, type, (m) => ({ ...m, items: m.items.map((x) => (x.meal_item_id === itemId ? withQty(x, qty) : x)) }))
  const removeItem = (date, type, itemId) => touch(date, type, (m) => ({ ...m, items: m.items.filter((x) => x.meal_item_id !== itemId) }))
  const setNote = (date, type, notes) => touch(date, type, (m) => ({ ...m, notes }))

  // Replaces the meals on the given days with a generated plan. Existing meals keep their id and just get new items.
  const generate = (ymds) => {
    const { foods, goal } = ref.current
    ymds.forEach((date) => {
      planDay(date, goal.daily_calories || rec.calories, rec.goal, foods).forEach((fresh) => {
        commit((d) => {
          const meals = [...d.meals]
          const i = meals.findIndex((m) => m.meal_date === date && m.meal_type === fresh.meal_type)
          if (i < 0) meals.push(fresh)
          else meals[i] = { ...meals[i], items: fresh.items }
          return { ...d, meals }
        })
        saveSoon(date, fresh.meal_type, 0)
      })
    })
  }

  const saveGoal = async (g) => {
    commit((d) => ({ ...d, goal: g }))
    if (modeRef.current !== 'online') return
    try {
      const res = await saveGoalRequest(g)
      if (!g.goal_id) commit((d) => ({ ...d, goal: { ...d.goal, goal_id: Number(res.data.nutrition_goal.goal_id) } }))
      setSyncError('')
    } catch (err) { setSyncError(messageOf(err)) }
  }
  const resetGoal = () => saveGoal({ ...defaultGoal(rec), goal_id: ref.current.goal.goal_id })

  // Returns the created food (with its real id when online). Throws an Error with a readable message on failure.
  const createFood = async (food) => {
    let created = food
    if (modeRef.current === 'online') {
      try { created = normFood((await createFoodRequest(food)).data.food) } catch (err) { throw new Error(messageOf(err)) }
    }
    commit((d) => ({ ...d, foods: [...d.foods, created] }))
    return created
  }

  const retry = () => [...dirty.current].forEach((k) => { const [d, t] = k.split('|'); flush(d, t) })

  return { ...data, status, notice, syncError, addItem, setQty, removeItem, setNote, generate, saveGoal, resetGoal, createFood, retry }
}
