import { Check, Moon, Play } from 'lucide-react'
import { DAYS, DAY_NAMES, exerciseCount, isActive, placeLabel } from '../../lib/workouts'
import { goldBtn } from './Modal'

// "Your week": tap a day to see what is planned, tap Start to begin.
export default function WeekStrip({ plans, done = [], today, selected, onSelect, onStart, onCreate }) {
  const active = plans.filter(isActive)
  const byDay = Object.fromEntries(DAYS.map((d) => [d, active.filter((p) => p.schedule[d]?.length)]))
  const list = byDay[selected] ?? []
  const doneCount = done.filter(Boolean).length
  const planned = DAYS.filter((d) => byDay[d].length).length

  return (
    <section aria-label="Your week" className="rounded-2xl border border-white/10 bg-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">Your week</h2>
        {planned > 0 && <p className="text-xs text-mute">{doneCount} of {planned} workouts done</p>}
      </div>

      <div role="tablist" aria-label="Days of the week" className="mt-3 grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => {
          const n = byDay[d].length
          const isSel = d === selected
          return (
            <button key={d} type="button" role="tab" aria-selected={isSel} onClick={() => onSelect(d)} title={DAY_NAMES[d]}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition active:scale-95 ${isSel ? 'border-gold bg-gold/15' : 'border-white/10 bg-black/20 hover:border-white/30'} ${d === today ? 'ring-1 ring-gold/60' : ''}`}>
              <span className={`text-[11px] font-semibold ${isSel ? 'text-gold' : 'text-mute'}`}>{d}</span>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${done[i] ? 'bg-green-500 text-black' : n ? 'bg-gold text-black' : 'bg-white/10 text-mute'}`} style={n || done[i] ? undefined : { background: 'rgba(255,255,255,.08)' }}>
                {done[i] ? <Check size={13} strokeWidth={3} /> : n || ''}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4" aria-live="polite">
        <p className="mb-2 text-xs font-semibold text-mute">{DAY_NAMES[selected]}{selected === today ? ' (today)' : ''}</p>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-4 text-center">
            <p className="text-sm text-mute">No active plans yet. Create one and your week fills in here.</p>
            <button type="button" onClick={onCreate} className={`${goldBtn} mt-3 !py-2`}>Create a plan</button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <Moon size={22} className="shrink-0 text-gold" />
            <p className="text-sm text-ink/90">Rest day. Stretch, walk, or recover. Rest is part of the plan.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="truncate text-xs text-mute">{p.schedule[selected].length} exercises · about {p.minutes} min · {placeLabel(p.equipment)}</p>
                </div>
                {done[DAYS.indexOf(selected)] && <span className="rounded-full bg-green-500/15 px-2 py-1 text-[11px] font-semibold text-green-400">Done</span>}
                <button type="button" onClick={() => onStart(p.id, selected)} className={`${goldBtn} flex shrink-0 items-center gap-1.5 !px-4 !py-2 text-xs`}><Play size={14} /> Start</button>
              </li>
            ))}
          </ul>
        )}
        {active.length > 0 && active.every((p) => exerciseCount(p) === 0) && (
          <p className="mt-2 text-[11px] text-mute">Your plan has no exercises yet. Open it below and add some to each day.</p>
        )}
      </div>
    </section>
  )
}
