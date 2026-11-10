import { ChevronRight } from 'lucide-react'
import { Ring } from './ui'

// Compact, clickable summary. Opens the WeekDetail panel.
export default function WeekCard({ progress, onOpen }) {
  const { totals, targets, days, range } = progress
  const goal = targets.workoutsPerWeek
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="group flex w-full items-center gap-3 rounded-2xl border border-gold/60 bg-black p-3 text-left transition hover:border-gold hover:bg-[#0b0b0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sm:gap-4 sm:p-4"
    >
      <Ring value={totals.workoutsDone} goal={goal} size={60} stroke={6}>
        <span className="text-base font-extrabold leading-none text-gold">{totals.workoutsDone}<span className="text-[10px] font-medium text-white/50">/{goal}</span></span>
      </Ring>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-white">This week</p>
          <p className="truncate text-[11px] text-white/40">{range}</p>
        </div>
        <p className="truncate text-xs text-white/60">
          {totals.workoutsDone} of {goal} workouts{totals.foodDays ? `, ${totals.avgCalories.toLocaleString()} kcal a day` : ''}
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {days.map(d => (
            <span key={d.key} className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${
              d.status === 'done' ? 'bg-gold text-black' : d.isToday ? 'border border-gold text-gold' : 'bg-white/10 text-white/40'}`}>
              {d.label[0]}
            </span>
          ))}
        </div>
      </div>
      <span className="hidden items-center gap-1 text-xs text-gold sm:flex">Details<ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></span>
      <ChevronRight size={18} className="text-gold sm:hidden" />
    </button>
  )
}
