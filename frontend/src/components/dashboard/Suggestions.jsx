import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Clock, Dumbbell, Flame, Target, UtensilsCrossed } from 'lucide-react'
import { Card, IconBox } from './Cards'
import { newPlan, workoutBody } from '../../lib/workouts'
import { dayTotals, loadNutrition, toYmd } from '../../lib/nutrition'
import { api, errorsFrom } from '../../lib/api'

export default function Suggestions({ rec }) {
  const navigate = useNavigate()
  const root = useLocation().pathname.startsWith('/preview') ? '/preview' : '/app'
  const [workoutLookup, setWorkoutLookup] = useState({
    goal: null,
    hasPlans: null,
    exercises: [],
    loading: true,
    error: '',
  })
  const [saving, setSaving] = useState(false)
  const hasPlans = workoutLookup.goal === rec.goal ? workoutLookup.hasPlans : null
  const exercises = workoutLookup.goal === rec.goal ? workoutLookup.exercises : []
  const loading = workoutLookup.goal !== rec.goal || workoutLookup.loading
  const error = workoutLookup.goal === rec.goal ? workoutLookup.error : ''
  const levelIndex = { Beginner: 0, Intermediate: 1, Advanced: 2 }[rec.level] ?? 0
  const sets = [2, 3, 4][levelIndex]
  const reps = ['10', '12', '15'][levelIndex]

  useEffect(() => {
    let active = true
    api.get('/workouts')
      .then(async ({ data }) => {
        if (!Array.isArray(data?.workouts)) throw new Error('The workout list could not be loaded.')
        if (!active) return
        if (data.workouts.length > 0) {
          setWorkoutLookup({ goal: rec.goal, hasPlans: true, exercises: [], loading: false, error: '' })
          return
        }

        const { data: exerciseData } = await api.get('/exercises', { params: { best_for: rec.goal } })
        if (!Array.isArray(exerciseData?.exercises)) throw new Error('The exercise list could not be loaded.')
        if (active) {
          setWorkoutLookup({
            goal: rec.goal,
            hasPlans: false,
            exercises: exerciseData.exercises.filter((exercise) => Number.isInteger(Number(exercise.exercise_id)) && typeof exercise.name === 'string'),
            loading: false,
            error: '',
          })
        }
      })
      .catch((requestError) => {
        if (active) {
          setWorkoutLookup({
            goal: rec.goal,
            hasPlans: null,
            exercises: [],
            loading: false,
            error: requestError.response ? errorsFrom(requestError).form : requestError.message,
          })
        }
      })

    return () => { active = false }
  }, [rec.goal])

  const addToPlans = async () => {
    if (saving || exercises.length === 0) return
    setSaving(true)
    const plan = newPlan({
      name: rec.workout.name,
      description: `Recommended plan for ${rec.goal.toLowerCase()}.`,
      goal: rec.goal,
      level: rec.level,
      minutes: rec.workout.minutes,
      weeks: 4,
    })
    for (const day of rec.days) {
      plan.schedule[day] = exercises.slice(0, 6).map((exercise) => ({
        exerciseId: Number(exercise.exercise_id),
        name: exercise.name,
        sets,
        reps,
        muscle: exercise.muscle_group || '',
        notes: '',
      }))
    }

    try {
      await api.post('/workouts', workoutBody(plan))
      setWorkoutLookup((current) => ({ ...current, hasPlans: true }))
      navigate(`${root}/workouts`)
    } catch (requestError) {
      setWorkoutLookup((current) => ({
        ...current,
        error: requestError.response
          ? errorsFrom(requestError).form
          : requestError.message || 'The workout plan could not be saved.',
      }))
    } finally {
      setSaving(false)
    }
  }
  const nutrition = loadNutrition(rec)
  const eaten = dayTotals(nutrition.meals, toYmd(new Date()))
  const planned = nutrition.meals.some((m) => m.items.length)
  const shown = exercises.slice(0, 5)

  return (
    <Card className="border-gold/60">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <IconBox icon={Target} />
        <div className="flex-1"><p className="text-sm font-semibold">Recommended for you</p><p className="text-[10px] text-mute">Based on your goal and experience</p></div>
      </div>

      {hasPlans === false && (
      <div className="mt-4">
        <p className="text-[10px] font-semibold tracking-wide text-gold">SUGGESTED WORKOUT</p>
        <p className="mt-1 text-base font-bold">{rec.workout.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mute">
          <span className="flex items-center gap-1"><Clock size={12} />{rec.workout.minutes} min</span>
          <span className="flex items-center gap-1"><Dumbbell size={12} className="text-gold" />{rec.level}</span>
          <span className="flex items-center gap-1"><Flame size={12} className="text-orange-400" />~{rec.workout.kcal} kcal</span>
          <span>{rec.perWeek} days / week</span>
        </div>
        <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10">
          {shown.map((exercise) => (
            <li key={exercise.exercise_id} className="flex items-center justify-between px-3 py-2 text-xs">
              <span>{exercise.name}</span><span className="font-semibold text-gold">{sets} × {reps}</span>
            </li>
          ))}
          {shown.length === 0 && !loading && <li className="px-3 py-2 text-xs text-mute">No exercises are available for this goal yet.</li>}
        </ul>
        {exercises.length > shown.length && <p className="mt-1.5 text-[10px] text-mute">+ {exercises.length - shown.length} more available exercises for this goal</p>}
        {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
        <button type="button" onClick={addToPlans} disabled={loading || saving || exercises.length === 0} className="mt-4 w-full rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Saving plan...' : loading ? 'Loading exercises...' : 'Add to my plans'}
        </button>
      </div>
      )}
      {hasPlans === null && !loading && error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}

      <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><UtensilsCrossed size={15} className="text-gold" /> Meal plan</p>
        <p className="mt-2 text-[11px] leading-snug text-mute">
          {planned
            ? `Today: ${Math.round(eaten.calories).toLocaleString()} of ${Math.round(nutrition.goal.daily_calories).toLocaleString()} kcal planned.`
            : `Your target is about ${nutrition.goal.daily_calories.toLocaleString()} kcal a day with ${nutrition.goal.daily_protein} g of protein. Build your meals for the week.`}
        </p>
        <button type="button" onClick={() => navigate(`${root}/nutrition`)} className="mt-3 w-full rounded-full border border-gold/60 px-5 py-2 text-xs font-bold text-gold transition hover:bg-gold/10">
          {planned ? 'Open meal plan' : 'Create meal plan'}
        </button>
      </div>
    </Card>
  )
}
