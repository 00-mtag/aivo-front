import { useEffect, useMemo, useRef, useState } from 'react'
import { HelpCircle, Plus, RefreshCw, Sparkles } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import AskAivoFloating from '../components/AskAivoFloating'
import PlanCard from '../components/workouts/PlanCard'
import PlanModal from '../components/workouts/PlanModal'
import ExerciseModal from '../components/workouts/ExerciseModal'
import CalendarModal from '../components/workouts/CalendarModal'
import WorkoutSession from '../components/workouts/WorkoutSession'
import AiPlanModal from '../components/workouts/AiPlanModal'
import WeekStrip from '../components/workouts/WeekStrip'
import GuideSheet from '../components/workouts/GuideSheet'
import GettingStarted from '../components/workouts/GettingStarted'
import { ConfirmModal, ghostBtn, goldBtn } from '../components/workouts/Modal'
import { Chip } from '../components/workouts/controls'
import {
  DAYS, EQUIPMENT_IDS, GOALS, enrichExercise, exerciseCount, exerciseFits, isActive, loadEquipment, newPlan, normalizeWorkout,
  saveEquipment, savePlans, uid, workoutBody,
} from '../lib/workouts'
import { api, errorsFrom } from '../lib/api'
import { userKey } from '../lib/profile'
import { logWorkout, syncWorkoutPlan } from '../lib/progress'
import { STALE, cachedGet, patchCache, peek } from '../lib/cache'
import useProgress from '../lib/useProgress'

const AI_SUGGESTIONS = ['Suggest a workout for muscle gain', 'How many calories should I eat?', 'Create a cardio plan']
const todayName = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

// Keep the saved copy of the workout list in step with what you just changed.
const cachePut = (raw) => patchCache('/workouts', (d) => {
  const list = d?.workouts ?? []
  const i = list.findIndex((w) => Number(w.workout_id) === Number(raw.workout_id))
  return { ...d, workouts: i >= 0 ? list.map((w, k) => (k === i ? raw : w)) : [raw, ...list] }
})
const cacheRemove = (id) => patchCache('/workouts', (d) => ({ ...d, workouts: (d?.workouts ?? []).filter((w) => Number(w.workout_id) !== Number(id)) }))

const flag = (name) => { try { return localStorage.getItem(userKey(name)) === '1' } catch { return false } }
const setFlag = (name) => { try { localStorage.setItem(userKey(name), '1') } catch { /* storage blocked */ } }

