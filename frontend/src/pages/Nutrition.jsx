import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import AskAivoFloating from '../components/AskAivoFloating'
import AddFoodModal, { Stepper } from '../components/nutrition/AddFoodModal'
import GoalModal from '../components/nutrition/GoalModal'
import AiWeekPlanModal from '../components/nutrition/AiWeekPlanModal'
import { goldBtn } from '../components/workouts/Modal'
import { getProfile, recommendedDailyCalories } from '../lib/profile'
import { recommend } from '../lib/recommend'
import useNutrition from '../lib/useNutrition'
import { MEAL_TYPES, dayTotals, fromYmd, mealTotals, toYmd, weekDates } from '../lib/nutrition'

const AI_SUGGESTIONS = ['Calculate my calorie and macro goals', 'Suggest a high-protein meal', 'How should I fuel endurance training?']

const fmt = (n) => Math.round(n).toLocaleString()
const MACRO_ROWS = [
  { key: 'protein', goalKey: 'daily_protein', label: 'Protein', color: '#38bdf8' },
  { key: 'carbohydrates', goalKey: 'daily_carbohydrates', label: 'Carbs', color: '#fb923c' },
  { key: 'fat', goalKey: 'daily_fat', label: 'Fat', color: '#f472b6' },
]

const Bar = ({ pct, color }) => (
  <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} /></div>
)

