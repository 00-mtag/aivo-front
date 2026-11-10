import { Check, Dumbbell, Moon, X } from 'lucide-react'
import { Card, CardTitle } from './ui'
import { Link } from 'react-router-dom'

const STYLE = {
  done: { box: 'border-gold/60 bg-gold/10', icon: Check, text: 'text-gold', label: 'Done' },
  todo: { box: 'border-white/25', icon: Dumbbell, text: 'text-white/80', label: 'To do' },
  missed: { box: 'border-red-500/40 bg-red-500/5', icon: X, text: 'text-red-400', label: 'Missed' },
  rest: { box: 'border-white/5 opacity-60', icon: Moon, text: 'text-white/40', label: 'Rest' },
}

export default function WorkoutStrip({ progress, onDetails, root }) {
  const { days, totals, targets } = progress
  const hasPlan = days.some(d => d.plan) || totals.workoutsDone > 0
  return (
    <Card className="lg:col-span-8">
      <CardTitle icon={Dumbbell} action={<button onClick={onDetails} className="text-xs text-gold hover:underline">See details</button>}>Workout progress</CardTitle>
      {hasPlan ? (<>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map(d => {
            const s = STYLE[d.status], Icon = s.icon
            return (
              <div key={d.key} className={`flex flex-col items-center rounded-xl border px-1 py-3 text-center ${s.box} ${d.isToday ? 'ring-1 ring-gold' : ''}`}>
                <p className="text-[11px] text-white/60 sm:text-xs">{d.label}</p>
                <Icon size={18} className={`my-2 ${s.text}`} />
                <p className={`text-[11px] font-semibold sm:text-xs ${s.text}`}>{d.status === 'done' ? `${d.minutes}m` : s.label}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
          <p>{totals.workoutsDone} of {targets.workoutsPerWeek} weekly workouts done, {totals.minutes} active minutes.</p>
          <p className="flex gap-3"><span className="text-gold">Done</span><span className="text-white/70">To do</span><span className="text-red-400">Missed</span><span>Rest</span></p>
        </div>
      </>) : (
        <div className="rounded-xl border border-dashed border-white/15 p-6 text-center">
          <p className="text-sm text-white/60">Start or create your workout plan. Completed workouts show up here day by day.</p>
          <Link to={`${root}/workouts`} className="mt-3 inline-block rounded-full bg-gold px-5 py-2 text-xs font-semibold text-black">Go to Workouts</Link>
        </div>
      )}
    </Card>
  )
}
