import { useState } from 'react'
import { ArrowDown, ArrowUp, CalendarPlus, ChevronDown, Dumbbell, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { DAYS, DAY_NAMES, dayCount, exerciseCount } from '../../lib/workouts'
import { ghostBtn, goldBtn } from './Modal'

const SHOWN = 4
const TODAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
const iconBtn = 'grid h-8 w-8 place-items-center rounded-lg text-mute transition hover:bg-white/10 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent'

export default function PlanCard({ plan, open, isNew, onStart, onCalendar, onToggle, onChange, onEditPlan, onDeletePlan, onOpenExercise, onAddExercise }) {
  const firstDay = DAYS.find((d) => plan.schedule[d]?.length)
  const [day, setDay] = useState(plan.schedule[TODAY]?.length ? TODAY : firstDay ?? 'Mon')
  const [showAll, setShowAll] = useState(false)
  const list = plan.schedule[day] ?? []
  const visible = showAll ? list : list.slice(0, SHOWN)
  const trainingDays = DAYS.filter((d) => plan.schedule[d]?.length)
  // Start the day shown in the tabs; if that day is empty, fall back to today or the first training day.
  const startDay = list.length ? day : plan.schedule[TODAY]?.length ? TODAY : firstDay

  const setList = (next) => onChange({ ...plan, schedule: { ...plan.schedule, [day]: next } })
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]; [next[i], next[j]] = [next[j], next[i]]
    setList(next)
  }
  const remove = (id) => { if (window.confirm('Remove this exercise?')) setList(list.filter((e) => e.id !== id)) }

  return (
    <article className={`rounded-xl border bg-card transition-colors ${open || isNew ? 'border-gold/50' : 'border-white/10'}`}>
      <div className="flex items-center">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-4 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 text-gold"><Dumbbell size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2"><span className="truncate font-semibold">{plan.name}</span>{isNew && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">NEW</span>}</span>
          <span className="block text-xs text-mute">{plan.goal} · {plan.level}</span>
        </span>
        <span className="hidden text-xs text-mute sm:block">{plan.minutes} min · {dayCount(plan)} days/wk · {exerciseCount(plan)} exercises</span>
        <ChevronDown size={20} className={`shrink-0 text-gold transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
        {/* Quick delete: only while the card is collapsed */}
        {!open && (
          <button type="button" aria-label={`Delete ${plan.name}`} title="Delete plan" onClick={onDeletePlan}
            className="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mute transition hover:bg-danger/10 hover:text-danger">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-white/10 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Duration', `${plan.minutes} min / session`], ['Goal', plan.goal], ['Level', plan.level], ['Schedule', trainingDays.length ? trainingDays.join(' · ') : 'No days yet']].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] text-mute">{k}</p><p className="mt-0.5 text-sm font-semibold">{v}</p></div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={!startDay} onClick={() => onStart(startDay)} className={`${goldBtn} flex items-center gap-2`}>
              <Play size={16} /> {startDay ? `Start ${DAY_NAMES[startDay]} workout` : 'Start workout'}
            </button>
            <button type="button" onClick={onCalendar} className={`${ghostBtn} flex items-center gap-2`}><CalendarPlus size={16} /> Add to calendar</button>
          </div>
          {!startDay && <p className="mt-2 text-[11px] text-mute">Add at least one exercise to a day to start a workout.</p>}

          <div role="tablist" aria-label="Weekly schedule" className="mt-5 grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => (
              <button key={d} type="button" role="tab" aria-selected={d === day} onClick={() => { setDay(d); setShowAll(false) }}
                className={`relative rounded-lg py-2 text-xs font-semibold transition ${d === day ? 'bg-gold text-black' : 'border border-white/10 hover:border-white/30'}`}>
                {d}
                {plan.schedule[d]?.length > 0 && <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${d === day ? 'bg-black' : 'bg-gold'}`} />}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-semibold">{DAY_NAMES[day]} <span className="font-normal text-mute">· {list.length ? `${list.length} exercises` : 'Rest day'}</span></p>
          </div>

          {list.length === 0 && <p className="mt-3 rounded-lg border border-dashed border-white/15 p-4 text-center text-sm text-mute">Nothing planned. Add an exercise to make this a training day.</p>}

          <ul className="mt-3 space-y-2">
            {visible.map((e, i) => (
              <li key={e.id} className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 pr-1.5">
                <button type="button" onClick={() => onOpenExercise(day, e, false)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                  <span className="w-5 text-xs text-mute">{i + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{e.name}</span><span className="block text-[11px] text-mute">{e.muscle}</span></span>
                  <span className="text-sm font-semibold text-gold">{e.sets} × {e.reps}</span>
                </button>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}><ArrowUp size={15} /></button>
                <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} className={iconBtn}><ArrowDown size={15} /></button>
                <button type="button" aria-label="Edit exercise" onClick={() => onOpenExercise(day, e, true)} className={iconBtn}><Pencil size={15} /></button>
                <button type="button" aria-label="Remove exercise" onClick={() => remove(e.id)} className={`${iconBtn} hover:!text-danger`}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>

          {list.length > SHOWN && (
            <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-3 w-full text-center text-xs font-semibold text-gold hover:underline">
              {showAll ? 'Show fewer exercises' : `Show more exercises (${list.length - SHOWN})`}
            </button>
          )}

          <button type="button" onClick={() => onAddExercise(day)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
            <Plus size={16} /> Add exercise
          </button>

          <div className="mt-5 flex justify-end gap-4 border-t border-white/10 pt-4 text-xs font-semibold">
            <button type="button" onClick={onEditPlan} className="text-mute transition hover:text-ink">Edit plan</button>
            <button type="button" onClick={onDeletePlan} className="text-danger transition hover:underline">Delete plan</button>
          </div>
        </div>
      )}
    </article>
  )
}
