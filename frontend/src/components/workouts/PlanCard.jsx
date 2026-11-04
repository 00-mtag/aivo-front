import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowDown, ArrowUp, CalendarDays, CalendarPlus, ChevronDown, Dumbbell, Flame, Footprints, Pencil, Play, Plus, Target, Trash2, Zap } from 'lucide-react'
import { DAYS, DAY_NAMES, dayCount, isActive, planDescription, planWeeks, timedSeconds } from '../../lib/workouts'
import { ghostBtn, goldBtn } from './Modal'

const SHOWN = 3
const TODAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
const ICON = { Legs: Footprints, Core: Activity, Cardio: Flame, 'Full body': Zap }
const repsLabel = (e) => (timedSeconds(e.reps) != null ? e.reps : `${e.reps} reps`)

const Thumb = ({ muscle }) => {
  const Icon = ICON[muscle] ?? Dumbbell
  return <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#101010] text-gold"><Icon size={20} /></span>
}

// Three-dot menu for one exercise: edit, move, remove.
function Kebab({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-8 place-items-center rounded-lg text-mute transition hover:bg-white/10 hover:text-ink">
        <span className="flex flex-col gap-[3px]"><i className="h-1 w-1 rounded-full bg-current" /><i className="h-1 w-1 rounded-full bg-current" /><i className="h-1 w-1 rounded-full bg-current" /></span>
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#222] py-1 shadow-xl shadow-black/50">
          {items.map(({ label, icon: Icon, onClick, disabled, danger }) => (
            <li key={label}>
              <button type="button" role="menuitem" disabled={disabled} onClick={() => { setOpen(false); onClick() }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent ${danger ? 'text-danger' : ''}`}>
                <Icon size={14} />{label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PlanCard({ plan, open, isNew, onStart, onCalendar, onToggle, onChange, onEditPlan, onDeletePlan, onOpenExercise, onAddExercise }) {
  const firstDay = DAYS.find((d) => plan.schedule[d]?.length)
  const [day, setDay] = useState(plan.schedule[TODAY]?.length ? TODAY : firstDay ?? 'Mon')
  const [showAll, setShowAll] = useState(false)
  const list = plan.schedule[day] ?? []
  const visible = showAll ? list : list.slice(0, SHOWN)
  const active = isActive(plan)
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

  const stats = [
    { icon: CalendarDays, value: `${planWeeks(plan)} ${planWeeks(plan) === 1 ? 'Week' : 'Weeks'}`, label: 'Duration' },
    { icon: Zap, value: `${dayCount(plan)}x / Week`, label: 'Frequency' },
    { icon: Target, value: plan.goal, label: 'Goal' },
  ]

  return (
    <article className={`rounded-2xl border bg-card transition-colors ${open || isNew ? 'border-gold/60' : 'border-white/10'}`}>
      {/* Header: the invisible button underneath opens/closes the card; the small buttons sit on top of it. */}
      <div className="relative flex items-center gap-3 p-4 sm:gap-4">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${plan.name}`}
          className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-gold" />
        <span className={`pointer-events-none grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-gold ${open ? 'border-gold/50' : 'border-white/15'}`}><Dumbbell size={22} /></span>
        <div className="pointer-events-none min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold sm:text-lg">{plan.name}</h3>
            {isNew && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">NEW</span>}
            {open && (
              <button type="button" aria-label="Edit plan" title="Edit plan" onClick={onEditPlan} className="pointer-events-auto relative text-mute transition hover:text-gold"><Pencil size={15} /></button>
            )}
          </div>
          <p className="truncate text-xs text-mute">{planDescription(plan)}</p>
        </div>
        <button type="button" onClick={() => onChange({ ...plan, active: !active })} title={active ? 'Set as inactive' : 'Set as active'}
          className={`pointer-events-auto relative flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-white/10 bg-white/10 text-mute hover:text-ink'}`}>
          {active && <span className="h-1.5 w-1.5 rounded-full bg-green-400" />}{active ? 'Active' : 'Inactive'}
        </button>
        {!open && (
          <button type="button" aria-label={`Delete ${plan.name}`} title="Delete plan" onClick={onDeletePlan}
            className="pointer-events-auto relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mute transition hover:bg-danger/10 hover:text-danger"><Trash2 size={18} /></button>
        )}
        <ChevronDown size={20} className={`pointer-events-none shrink-0 text-gold transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="px-4 pb-5">
          <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex min-w-0 items-center gap-2.5 px-3 first:pl-0">
                <Icon size={22} className="shrink-0 text-gold" />
                <div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">{value}</p><p className="text-xs text-mute">{label}</p></div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={18} className="text-mute" /> Weekly Schedule</p>
              <p className="text-[11px] text-mute">{plan.minutes} min / session · {plan.level}</p>
            </div>
            <div role="tablist" aria-label="Weekly schedule" className="mt-3 grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => (
                <button key={d} type="button" role="tab" aria-selected={d === day} onClick={() => { setDay(d); setShowAll(false) }}
                  className={`relative rounded-full py-2.5 text-xs font-semibold transition ${d === day ? 'bg-gold text-black' : 'border border-white/10 bg-black/20 hover:border-white/30'}`}>
                  {d}
                  {plan.schedule[d]?.length > 0 && <span className={`absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full ${d === day ? 'bg-black' : 'bg-gold'}`} />}
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-center text-sm text-mute">{DAY_NAMES[day]} is a rest day. Add an exercise to make it a training day.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
              {visible.map((e, i) => (
                <li key={e.id} className="flex items-center gap-2 px-3 py-3">
                  <button type="button" onClick={() => onOpenExercise(day, e, false)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Thumb muscle={e.muscle} />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{e.name}</span><span className="block text-xs text-mute">{e.sets} sets • {repsLabel(e)}</span></span>
                  </button>
                  <button type="button" aria-label={`View ${e.name}`} onClick={() => onOpenExercise(day, e, false)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/30 transition hover:border-gold hover:text-gold"><Play size={14} /></button>
                  <span className="h-6 w-px bg-white/10" />
                  <Kebab items={[
                    { label: 'Edit exercise', icon: Pencil, onClick: () => onOpenExercise(day, e, true) },
                    { label: 'Move up', icon: ArrowUp, disabled: i === 0, onClick: () => move(i, -1) },
                    { label: 'Move down', icon: ArrowDown, disabled: i === list.length - 1, onClick: () => move(i, 1) },
                    { label: 'Remove', icon: Trash2, danger: true, onClick: () => remove(e.id) },
                  ]} />
                </li>
              ))}
            </ul>
          )}

          {list.length > SHOWN && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => setShowAll((s) => !s)} className="flex items-center gap-2 rounded-full border border-gold/60 px-5 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10">
                {showAll ? 'Show Fewer Exercises' : `Show More Exercises (${list.length - SHOWN})`}
                <ChevronDown size={14} className={showAll ? 'rotate-180' : ''} />
              </button>
            </div>
          )}

          <button type="button" onClick={() => onAddExercise(day)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
            <Plus size={16} /> Add exercise
          </button>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button type="button" disabled={!startDay} onClick={() => onStart(startDay)} className={`${goldBtn} flex items-center gap-2`}>
              <Play size={16} /> {startDay ? `Start ${DAY_NAMES[startDay]} workout` : 'Start workout'}
            </button>
            <button type="button" onClick={onCalendar} className={`${ghostBtn} flex items-center gap-2`}><CalendarPlus size={16} /> Add to calendar</button>
            <button type="button" onClick={onDeletePlan} className="ml-auto text-xs font-semibold text-danger transition hover:underline">Delete plan</button>
          </div>
          {!startDay && <p className="mt-2 text-[11px] text-mute">Add at least one exercise to a day to start a workout.</p>}
        </div>
      )}
    </article>
  )
}