export default function Nutrition() {
  const rec = recommend(getProfile())
  const nu = useNutrition(rec)
  const { status, meals, goal, foods } = nu
  const [selected, setSelected] = useState(() => toYmd(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [addFor, setAddFor] = useState(null)      // meal type whose "Add food" modal is open
  const [goalOpen, setGoalOpen] = useState(false)
  const [aiPlanOpen, setAiPlanOpen] = useState(false)
  const [aiPlanSaving, setAiPlanSaving] = useState(false)
  const [mealDoneSaving, setMealDoneSaving] = useState('')
  const [mealDoneError, setMealDoneError] = useState('')
  const [aiOpen, setAiOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches)
  const [aiWide, setAiWide] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const onChange = (e) => setAiOpen(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const foodById = Object.fromEntries(foods.map((x) => [x.food_id, x]))
  const dates = weekDates(weekOffset)
  const today = new Date()
  const todayYmd = toYmd(today)
  const daysUntilSunday = (7 - today.getDay()) % 7
  const planEndDate = toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilSunday))
  const aiPlanDates = Array.from({ length: daysUntilSunday + 1 }, (_, offset) =>
    toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)),
  )
  const aiPlanRange = `${fromYmd(todayYmd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${fromYmd(planEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  const totals = dayTotals(meals, selected)
  const profile = getProfile()
  const goalAdjustment = { 'Lose weight': -500, 'Build muscle': 300, 'Improve endurance': 100, 'Maintain fitness': 0 }[rec.goal] ?? 0
  const recommendedCalories = recommendedDailyCalories(profile) ?? (rec.calories - goalAdjustment)
  const calGoal = goal.daily_calories || recommendedCalories
  const remaining = calGoal - totals.calories
  const mealOf = (type) => meals.find((m) => m.meal_date === selected && m.meal_type === type)
  const hasMeals = (ymd) => meals.some((m) => m.meal_date === ymd && m.items.length)
  const markMealDone = async (type) => {
    setMealDoneSaving(type)
    setMealDoneError('')
    try {
      await nu.markDone(selected, type)
    } catch (error) {
      setMealDoneError(error.message || 'The meal could not be marked done.')
    } finally {
      setMealDoneSaving('')
    }
  }

  const changeWeek = (delta) => {
    const idx = Math.max(0, dates.findIndex((d) => toYmd(d) === selected))
    setWeekOffset(weekOffset + delta)
    setSelected(toYmd(weekDates(weekOffset + delta)[idx]))
  }
  const goToday = () => { setWeekOffset(0); setSelected(todayYmd) }

  const confirmReplaceWeek = () => {
    return !meals.some((meal) => aiPlanDates.includes(meal.meal_date) && meal.items.length)
      || window.confirm(`Replace the meals already planned for ${aiPlanRange}?`)
  }
  const saveGeneratedWeek = async (generatedPlan) => {
    setAiPlanSaving(true)
    try {
      nu.replaceWeekMeals(generatedPlan)
      setAiPlanOpen(false)
    } finally {
      setAiPlanSaving(false)
    }
  }

  const defaultCalories = recommendedCalories
  const dateLabel = fromYmd(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const weekLabel = `${dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      <main className={`min-h-screen bg-[#161616] px-5 pb-28 pt-8 transition-[padding] sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-12 ${aiOpen ? (aiWide ? 'xl:pr-[43rem] 2xl:pr-[51rem]' : 'xl:pr-[31rem] 2xl:pr-[35rem]') : ''}`}>
        <header>
          <h1 className="text-3xl font-bold sm:text-4xl">Meal Plan</h1>
          <p className="mt-1 text-sm text-ink/80">Plan what you eat and hit your daily targets.</p>
        </header>

        {status === 'loading' ? (
          <p className="mt-10 text-sm text-mute">Loading your meal plan...</p>
        ) : (
          <div className="mt-6 max-w-3xl space-y-5">
            {status === 'offline' && <p role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-300">{nu.notice}</p>}
            {nu.syncError && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger">
                <span>Couldn't save to the server: {nu.syncError}</span>
                <button type="button" onClick={nu.retry} className="font-semibold underline">Retry</button>
              </div>
            )}
            {mealDoneError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger">{mealDoneError}</p>}

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setAiPlanOpen(true)} disabled={aiPlanSaving} className={`${goldBtn} flex items-center gap-2`}><Sparkles size={16} /> Let AI decide</button>
            </div>

            {/* Week strip */}
            <section className="rounded-2xl border border-white/10 bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Previous week" onClick={() => changeWeek(-1)} className="grid h-8 w-8 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-ink"><ChevronLeft size={18} /></button>
                  <p className="min-w-28 text-center text-sm font-semibold">{weekLabel}</p>
                  <button type="button" aria-label="Next week" onClick={() => changeWeek(1)} className="grid h-8 w-8 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-ink"><ChevronRight size={18} /></button>
                </div>
                {(weekOffset !== 0 || selected !== todayYmd) && <button type="button" onClick={goToday} className="text-xs font-semibold text-gold hover:underline">Today</button>}
              </div>
              <div role="tablist" aria-label="Day" className="grid grid-cols-7 gap-1.5">
                {dates.map((d) => {
                  const y = toYmd(d), on = y === selected
                  return (
                    <button key={y} type="button" role="tab" aria-selected={on} onClick={() => setSelected(y)}
                      className={`relative rounded-xl py-2 text-center transition ${on ? 'bg-gold text-black' : 'border border-white/10 bg-black/20 hover:border-white/30'}`}>
                      <span className="block text-[10px] font-semibold">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="block text-base font-bold leading-tight">{d.getDate()}</span>
                      {hasMeals(y) && <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${on ? 'bg-black' : 'bg-gold'}`} />}
                      {y === todayYmd && !on && <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-gold" />}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Daily totals vs goals */}
            <section className="rounded-2xl border border-gold/40 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-mute">{dateLabel}</p>
                  <p className="mt-1 text-4xl font-extrabold">{fmt(totals.calories)} <span className="text-base font-medium text-mute">/ {fmt(calGoal)} kcal</span></p>
                  <p className={`mt-1 text-xs ${remaining < 0 ? 'text-danger' : 'text-mute'}`}>{remaining >= 0 ? `${fmt(remaining)} kcal left` : `${fmt(-remaining)} kcal over your goal`}</p>
                </div>
                <button type="button" onClick={() => setGoalOpen(true)} className="flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-2 text-xs font-semibold transition hover:bg-white/5"><Pencil size={13} /> Edit goals</button>
              </div>
              <div className="mt-3"><Bar pct={(totals.calories / calGoal) * 100} color={remaining < 0 ? '#ef4444' : '#d4af37'} /></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {MACRO_ROWS.map(({ key, goalKey, label, color }) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-baseline justify-between text-xs"><span className="font-semibold">{label}</span><span className="text-mute">{fmt(totals[key])} / {fmt(goal[goalKey])} g</span></div>
                    <Bar pct={goal[goalKey] ? (totals[key] / goal[goalKey]) * 100 : 0} color={color} />
                  </div>
                ))}
              </div>
            </section>

            {/* Meals */}
            {MEAL_TYPES.map((type) => {
              const meal = mealOf(type)
              const items = meal?.items ?? []
              const t = mealTotals(meal)
              return (
                <section key={type} className="rounded-2xl border border-white/10 bg-card">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <h2 className="font-bold">{type}</h2>
                      <p className="text-xs text-mute">{fmt(t.calories)} kcal · P {fmt(t.protein)} g · C {fmt(t.carbohydrates)} g · F {fmt(t.fat)} g</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => markMealDone(type)}
                        disabled={!items.length || meal?.is_done || status !== 'online' || mealDoneSaving === type}
                        className="rounded-full border border-emerald-400/50 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50">
                        {mealDoneSaving === type ? 'Saving...' : meal?.is_done ? 'Done' : 'Meal Done'}
                      </button>
                      <button type="button" onClick={() => setAddFor(type)} className="flex items-center gap-1.5 rounded-full border border-gold/60 px-4 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10"><Plus size={14} /> Add food</button>
                    </div>
                  </div>
                  {items.length === 0 ? (
                    <p className="border-t border-white/10 px-4 py-4 text-sm text-mute">Nothing planned for {type.toLowerCase()} yet.</p>
                  ) : (
                    <ul className="divide-y divide-white/10 border-t border-white/10">
                      {items.map((item) => {
                        const food = foodById[item.food_id]
                        const name = food?.name ?? item.food_name ?? 'Removed food'
                        return (
                          <li key={item.meal_item_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{name}</p>
                              <p className="text-[11px] text-mute">{item.quantity} × {food ? `${food.serving_size} ${food.serving_unit}` : 'serving'} · P {fmt(item.protein)} C {fmt(item.carbohydrates)} F {fmt(item.fat)}</p>
                            </div>
                            <span className="text-sm font-semibold text-gold">{fmt(item.calories)} kcal</span>
                            <Stepper value={item.quantity} onChange={(q) => nu.setQty(selected, type, item.meal_item_id, q)} />
                            <button type="button" aria-label={`Remove ${name}`} onClick={() => nu.removeItem(selected, type, item.meal_item_id)} className="grid h-8 w-8 place-items-center rounded-lg text-mute transition hover:bg-danger/10 hover:text-danger"><Trash2 size={16} /></button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="border-t border-white/10 px-4 py-2">
                    <input value={meal?.notes ?? ''} onChange={(e) => nu.setNote(selected, type, e.target.value)} maxLength={120} aria-label={`${type} note`} placeholder="Add a note for this meal..." className="w-full bg-transparent py-1.5 text-xs outline-none placeholder:text-mute/70" />
                  </div>
                </section>
              )
            })}
            <p className="text-[11px] text-mute">Calories and macros are estimates based on typical servings. Not medical advice.</p>
          </div>
        )}
      </main>

      {addFor && (
        <AddFoodModal mealType={addFor} foods={foods} onClose={() => setAddFor(null)} onCreate={nu.createFood}
          onAdd={(food, qty) => { nu.addItem(selected, addFor, food, qty); setAddFor(null) }} />
      )}
      {goalOpen && (
        <GoalModal goal={goal} onClose={() => setGoalOpen(false)}
          onSave={(g) => { nu.saveGoal(g); setGoalOpen(false) }}
          onReset={() => { nu.resetGoal(); setGoalOpen(false) }} />
      )}
      {aiPlanOpen && (
        <AiWeekPlanModal defaultCalories={defaultCalories} macroTargets={goal}
          startDate={todayYmd} endDate={planEndDate} goal={rec.goal} gender={profile?.gender}
          beforeGenerate={confirmReplaceWeek}
          onSave={saveGeneratedWeek}
          onClose={() => { if (!aiPlanSaving) setAiPlanOpen(false) }} />
      )}
      <AskAivoFloating
        open={aiOpen}
        onOpen={() => setAiOpen(true)}
        onClose={() => setAiOpen(false)}
        suggestions={AI_SUGGESTIONS}
        context={{
          page: 'Nutrition',
          data: {
            selectedDate: selected,
            dailyGoal: {
              calories: calGoal,
              proteinGrams: goal.daily_protein,
              carbohydratesGrams: goal.daily_carbohydrates,
              fatGrams: goal.daily_fat,
            },
            loggedSoFar: {
              calories: totals.calories,
              proteinGrams: totals.protein,
              carbohydratesGrams: totals.carbohydrates,
              fatGrams: totals.fat,
            },
            caloriesRemaining: remaining,
            meals: meals
              .filter((meal) => meal.meal_date === selected)
              .map((meal) => ({
                type: meal.meal_type,
                notes: meal.notes,
                items: meal.items.map((item) => ({
                  name: foodById[item.food_id]?.name ?? item.food_name ?? 'Food',
                  servings: item.quantity,
                  calories: item.calories,
                  proteinGrams: item.protein,
                  carbohydratesGrams: item.carbohydrates,
                  fatGrams: item.fat,
                })),
              })),
          },
        }}
        wide={aiWide}
        onToggleWide={() => setAiWide((w) => !w)}
      />
    </div>
  )
}
