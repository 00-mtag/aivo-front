import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Droplet, Dumbbell, UtensilsCrossed, X } from 'lucide-react'
import { ProgressBar, fmt } from './ui'

const TABS = [
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'water', label: 'Water', icon: Droplet },
]

const Mini = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-center">
    <p className="text-lg font-bold text-gold">{value}</p>
    <p className="text-[11px] text-white/50">{label}</p>
  </div>
)
const Chip = ({ children, tone = 'gold' }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone === 'red' ? 'bg-red-500/15 text-red-400' : 'bg-gold/15 text-gold'}`}>{children}</span>
)
const DayBox = ({ day, right, children }) => (
  <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-sm font-semibold">{day.label} <span className="font-normal text-white/40">{day.shortDate}</span></p>
      {right}
    </div>
    {children}
  </div>
)
const Empty = ({ text, to, cta }) => (
  <div className="rounded-xl border border-dashed border-white/15 p-6 text-center">
    <p className="text-sm text-white/60">{text}</p>
    <Link to={to} className="mt-3 inline-block rounded-full bg-gold px-5 py-2 text-xs font-semibold text-black">{cta}</Link>
  </div>
)

export default function WeekDetail({ progress, tab, onTab, onClose, root }) {
  const { days, totals, targets, range } = progress
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [])

  const workoutDays = days.filter(d => d.workouts.length || d.status === 'missed')
  const foodDays = days.filter(d => d.meals.length)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="week-detail-title"
        className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#121212] sm:max-w-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
          <div>
            <h2 id="week-detail-title" className="text-lg font-bold">Week details</h2>
            <p className="text-xs text-white/50">{range}</p>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </header>

        <div role="tablist" className="grid grid-cols-3 gap-2 p-3 sm:px-5">
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition sm:text-sm ${tab === t.id ? 'bg-gold/15 text-gold' : 'text-white/60 hover:bg-white/5'}`}>
              <t.icon size={16} />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 pt-1 sm:px-5 sm:pb-5">
          {tab === 'workouts' && (<>
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Completed" value={`${totals.workoutsDone}/${targets.workoutsPerWeek}`} />
              <Mini label="Active minutes" value={totals.minutes} />
              <Mini label="Planned days" value={days.filter(d => d.plan).length} />
            </div>
            {workoutDays.length === 0
              ? <Empty text="No workouts completed this week yet." to={`${root}/workouts`} cta="Go to Workouts" />
              : workoutDays.map(d => (
                <DayBox key={d.key} day={d} right={d.status === 'missed' ? <Chip tone="red">Missed</Chip> : <Chip>{d.minutes} min</Chip>}>
                  {d.status === 'missed' && <p className="text-xs text-white/50">{d.plan?.name || 'Workout'} was planned but not completed.</p>}
                  {d.workouts.map(w => (
                    <div key={w.id} className="mt-1">
                      <p className="text-sm text-white">{w.name}</p>
                      {w.exercises?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {w.exercises.map((e, i) => <span key={i} className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/70">{e.name}{e.sets ? ` ${e.sets}×${e.reps}` : ''}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </DayBox>
              ))}
          </>)}

          {tab === 'food' && (<>
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Avg. kcal a day" value={fmt(totals.avgCalories)} />
              <Mini label="Avg. protein" value={`${totals.avgProtein} g`} />
              <Mini label="Meals logged" value={totals.mealsLogged} />
            </div>
            {foodDays.length === 0
              ? <Empty text="No meals logged this week yet." to={`${root}/nutrition`} cta="Open meal plan" />
              : foodDays.map(d => (
                <DayBox key={d.key} day={d} right={<span className="text-xs text-white/60">{fmt(d.calories)} kcal, {d.protein} g protein</span>}>
                  <ProgressBar value={d.calories} goal={targets.calories} color={d.calories > targets.calories * 1.1 ? 'bg-red-500' : 'bg-gold'} />
                  <ul className="mt-3 divide-y divide-white/5">
                    {d.meals.map(m => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0"><p className="text-[11px] text-white/40">{m.type}</p><p className="truncate text-sm">{m.name}</p></div>
                        <p className="shrink-0 text-xs text-white/60">{fmt(m.calories)} kcal</p>
                      </li>
                    ))}
                  </ul>
                </DayBox>
              ))}
          </>)}

          {tab === 'water' && (<>
            <div className="grid grid-cols-2 gap-2">
              <Mini label="Avg. a day" value={`${totals.avgWater} L`} />
              <Mini label="Daily goal" value={`${targets.water} L`} />
            </div>
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
              {days.map(d => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="w-9 text-xs text-white/60">{d.label}</span>
                  <div className="flex-1"><ProgressBar value={d.water} goal={targets.water} color={d.water >= targets.water ? 'bg-emerald-400' : 'bg-gold'} /></div>
                  <span className="w-12 text-right text-xs text-white/60">{d.water} L</span>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
