import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import AskAivoFloating from '../components/AskAivoFloating'
import PlanCard from '../components/workouts/PlanCard'
import PlanModal from '../components/workouts/PlanModal'
import ExerciseModal from '../components/workouts/ExerciseModal'
import CalendarModal from '../components/workouts/CalendarModal'
import WorkoutSession from '../components/workouts/WorkoutSession'
import { goldBtn } from '../components/workouts/Modal'
import { loadPlans, newPlan, savePlans, uid } from '../lib/workouts'

const AI_SUGGESTIONS = [
  'Recommend exercises for my chest day',
  'Make my plan easier this week',
  'Swap an exercise I cannot do',
  'How long should I rest between sets?',
]

export default function Workouts() {
  const [plans, setPlans] = useState(loadPlans)
  const [openId, setOpenId] = useState(() => plans[0]?.id ?? null)
  const [planModal, setPlanModal] = useState(null)   // { planId } | { planId: null } for a new plan
  const [exModal, setExModal] = useState(null)       // { planId, day, exercise, edit }
  const [newId, setNewId] = useState(null)           // plan created in this visit (gets a NEW badge)
  const [session, setSession] = useState(null)       // { planId, day } while a workout is running
  const [calId, setCalId] = useState(null)           // plan being added to the calendar

  useEffect(() => { savePlans(plans) }, [plans])

  const patch = (id, fn) => setPlans((ps) => ps.map((p) => (p.id === id ? fn(p) : p)))
  const activePlan = planModal?.planId && plans.find((p) => p.id === planModal.planId)
  const exPlan = exModal && plans.find((p) => p.id === exModal.planId)
  const sessionPlan = session && plans.find((p) => p.id === session.planId)
  const calPlan = calId && plans.find((p) => p.id === calId)

  const savePlan = (f) => {
    if (planModal.planId) patch(planModal.planId, (p) => ({ ...p, ...f }))
    else { const p = newPlan(f); setPlans((ps) => [p, ...ps]); setOpenId(p.id); setNewId(p.id) }
    setPlanModal(null)
  }
  const deletePlan = (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    setPlans((ps) => ps.filter((x) => x.id !== p.id))
    if (openId === p.id) setOpenId(null)
  }
  const saveExercise = (ex) => {
    const { planId, day } = exModal
    patch(planId, (p) => {
      const list = p.schedule[day] ?? []
      const next = ex.id ? list.map((e) => (e.id === ex.id ? ex : e)) : [...list, { ...ex, id: uid() }]
      return { ...p, schedule: { ...p.schedule, [day]: next } }
    })
    setExModal(null)
  }
  const deleteExercise = () => {
    const { planId, day, exercise } = exModal
    patch(planId, (p) => ({ ...p, schedule: { ...p.schedule, [day]: p.schedule[day].filter((e) => e.id !== exercise.id) } }))
    setExModal(null)
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      <main className="min-h-screen bg-[#161616] px-5 pb-28 pt-8 sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Workouts</h1>
            <p className="mt-1 text-sm text-ink/80">Plan your week and keep your routines in one place.</p>
          </div>
          <button type="button" onClick={() => setPlanModal({ planId: null })} className={`${goldBtn} flex items-center gap-2`}><Plus size={16} /> Create New Plan</button>
        </header>

        <div className="mx-auto mt-8 max-w-4xl space-y-3">
          {plans.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/20 p-10 text-center">
              <p className="font-semibold">No workout plans yet</p>
              <p className="mt-1 text-sm text-mute">Create your first plan to start building your week.</p>
            </div>
          )}
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} open={openId === p.id} isNew={newId === p.id}
              onStart={(day) => setSession({ planId: p.id, day })}
              onCalendar={() => setCalId(p.id)}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              onChange={(next) => patch(p.id, () => next)}
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
          onSave={saveExercise} onDelete={deleteExercise} onClose={() => setExModal(null)} />
      )}

      {calPlan && <CalendarModal plan={calPlan} onClose={() => setCalId(null)} />}
      {sessionPlan && <WorkoutSession plan={sessionPlan} day={session.day} onClose={() => setSession(null)} />}

      <AskAivoFloating suggestions={AI_SUGGESTIONS} />
    </div>
  )
}
