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
import { GOALS, isActive, loadPlans, newPlan, savePlans, uid } from '../lib/workouts'

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
  const [plans, setPlans] = useState(loadPlans)
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

  useEffect(() => { savePlans(plans) }, [plans])
  // Follow the screen size: open when it becomes desktop-wide, close when it shrinks to phone/tablet.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const onChange = (e) => setAiOpen(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const patch = (id, fn) => setPlans((ps) => ps.map((p) => (p.id === id ? fn(p) : p)))
  const activePlan = planModal?.planId && plans.find((p) => p.id === planModal.planId)
  const exPlan = exModal && plans.find((p) => p.id === exModal.planId)
  const sessionPlan = session && plans.find((p) => p.id === session.planId)
  const calPlan = calId && plans.find((p) => p.id === calId)

  const shown = plans.filter((p) =>
    (statusFilter === 'all' || (statusFilter === 'active') === isActive(p)) && (goalFilter === 'all' || p.goal === goalFilter))
  const filtering = statusFilter !== 'all' || goalFilter !== 'all'

  const savePlan = (f) => {
    if (planModal.planId) patch(planModal.planId, (p) => ({ ...p, ...f }))
    else { const p = newPlan(f); setPlans((ps) => [p, ...ps]); setOpenId(p.id); setNewId(p.id); setStatusFilter('all'); setGoalFilter('all') }
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
      {/* When the AI panel is open on a wide screen it sits beside the page, so the page makes room for it */}
      <main className={`min-h-screen bg-[#161616] px-5 pb-28 pt-8 transition-[padding] sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-12 ${aiOpen ? (aiWide ? 'xl:pr-[43rem] 2xl:pr-[51rem]' : 'xl:pr-[31rem] 2xl:pr-[35rem]') : ''}`}>
        <header>
          <h1 className="text-3xl font-bold sm:text-4xl">Workouts</h1>
          <p className="mt-1 text-sm text-ink/80">Plan your week and keep your routines in one place.</p>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setPlanModal({ planId: null })} className={`${goldBtn} flex items-center gap-2 !py-3`}><Plus size={18} /> Create New Plan</button>
          <FilterSelect label="Filter by status" icon={<CalendarDays size={18} />} value={statusFilter} onChange={setStatusFilter}
            options={[['all', 'All Plans'], ['active', 'Active'], ['inactive', 'Inactive']]} />
          <FilterSelect label="Filter by goal" icon={<BarsIcon />} value={goalFilter} onChange={setGoalFilter}
            options={[['all', 'All Goals'], ...GOALS.map((g) => [g, g])]} />
        </div>

        <div className="mt-6 max-w-3xl space-y-3">
          {plans.length === 0 && (
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

      <AskAivoFloating open={aiOpen} onOpen={() => setAiOpen(true)} onClose={() => setAiOpen(false)} suggestions={AI_SUGGESTIONS} wide={aiWide} onToggleWide={() => setAiWide((w) => !w)} />
    </div>
  )
}
