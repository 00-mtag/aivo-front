import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, CalendarDays, CalendarPlus, ChevronDown, Copy, Dumbbell, Lightbulb, Pencil, Play, Plus, Target, Timer, Trash2, Zap } from 'lucide-react'
import { DAYS, DAY_NAMES, dayCount, exerciseCount, exerciseLine, exerciseTarget, isActive, placeLabel, planDescription, planWeeks } from '../../lib/workouts'
import { ConfirmModal, ghostBtn, goldBtn } from './Modal'
import { GOAL_META } from './controls'

const SHOWN = 4
const todayName = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

// A three-dot menu. It floats above the page (so no card can clip it), opens upward when there is
// no room below, and closes when you tap outside, press Escape, or pick an item.
function Menu({ items, label = 'More options' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const place = () => {
    const b = btnRef.current?.getBoundingClientRect()
    const m = menuRef.current
    if (!b || !m) return
    const w = m.offsetWidth, h = m.offsetHeight, gap = 6, edge = 8
    const left = Math.min(Math.max(edge, b.right - w), window.innerWidth - w - edge)
    const room = { below: window.innerHeight - b.bottom - edge, above: b.top - edge }
    let top
    if (room.below >= h + gap) top = b.bottom + gap                    // fits below
    else if (room.above >= h + gap) top = b.top - h - gap              // fits above
    else top = Math.max(edge, window.innerHeight - h - edge)           // tall menu on a short screen: scrolls inside
    setPos({ left, top })
  }

  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <>
      <button ref={btnRef} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-9 place-items-center rounded-lg text-mute transition hover:bg-white/10 hover:text-ink">
        <span className="flex flex-col gap-[3px]" aria-hidden="true"><i className="h-1 w-1 rounded-full bg-current" /><i className="h-1 w-1 rounded-full bg-current" /><i className="h-1 w-1 rounded-full bg-current" /></span>
      </button>
      {open && createPortal(
        <ul ref={menuRef} role="menu" aria-label={label}
          className="fixed w-52 overflow-y-auto rounded-xl border border-white/10 bg-[#222] py-1 shadow-xl shadow-black/50"
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden', zIndex: 58, maxHeight: 'calc(100dvh - 16px)' }}>
          {items.map(({ label: text, icon: Icon, onClick, disabled, danger }) => (
            <li key={text}>
              <button type="button" role="menuitem" disabled={disabled} onClick={() => { setOpen(false); onClick() }}
                className={`flex w-full items-center gap-2.5 px-3 py-3 text-left text-xs transition hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent ${danger ? 'text-danger' : ''}`}>
                <Icon size={14} />{text}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  )
}

export default function PlanCard({ plan, open, isNew, onStart, onCalendar, onToggle, onChange, onEditPlan, onDeletePlan, onDuplicate, onOpenExercise, onAddExercise }) {
  const today = todayName()
  const firstDay = DAYS.find((d) => plan.schedule[d]?.length)
  const [day, setDay] = useState(plan.schedule[today]?.length ? today : firstDay ?? today)
  const [showAll, setShowAll] = useState(false)
  const [removing, setRemoving] = useState(null)   // exercise waiting for a "yes, remove it"
  const list = plan.schedule[day] ?? []
  const visible = showAll ? list : list.slice(0, SHOWN)
  const active = isActive(plan)
  const total = exerciseCount(plan)
  const startDay = list.length ? day : plan.schedule[today]?.length ? today : firstDay
  const GoalIcon = GOAL_META[plan.goal]?.icon ?? Dumbbell

  const setList = (next) => onChange({ ...plan, schedule: { ...plan.schedule, [day]: next } })
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]]
    setList(next)
  }

  const stats = [
    { icon: CalendarDays, value: `${planWeeks(plan)} ${planWeeks(plan) === 1 ? 'week' : 'weeks'}`, label: 'Duration' },
    { icon: Zap, value: `${dayCount(plan)}x a week`, label: 'Frequency' },
    { icon: Target, value: plan.goal || 'Any', label: 'Goal' },
  ]
  const plural = (n) => `${n} exercise${n === 1 ? '' : 's'}`

  return (
    <article className={`rounded-2xl border bg-card transition-colors ${open || isNew ? 'border-gold/60' : 'border-white/10'}`}>
      <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${plan.name}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-gold">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-gold ${open ? 'border-gold/50 bg-gold/10' : 'border-white/15 bg-white/5'}`}><GoalIcon size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-base font-bold sm:text-lg">{plan.name}</span>
              {isNew && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">NEW</span>}
            </span>
            <span className="block truncate text-xs text-mute">{planDescription(plan)}</span>
            <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-ink/80">
              {[plan.level, `${plan.minutes} min`, placeLabel(plan.equipment), plural(total)].map((t) => <span key={t} className="rounded-md bg-white/8 px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,.07)' }}>{t}</span>)}
            </span>
          </span>
          <ChevronDown size={20} className={`shrink-0 text-gold transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:gap-2">
          <button type="button" role="switch" aria-checked={active} aria-label={`${plan.name} is ${active ? 'active' : 'inactive'}`} onClick={() => onChange({ ...plan, active: !active })}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${active ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-white/10 bg-white/10 text-mute hover:text-ink'}`}>
            {active && <span className="h-1.5 w-1.5 rounded-full bg-green-400" />}{active ? 'Active' : 'Inactive'}
          </button>
          <Menu items={[
            { label: 'Edit plan', icon: Pencil, onClick: onEditPlan },
            { label: 'Duplicate plan', icon: Copy, onClick: onDuplicate },
            { label: 'Add to calendar', icon: CalendarPlus, onClick: onCalendar },
            { label: 'Delete plan', icon: Trash2, danger: true, onClick: onDeletePlan },
          ]} />
        </div>
      </div>

      {/* Collapsed: a quick look at the week and a one-tap start */}
      {!open && (
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <div className="flex gap-1.5" aria-label="Training days">
            {DAYS.map((d) => {
              const on = plan.schedule[d]?.length > 0
              return <span key={d} title={`${DAY_NAMES[d]}${on ? `: ${plural(plan.schedule[d].length)}` : ': rest'}`}
                className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold ${on ? 'bg-gold text-black' : 'bg-white/8 text-mute'} ${d === today ? 'ring-1 ring-gold ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                style={on ? undefined : { background: 'rgba(255,255,255,.07)' }}>{d[0]}</span>
            })}
          </div>
          {plan.schedule[today]?.length > 0
            ? <button type="button" onClick={() => onStart(today)} className={`${goldBtn} flex items-center gap-1.5 !px-4 !py-2 text-xs`}><Play size={14} /> Start today</button>
            : <button type="button" onClick={onToggle} className="text-xs font-semibold text-gold hover:underline">{total ? 'Open plan' : 'Add exercises'}</button>}
        </div>
      )}

      {open && (
        <div className="px-4 pb-5">
          <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex min-w-0 items-center gap-2 px-2 first:pl-0 sm:gap-2.5 sm:px-3">
                <Icon size={20} className="hidden shrink-0 text-gold sm:block" />
                <div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">{value}</p><p className="text-[11px] text-mute">{label}</p></div>
              </div>
            ))}
          </div>

          {total === 0 && (
            <div className="mt-4 flex gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-gold" />
              <p className="text-ink/90"><b>Next step:</b> tap a day below, then tap <b>Add exercise</b>. Days with exercises become your training days.</p>
            </div>
          )}

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={18} className="text-mute" /> Weekly schedule</p>
              <p className="text-[11px] text-mute">{plan.minutes} min a session</p>
            </div>
            <div role="tablist" aria-label="Weekly schedule" className="mt-3 grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => (
                <button key={d} type="button" role="tab" aria-selected={d === day} onClick={() => { setDay(d); setShowAll(false) }}
                  className={`relative rounded-full py-2.5 text-xs font-semibold transition ${d === day ? 'bg-gold text-black' : 'border border-white/10 bg-black/20 hover:border-white/30'}`}>
                  {d}
                  {plan.schedule[d]?.length > 0 && <span className={`absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full ${d === day ? 'bg-black' : 'bg-gold'}`} />}
                  {d === today && <span className={`absolute -bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full ${d === day ? 'bg-black' : 'bg-gold'}`} />}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-mute">{DAY_NAMES[day]}{day === today ? ' (today)' : ''}: {list.length ? plural(list.length) : 'rest day'}</p>
          </div>

          {list.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-white/15 p-4 text-center text-sm text-mute">{DAY_NAMES[day]} is a rest day. Add an exercise to make it a training day.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
              {visible.map((e, i) => {
                const timed = exerciseTarget(e).timed
                return (
                  <li key={e.id} className="flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3">
                    <button type="button" onClick={() => onOpenExercise(day, e, false)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#101010] text-gold">{timed ? <Timer size={18} /> : <Dumbbell size={18} />}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{e.name}{e.custom && <span className="ml-2 rounded-md bg-gold/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-gold">Mine</span>}</span>
                        <span className="block text-xs text-mute">{exerciseLine(e)}</span>
                      </span>
                    </button>
                    <Menu label={`Options for ${e.name}`} items={[
                      { label: 'Edit exercise', icon: Pencil, onClick: () => onOpenExercise(day, e, true) },
                      { label: 'Move up', icon: ArrowUp, disabled: i === 0, onClick: () => move(i, -1) },
                      { label: 'Move down', icon: ArrowDown, disabled: i === list.length - 1, onClick: () => move(i, 1) },
                      { label: 'Remove', icon: Trash2, danger: true, onClick: () => setRemoving(e) },
                    ]} />
                  </li>
                )
              })}
            </ul>
          )}

          {list.length > SHOWN && (
            <div className="mt-3 flex justify-center">
              <button type="button" onClick={() => setShowAll((s) => !s)} className="flex items-center gap-2 rounded-full border border-gold/60 px-5 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10">
                {showAll ? 'Show fewer' : `Show ${list.length - SHOWN} more`}
                <ChevronDown size={14} className={showAll ? 'rotate-180' : ''} />
              </button>
            </div>
          )}

          <button type="button" onClick={() => onAddExercise(day)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 py-3.5 text-sm font-semibold text-gold transition hover:bg-gold/10 active:scale-[0.99]">
            <Plus size={16} /> Add exercise to {DAY_NAMES[day]}
          </button>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button type="button" disabled={!startDay} onClick={() => onStart(startDay)} className={`${goldBtn} flex items-center gap-2`}>
              <Play size={16} /> {startDay ? `Start ${DAY_NAMES[startDay]}` : 'Start workout'}
            </button>
            <button type="button" onClick={onCalendar} className={`${ghostBtn} flex items-center gap-2`}><CalendarPlus size={16} /> Calendar</button>
          </div>
          {!startDay && <p className="mt-2 text-[11px] text-mute">Add at least one exercise to a day to start a workout.</p>}
        </div>
      )}

      {removing && (
        <ConfirmModal title="Remove exercise?" text={`"${removing.name}" will be removed from ${DAY_NAMES[day]}.`} confirmLabel="Remove" danger
          onClose={() => setRemoving(null)} onConfirm={() => { setList(list.filter((x) => x.id !== removing.id)); setRemoving(null) }} />
      )}
    </article>
  )
}
