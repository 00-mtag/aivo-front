import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, Plus } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import AskAivoFloating from '../components/AskAivoFloating'
import PlanCard from '../components/workouts/PlanCard'
import PlanModal from '../components/workouts/PlanModal'
import ExerciseModal from '../components/workouts/ExerciseModal'
import CalendarModal from '../components/workouts/CalendarModal'
import WorkoutSession from '../components/workouts/WorkoutSession'
import { ghostBtn, goldBtn } from '../components/workouts/Modal'
import { GOALS, isActive, newPlan, normalizeWorkout, savePlans, uid, workoutBody } from '../lib/workouts'
import { api, errorsFrom } from '../lib/api'

const AI_SUGGESTIONS = ['Suggest a workout for muscle gain', 'How many calories should I eat?', 'Create a cardio plan']

const BarsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="12" width="4" height="8" rx="1" /><rect x="10" y="7" width="4" height="13" rx="1" /><rect x="16" y="3" width="4" height="17" rx="1" /></svg>
)

function FilterSelect({ icon, value, onChange, options, label }) {
  return (
    <label className="relative flex items-center">
      <span className="pointer-events-none absolute left-3.5 text-gold">{icon}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-white/10 bg-card py-3 pl-10 pr-10 text-sm outline-none transition hover:border-white/30 focus:border-gold">
        {options.map(([v, l]) => <option key={v} value={v} className="bg-card">{l}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-mute" />
    </label>
  )
}

export default function Workouts() {
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansLoaded, setPlansLoaded] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [actionError, setActionError] = useState('')
  const [exerciseCatalog, setExerciseCatalog] = useState({ goal: null, exercises: [], error: '' })
  const [openId, setOpenId] = useState(() => plans[0]?.id ?? null)
  const [planModal, setPlanModal] = useState(null)   // { planId } | { planId: null } for a new plan
  const [exModal, setExModal] = useState(null)       // { planId, day, exercise, edit }
  const [newId, setNewId] = useState(null)           // plan created in this visit (gets a NEW badge)
  const [session, setSession] = useState(null)       // { planId, day } while a workout is running
  const [calId, setCalId] = useState(null)           // plan being added to the calendar
  // Desktop: the AI panel starts open beside the plans. Phone/tablet: it starts closed and opens as a modal.
  const [aiOpen, setAiOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches)
  const [aiWide, setAiWide] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [goalFilter, setGoalFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    api.get('/workouts')
      .then(({ data }) => {
        if (cancelled) return
        if (!Array.isArray(data?.workouts)) {
          setPlansError('The workout list could not be loaded.')
          return
        }
        const loadedPlans = data.workouts.map(normalizeWorkout)
        setPlans(loadedPlans)
        savePlans(loadedPlans)
        setPlansLoaded(true)
        setOpenId(loadedPlans[0]?.id ?? null)
      })
      .catch((error) => {
        if (!cancelled) setPlansError(errorsFrom(error).form)
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false)
      })

    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (plansLoaded) savePlans(plans)
  }, [plans, plansLoaded])

  // Follow the screen size: open when it becomes desktop-wide, close when it shrinks to phone/tablet.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const onChange = (e) => setAiOpen(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const activePlan = planModal?.planId && plans.find((p) => p.id === planModal.planId)
  const exPlan = exModal && plans.find((p) => p.id === exModal.planId)
  const exerciseGoal = exPlan?.goal
  const exercisePlanId = exModal?.planId ?? null
  const sessionPlan = session && plans.find((p) => p.id === session.planId)
  const calPlan = calId && plans.find((p) => p.id === calId)

  useEffect(() => {
    if (exercisePlanId === null || !exerciseGoal) return undefined

    let cancelled = false

    api.get('/exercises', { params: { best_for: exerciseGoal } })
      .then(({ data }) => {
        if (cancelled) return
        if (!Array.isArray(data?.exercises)) {
          setExerciseCatalog({ goal: exerciseGoal, exercises: [], error: 'The exercise list could not be loaded.' })
          return
        }
        setExerciseCatalog({
          goal: exerciseGoal,
          exercises: data.exercises
            .filter(({ exercise_id, name }) => Number.isInteger(Number(exercise_id)) && typeof name === 'string')
            .map(({ exercise_id, name }) => ({ id: Number(exercise_id), name })),
          error: '',
        })
      })
      .catch((error) => {
        if (!cancelled) setExerciseCatalog({ goal: exerciseGoal, exercises: [], error: errorsFrom(error).form })
      })

    return () => { cancelled = true }
  }, [exercisePlanId, exerciseGoal])

  const shown = plans.filter((p) =>
    (statusFilter === 'all' || (statusFilter === 'active') === isActive(p)) && (goalFilter === 'all' || p.goal === goalFilter))
  const filtering = statusFilter !== 'all' || goalFilter !== 'all'

  const savePlan = async (f) => {
    try {
      if (planModal.planId) {
        const plan = plans.find((item) => item.id === planModal.planId)
        const { data } = await api.put(`/workouts/${planModal.planId}`, workoutBody({ ...plan, ...f }))
        const saved = normalizeWorkout(data.workout)
        setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
      } else {
        const { data } = await api.post('/workouts', workoutBody(newPlan(f)))
        const saved = normalizeWorkout(data.workout)
        setPlans((current) => [saved, ...current])
        setOpenId(saved.id)
        setNewId(saved.id)
        setStatusFilter('all')
        setGoalFilter('all')
      }
      setActionError('')
      setPlanModal(null)
    } catch (error) {
      throw new Error(errorsFrom(error).form, { cause: error })
    }
  }
  const persistPlan = async (plan) => {
    try {
      const { data } = await api.put(`/workouts/${plan.id}`, workoutBody(plan))
      const saved = normalizeWorkout(data.workout)
      setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
      setActionError('')
    } catch (error) {
      setActionError(errorsFrom(error).form)
    }
  }
  const deletePlan = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/workouts/${p.id}`)
      setPlans((ps) => ps.filter((x) => x.id !== p.id))
      if (openId === p.id) setOpenId(null)
      setActionError('')
    } catch (error) {
      setActionError(errorsFrom(error).form)
    }
  }
  const saveExercise = async (ex) => {
    const { planId, day } = exModal
    if (exerciseCatalog.goal !== exerciseGoal) {
      throw new Error('Wait for exercise suggestions to load for this workout goal.')
    }
    const matchedExercise = exerciseCatalog.exercises.find(
      ({ name }) => name.trim().toLowerCase() === ex.name.trim().toLowerCase()
    )
    const keepsExistingExercise = ex.exerciseId
      && ex.name.trim().toLowerCase() === exModal.exercise?.name.trim().toLowerCase()
    const exerciseId = matchedExercise?.id ?? (keepsExistingExercise ? ex.exerciseId : null)
    if (!exerciseId) throw new Error("Choose an exercise from this workout goal's suggestions.")

    const plan = plans.find((item) => item.id === planId)
    const list = plan.schedule[day] ?? []
    const updatedExercise = { ...ex, exerciseId, name: matchedExercise?.name ?? ex.name }
    const next = ex.id
      ? list.map((item) => item.id === ex.id ? updatedExercise : item)
      : [...list, { ...updatedExercise, id: uid() }]
    try {
      const { data } = await api.put(`/workouts/${planId}`, workoutBody({
        ...plan,
        schedule: { ...plan.schedule, [day]: next },
      }))
      const saved = normalizeWorkout(data.workout)
      setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
      setActionError('')
      setExModal(null)
    } catch (error) {
      throw new Error(errorsFrom(error).form, { cause: error })
    }
  }
  const deleteExercise = async () => {
    const { planId, day, exercise } = exModal
    const plan = plans.find((item) => item.id === planId)
    const exercises = (plan.schedule[day] ?? []).filter((item) => item.id !== exercise.id)
    try {
      const { data } = await api.put(`/workouts/${planId}`, workoutBody({
        ...plan,
        schedule: { ...plan.schedule, [day]: exercises },
      }))
      const saved = normalizeWorkout(data.workout)
      setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
      setActionError('')
      setExModal(null)
    } catch (error) {
      setActionError(errorsFrom(error).form)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      {/* When the AI panel is open on a wide screen it sits beside the page, so the page makes room for it */}
      <main className={`min-h-screen bg-[#161616] px-5 pb-28 pt-8 transition-[padding] sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-12 ${aiOpen ? (aiWide ? 'xl:pr-[43rem] 2xl:pr-[51rem]' : 'xl:pr-[31rem] 2xl:pr-[35rem]') : ''}`}>
        <header>
          <h1 className="text-3xl font-bold sm:text-4xl">Workouts</h1>
          <p className="mt-1 text-sm text-ink/80">Plan your week and keep your routines in one place.</p>
        </header>
        {plansError && <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Could not load workouts: {plansError}</p>}
        {actionError && <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{actionError}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setPlanModal({ planId: null })} className={`${goldBtn} flex items-center gap-2 !py-3`}><Plus size={18} /> Create New Plan</button>
          <FilterSelect label="Filter by status" icon={<CalendarDays size={18} />} value={statusFilter} onChange={setStatusFilter}
            options={[['all', 'All Plans'], ['active', 'Active'], ['inactive', 'Inactive']]} />
          <FilterSelect label="Filter by goal" icon={<BarsIcon />} value={goalFilter} onChange={setGoalFilter}
            options={[['all', 'All Goals'], ...GOALS.map((g) => [g, g])]} />
        </div>

        <div className="mt-6 max-w-3xl space-y-3">
          {plansLoading && <p role="status" className="rounded-xl border border-white/10 p-6 text-center text-sm text-mute">Loading workouts...</p>}
          {!plansLoading && !plansError && plans.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/20 p-10 text-center">
              <p className="font-semibold">No workout plans yet</p>
              <p className="mt-1 text-sm text-mute">Create your first plan to start building your week.</p>
            </div>
          )}
          {plans.length > 0 && shown.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/20 p-8 text-center">
              <p className="font-semibold">No plans match these filters</p>
              {filtering && <button type="button" onClick={() => { setStatusFilter('all'); setGoalFilter('all') }} className={`${ghostBtn} mt-4`}>Clear filters</button>}
            </div>
          )}
          {shown.map((p) => (
            <PlanCard key={p.id} plan={p} open={openId === p.id} isNew={newId === p.id}
              onStart={(day) => setSession({ planId: p.id, day })}
              onCalendar={() => setCalId(p.id)}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              onChange={persistPlan}
              onEditPlan={() => setPlanModal({ planId: p.id })}
              onDeletePlan={() => deletePlan(p)}
              onOpenExercise={(day, exercise, edit) => setExModal({ planId: p.id, day, exercise, edit })}
              onAddExercise={(day) => setExModal({ planId: p.id, day, exercise: null })} />
          ))}
        </div>
      </main>

      {planModal && (planModal.planId ? activePlan : true) && (
        <PlanModal plan={activePlan || null} onSave={savePlan} onClose={() => setPlanModal(null)} />
      )}
      {exModal && exPlan && (
        <ExerciseModal key={exModal.exercise?.id ?? 'new'} exercise={exModal.exercise} startEditing={exModal.edit}
          exerciseNames={exerciseCatalog.goal === exerciseGoal ? exerciseCatalog.exercises.map(({ name }) => name) : []}
          exerciseGoal={exerciseGoal}
          exerciseNamesLoading={Boolean(exerciseGoal && exerciseCatalog.goal !== exerciseGoal)}
          exerciseNamesError={!exerciseGoal
            ? 'This workout plan has no goal selected. Edit the plan to see matching exercises.'
            : exerciseCatalog.goal === exerciseGoal ? exerciseCatalog.error : ''}
          actionError={actionError}
          onSave={saveExercise} onDelete={deleteExercise} onClose={() => setExModal(null)} />
      )}
      {calPlan && <CalendarModal plan={calPlan} onClose={() => setCalId(null)} />}
      {sessionPlan && <WorkoutSession plan={sessionPlan} day={session.day} onClose={() => setSession(null)} />}

      <AskAivoFloating open={aiOpen} onOpen={() => setAiOpen(true)} onClose={() => setAiOpen(false)} suggestions={AI_SUGGESTIONS} wide={aiWide} onToggleWide={() => setAiWide((w) => !w)} />
    </div>
  )
}