export default function Workouts() {
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansLoaded, setPlansLoaded] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [reload, setReload] = useState(0)
  const [actionError, setActionError] = useState('')
  const [exerciseCatalog, setExerciseCatalog] = useState({ goal: null, exercises: [], error: '' })
  const [openId, setOpenId] = useState(null)
  const [planModal, setPlanModal] = useState(null)   // { planId } | { planId: null } for a new plan
  const [aiPlanOpen, setAiPlanOpen] = useState(false)
  const [exModal, setExModal] = useState(null)       // { planId, day, exercise, edit }
  const [newId, setNewId] = useState(null)           // plan created in this visit (gets a NEW badge)
  const [session, setSession] = useState(null)       // { planId, day } while a workout is running
  const [calId, setCalId] = useState(null)           // plan being added to the calendar
  const [deleting, setDeleting] = useState(null)     // plan waiting for a "yes, delete it"
  const [busyDelete, setBusyDelete] = useState(false)
  const [eqMap, setEqMap] = useState(loadEquipment)  // equipment chosen per plan (kept on this device)
  const [selectedDay, setSelectedDay] = useState(todayName)
  const [toast, setToast] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [checklistHidden, setChecklistHidden] = useState(() => flag('aivo_workouts_checklist_hidden'))
  // Desktop: the AI panel starts open beside the plans. Phone/tablet: it starts closed and opens as a modal.
  const [aiOpen, setAiOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches)
  const [aiWide, setAiWide] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [goalFilter, setGoalFilter] = useState('all')
  const toastTimer = useRef(null)

  const hook = useProgress(0)
  const prog = hook?.progress ?? hook
  const doneDays = DAYS.map((_, i) => prog?.days?.[i]?.status === 'done')
  const everDone = doneDays.some(Boolean) || Boolean(prog?.badges?.find((b) => b.id === 'first')?.earned)

  const notify = (message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Load the plans. If we already have a copy, show it at once and only refresh it quietly when it is old.
  useEffect(() => {
    let cancelled = false
    const apply = (data) => {
      if (cancelled) return
      if (!Array.isArray(data?.workouts)) {
        setPlansError('The workout list could not be loaded.')
        return
      }
      const loadedPlans = data.workouts.map(normalizeWorkout)
      setPlans(loadedPlans)
      savePlans(loadedPlans)
      setPlansLoaded(true)
      setPlansError('')
      setOpenId((current) => (current != null && loadedPlans.some((p) => p.id === current) ? current : loadedPlans[0]?.id ?? null))
      // First visit with nothing set up yet: show the short walkthrough once.
      if (!loadedPlans.length && !flag('aivo_workouts_guide_seen')) setGuideOpen(true)
    }
    const hit = reload === 0 ? peek('/workouts') : undefined
    if (hit) { apply(hit.data); setPlansLoading(false) } else { setPlansLoading(true); setPlansError('') }
    if (!hit || Date.now() - hit.at >= STALE.lists) {
      cachedGet('/workouts', { force: true })
        .then(apply)
        .catch((error) => { if (!cancelled && !hit) setPlansError(errorsFrom(error).form) })   // a quiet refresh that fails keeps the saved copy
        .finally(() => { if (!cancelled) setPlansLoading(false) })
    }
    return () => { cancelled = true }
  }, [reload])
  useEffect(() => {
    if (!plansLoaded) return
    savePlans(plans)
    syncWorkoutPlan(plans.filter((p) => isActive(p)))   // Progress: planned days and weekly goal
  }, [plans, plansLoaded])

  // Follow the screen size: open when it becomes desktop-wide, close when it shrinks to phone/tablet.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const onChange = (e) => setAiOpen(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Every plan carries the equipment it was made for (older plans default to "everything").
  const allPlans = useMemo(() => plans.map((p) => ({ ...p, equipment: eqMap[p.id] ?? EQUIPMENT_IDS })), [plans, eqMap])
  const setPlanEquipment = (id, list) => setEqMap((current) => {
    const next = { ...current, [id]: list }
    saveEquipment(next)
    return next
  })

  const activePlan = planModal?.planId && allPlans.find((p) => p.id === planModal.planId)
  const exPlan = exModal && allPlans.find((p) => p.id === exModal.planId)
  const exerciseGoal = exPlan?.goal
  const exercisePlanId = exModal?.planId ?? null
  const exerciseFilter = exModal?.bestFor ?? exerciseGoal ?? 'all'
  const sessionPlan = session && allPlans.find((p) => p.id === session.planId)
  const calPlan = calId && allPlans.find((p) => p.id === calId)

  useEffect(() => {
    if (exercisePlanId === null) return undefined
    let cancelled = false
    const params = exerciseFilter === 'all' ? {} : { best_for: exerciseFilter }
    cachedGet('/exercises', { params, staleTime: STALE.catalog })
      .then((data) => {
        if (cancelled) return
        if (!Array.isArray(data?.exercises)) {
          setExerciseCatalog({ goal: exerciseFilter, exercises: [], error: 'The exercise list could not be loaded.' })
          return
        }
        setExerciseCatalog({
          goal: exerciseFilter,
          exercises: data.exercises
            .filter(({ exercise_id, name }) => Number.isInteger(Number(exercise_id)) && typeof name === 'string')
            .map(enrichExercise),
          error: '',
        })
      })
      .catch((error) => {
        if (!cancelled) setExerciseCatalog({ goal: exerciseFilter, exercises: [], error: errorsFrom(error).form })
      })
    return () => { cancelled = true }
  }, [exercisePlanId, exerciseFilter])

  const shown = allPlans.filter((p) =>
    (statusFilter === 'all' || (statusFilter === 'active') === isActive(p)) && (goalFilter === 'all' || p.goal === goalFilter))
  const filtering = statusFilter !== 'all' || goalFilter !== 'all'

  const savePlan = async (f) => {
    const { equipment, ...fields } = f
    try {
      if (planModal.planId) {
        const plan = plans.find((item) => item.id === planModal.planId)
        const { data } = await api.put(`/workouts/${planModal.planId}`, workoutBody({ ...plan, ...fields }))
        const saved = normalizeWorkout(data.workout)
        cachePut(data.workout)
        setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
        setPlanEquipment(saved.id, equipment)
        notify('Plan updated')
      } else {
        const { data } = await api.post('/workouts', workoutBody(newPlan(fields)))
        const saved = normalizeWorkout(data.workout)
        cachePut(data.workout)
        setPlans((current) => [saved, ...current])
        setPlanEquipment(saved.id, equipment)
        setOpenId(saved.id)
        setNewId(saved.id)
        setSelectedDay(todayName())
        setStatusFilter('all')
        setGoalFilter('all')
        notify('Plan created. Now add exercises to your days.')
      }
      setActionError('')
      setPlanModal(null)
    } catch (error) {
      throw new Error(errorsFrom(error).form, { cause: error })
    }
  }
  const saveAiPlan = async (generated, { equipment = EQUIPMENT_IDS } = {}) => {
    // Keep only exercises that fit the equipment the user picked (unless that would leave nothing).
    const fitting = generated.exercises.filter((exercise) => exerciseFits(enrichExercise(exercise), equipment))
    const exercises = fitting.length ? fitting : generated.exercises
    const plan = newPlan({
      name: generated.name,
      description: generated.description,
      goal: generated.goal,
      level: generated.level,
      minutes: generated.minutes,
      weeks: generated.weeks,
    })
    for (const exercise of exercises) {
      plan.schedule[exercise.day].push({
        id: uid(),
        exerciseId: Number(exercise.exercise_id),
        name: exercise.name,
        sets: Number(exercise.sets),
        reps: exercise.reps,
        muscle: exercise.muscle || '',
        notes: exercise.notes || '',
        rest_seconds: exercise.rest_seconds ?? '',
        weight: exercise.weightORduration === 'weight' ? exercise.weight ?? '' : '',
        duration: exercise.weightORduration === 'duration' ? exercise.duration ?? '' : '',
        weightORduration: exercise.weightORduration === 'duration' ? 'duration' : 'weight',
      })
    }

    try {
      const { data } = await api.post('/workouts', workoutBody(plan))
      const saved = normalizeWorkout(data.workout)
      cachePut(data.workout)
      setPlans((current) => [saved, ...current])
      setPlanEquipment(saved.id, equipment)
      setOpenId(saved.id)
      setNewId(saved.id)
      setStatusFilter('all')
      setGoalFilter('all')
      setActionError('')
      setAiPlanOpen(false)
      notify('Your AI plan is ready')
    } catch (error) {
      throw new Error(errorsFrom(error).form, { cause: error })
    }
  }
  const saveChatSuggestion = async ({ question, suggestion }) => {
    try {
      const { data } = await api.post('/ai/suggestions/workout/save', {
        question,
        suggestion,
      })
      const saved = normalizeWorkout(data.workout)
      cachePut(data.workout)
      setPlans((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      setPlanEquipment(saved.id, EQUIPMENT_IDS)
      setOpenId(saved.id)
      setNewId(saved.id)
      setStatusFilter('all')
      setGoalFilter('all')
      notify('Suggested workout saved')
      return 'Saved to your workout plans.'
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'This workout could not be saved.', { cause: error })
    }
  }
  const persistPlan = async (plan) => {
    try {
      const { data } = await api.put(`/workouts/${plan.id}`, workoutBody(plan))
      const saved = normalizeWorkout(data.workout)
      cachePut(data.workout)
      setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
      setActionError('')
    } catch (error) {
      setActionError(errorsFrom(error).form)
    }
  }
  const duplicatePlan = async (p) => {
    try {
      const { data } = await api.post('/workouts', workoutBody({ ...p, name: `${p.name} copy`.slice(0, 40) }))
      const saved = normalizeWorkout(data.workout)
      cachePut(data.workout)
      setPlans((current) => [saved, ...current])
      setPlanEquipment(saved.id, p.equipment)
      setOpenId(saved.id)
      setNewId(saved.id)
      setActionError('')
      notify('Plan duplicated')
    } catch (error) {
      setActionError(errorsFrom(error).form)
    }
  }
  const deletePlan = async () => {
    const p = deleting
    setBusyDelete(true)
    try {
      await api.delete(`/workouts/${p.id}`)
      cacheRemove(p.id)
      setPlans((ps) => ps.filter((x) => x.id !== p.id))
      if (openId === p.id) setOpenId(null)
      setActionError('')
      setDeleting(null)
      notify('Plan deleted')
    } catch (error) {
      setActionError(errorsFrom(error).form)
      setDeleting(null)
    } finally {
      setBusyDelete(false)
    }
  }
  const saveExercise = async (ex) => {
    const { planId, day } = exModal
    if (exerciseCatalog.goal !== exerciseFilter) {
      throw new Error('Wait for exercise suggestions to load.')
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
      cachePut(data.workout)
      setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
      setActionError('')
      setSelectedDay(day)
      setExModal(null)
      notify(ex.id ? 'Exercise updated' : 'Exercise added')
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
      cachePut(data.workout)
      setPlans((current) => current.map((item) => item.id === saved.id ? saved : item))
      setActionError('')
      setExModal(null)
      notify('Exercise removed')
    } catch (error) {
      setActionError(errorsFrom(error).form)
    }
  }

  // Counts the finished workout in Progress.
  const completeSession = (summary = {}) => {
    const plan = sessionPlan
    const exercises = plan?.schedule?.[session?.day] ?? []
    logWorkout({
      name: summary.name ?? plan?.name ?? 'Workout',
      minutes: summary.minutes ?? plan?.minutes ?? 0,
      exercises: exercises.map(({ name, sets, reps }) => ({ name, sets, reps })),
    })
  }

  const closeGuide = () => { setFlag('aivo_workouts_guide_seen'); setGuideOpen(false) }
  const hideChecklist = () => { setFlag('aivo_workouts_checklist_hidden'); setChecklistHidden(true) }
  const startFirstWorkout = () => {
    const today = todayName()
    const withToday = allPlans.find((p) => isActive(p) && p.schedule[today]?.length)
    if (withToday) { setSession({ planId: withToday.id, day: today }); return }
    const any = allPlans.find((p) => exerciseCount(p) > 0)
    const day = any && DAYS.find((d) => any.schedule[d]?.length)
    if (any) setSession({ planId: any.id, day })
  }

  const checklist = [
    { label: 'Create your first plan', hint: 'Choose a goal and where you train.', done: allPlans.length > 0, actionLabel: 'Create plan', action: () => setPlanModal({ planId: null }) },
    { label: 'Add exercises to a day', hint: 'Open your plan, pick a day, tap Add exercise.', done: allPlans.some((p) => exerciseCount(p) > 0), actionLabel: 'Open plan', action: () => { if (allPlans[0]) setOpenId(allPlans[0].id) } },
    { label: 'Do your first workout', hint: 'Press Start and follow along.', done: everDone, actionLabel: 'Start', action: startFirstWorkout },
  ]
  const showChecklist = plansLoaded && !plansLoading && !checklistHidden && checklist.some((s) => !s.done)
  const hasPlans = allPlans.length > 0

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      {/* When the AI panel is open on a wide screen it sits beside the page, so the page makes room for it */}
      <main className={`min-h-screen bg-[#161616] px-5 pb-28 pt-8 transition-[padding] sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-12 ${aiOpen ? (aiWide ? 'xl:pr-[43rem] 2xl:pr-[51rem]' : 'xl:pr-[31rem] 2xl:pr-[35rem]') : ''}`}>
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Workouts</h1>
            <p className="mt-1 text-sm text-ink/80">Plan your week, then follow along step by step.</p>
          </div>
          <button type="button" onClick={() => setGuideOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-xs font-semibold text-gold transition hover:bg-white/5">
            <HelpCircle size={16} /> How it works
          </button>
        </header>

        {plansError && (
          <div role="alert" className="mt-4 max-w-3xl rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <p>Could not load workouts: {plansError}</p>
            <button type="button" onClick={() => setReload((n) => n + 1)} className="mt-2 flex items-center gap-1.5 font-semibold underline"><RefreshCw size={14} /> Try again</button>
          </div>
        )}
        {actionError && <p role="alert" className="mt-4 max-w-3xl rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{actionError}</p>}

        <div className="mt-6 max-w-3xl space-y-5">
          {showChecklist && <GettingStarted steps={checklist} onHide={hideChecklist} onShowGuide={() => setGuideOpen(true)} />}

          {hasPlans && (
            <WeekStrip plans={allPlans} done={doneDays} today={todayName()} selected={selectedDay} onSelect={setSelectedDay}
              onStart={(planId, day) => setSession({ planId, day })} onCreate={() => setPlanModal({ planId: null })} />
          )}

          {!plansLoading && !plansError && !hasPlans && (
            <section className="rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-6 text-center sm:p-8">
              <h2 className="text-xl font-bold">Build your first workout plan</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/80">Pick a goal, say where you train, and choose your days. It takes about a minute.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => setPlanModal({ planId: null })} className={`${goldBtn} flex items-center gap-2 !py-3`}><Plus size={18} /> Create a plan</button>
                <button type="button" onClick={() => setAiPlanOpen(true)} className={`${ghostBtn} flex items-center gap-2 !py-3`}><Sparkles size={16} /> Let AI build it</button>
              </div>
            </section>
          )}

          {hasPlans && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setPlanModal({ planId: null })} className={`${goldBtn} flex items-center gap-2 !py-3`}><Plus size={18} /> Create a plan</button>
              <button type="button" onClick={() => setAiPlanOpen(true)} className={`${ghostBtn} flex items-center gap-2 !py-3`}><Sparkles size={16} /> Let AI build one</button>
            </div>
          )}

          {allPlans.length > 1 && (
            <div className="space-y-2" aria-label="Filter plans">
              <div className="flex flex-wrap gap-2">
                {[['all', 'All plans'], ['active', 'Active'], ['inactive', 'Inactive']].map(([id, label]) => <Chip key={id} active={statusFilter === id} onClick={() => setStatusFilter(id)} className="!min-h-[2.25rem] !px-3.5 !text-xs">{label}</Chip>)}
              </div>
              <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                <div className="flex gap-2 pb-1">
                  {[['all', 'All goals'], ...GOALS.map((g) => [g, g])].map(([id, label]) => <Chip key={id} active={goalFilter === id} onClick={() => setGoalFilter(id)} className="!min-h-[2.25rem] !px-3.5 !text-xs">{label}</Chip>)}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {plansLoading && [0, 1].map((n) => <div key={n} role="status" aria-label="Loading workouts" className="h-28 animate-pulse rounded-2xl border border-white/10 bg-card" />)}
            {hasPlans && shown.length === 0 && (
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
                onDuplicate={() => duplicatePlan(p)}
                onDeletePlan={() => setDeleting(p)}
                onOpenExercise={(day, exercise, edit) => setExModal({ planId: p.id, day, exercise, edit, bestFor: p.goal || 'all' })}
                onAddExercise={(day) => setExModal({ planId: p.id, day, exercise: null, bestFor: p.goal || 'all' })} />
            ))}
          </div>
        </div>
      </main>

      {planModal && (planModal.planId ? activePlan : true) && (
        <PlanModal plan={activePlan || null} equipment={activePlan?.equipment} onSave={savePlan}
          onAiDecide={() => { setPlanModal(null); setAiPlanOpen(true) }}
          onClose={() => setPlanModal(null)} />
      )}
      {aiPlanOpen && <AiPlanModal onGenerate={saveAiPlan} onClose={() => setAiPlanOpen(false)} />}
      {exModal && exPlan && (
        <ExerciseModal key={exModal.exercise?.id ?? 'new'} exercise={exModal.exercise} startEditing={exModal.edit}
          exerciseCatalog={exerciseCatalog.goal === exerciseFilter ? exerciseCatalog.exercises : []}
          bestForFilter={exerciseFilter}
          onBestForChange={(bestFor) => setExModal((current) => ({ ...current, bestFor }))}
          equipment={exPlan.equipment}
          exerciseNamesLoading={exerciseCatalog.goal !== exerciseFilter}
          exerciseNamesError={exerciseCatalog.goal === exerciseFilter ? exerciseCatalog.error : ''}
          actionError={actionError}
          onSave={saveExercise} onDelete={deleteExercise} onClose={() => setExModal(null)} />
      )}
      {calPlan && <CalendarModal plan={calPlan} onClose={() => setCalId(null)} />}
      {deleting && (
        <ConfirmModal title="Delete this plan?" text={`"${deleting.name}" and all its exercises will be deleted. This cannot be undone.`}
          confirmLabel="Delete plan" danger busy={busyDelete} onConfirm={deletePlan} onClose={() => setDeleting(null)} />
      )}
      {sessionPlan && <WorkoutSession plan={sessionPlan} day={session.day} onComplete={completeSession} onClose={() => setSession(null)} />}
      {guideOpen && <GuideSheet hasPlans={hasPlans} onClose={closeGuide} onCreate={() => { closeGuide(); setPlanModal({ planId: null }) }} />}

      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[58] flex justify-center px-5 lg:bottom-8">
          <p className="rounded-full border border-gold/40 bg-[#1c1c1c] px-5 py-2.5 text-sm font-semibold shadow-xl shadow-black/50">{toast}</p>
        </div>
      )}

      <AskAivoFloating
        open={aiOpen}
        onOpen={() => setAiOpen(true)}
        onClose={() => setAiOpen(false)}
        suggestions={AI_SUGGESTIONS}
        context={{
          page: 'Workout plans',
          category: 'workout',
          persistConversations: true,
          data: {
            loading: plansLoading,
            plans: allPlans.map((plan) => ({
              name: plan.name,
              goal: plan.goal,
              level: plan.level,
              minutesPerSession: plan.minutes,
              active: plan.active,
              equipment: plan.equipment,
              schedule: Object.fromEntries(Object.entries(plan.schedule).map(([day, exercises]) => [
                day,
                exercises.map(({ name, sets, reps, muscle }) => ({ name, sets, reps, muscle })),
              ])),
            })),
          },
        }}
        onSaveRecommendation={saveChatSuggestion}
        wide={aiWide}
        onToggleWide={() => setAiWide((w) => !w)}
      />
    </div>
  )
}
