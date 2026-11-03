import { useNavigate, useLocation } from 'react-router-dom'
import { Clock, Dumbbell, Flame, Target, UtensilsCrossed } from 'lucide-react'
import { Card, IconBox } from './Cards'
import { buildPlanFromRec } from '../../lib/recommend'
import { loadPlans, savePlans } from '../../lib/workouts'

export default function Suggestions({ rec }) {
  const navigate = useNavigate()
  const root = useLocation().pathname.startsWith('/preview') ? '/preview' : '/app'
  const added = loadPlans().some((p) => p.name === rec.workout.name)

  const addToPlans = () => {
    if (!added) savePlans([buildPlanFromRec(rec), ...loadPlans()])
    navigate(`${root}/workouts`)
  }
  const shown = rec.workout.exercises.slice(0, 5)

  return (
    <Card className="border-gold/60">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <IconBox icon={Target} />
        <div className="flex-1"><p className="text-sm font-semibold">Recommended for you</p><p className="text-[10px] text-mute">Based on your goal and experience</p></div>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold tracking-wide text-gold">SUGGESTED WORKOUT</p>
        <p className="mt-1 text-base font-bold">{rec.workout.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mute">
          <span className="flex items-center gap-1"><Clock size={12} />{rec.workout.minutes} min</span>
          <span className="flex items-center gap-1"><Dumbbell size={12} className="text-gold" />{rec.level}</span>
          <span className="flex items-center gap-1"><Flame size={12} className="text-orange-400" />~{rec.workout.kcal} kcal</span>
          <span>{rec.perWeek} days / week</span>
        </div>
        <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10">
          {shown.map((e) => (
            <li key={e.name} className="flex items-center justify-between px-3 py-2 text-xs">
              <span>{e.name}</span><span className="font-semibold text-gold">{e.sets} × {e.reps}</span>
            </li>
          ))}
        </ul>
        {rec.workout.exercises.length > shown.length && <p className="mt-1.5 text-[10px] text-mute">+ {rec.workout.exercises.length - shown.length} more in the full plan</p>}
        <button type="button" onClick={addToPlans} className="mt-4 w-full rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110">
          {added ? 'View in my workouts' : 'Add to my plans'}
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold"><UtensilsCrossed size={15} className="text-gold" /> Meal plan</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">Coming soon</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-mute">Your target is about {rec.calories.toLocaleString()} kcal a day with {rec.protein} g of protein. Meals built around this are on the way.</p>
      </div>
    </Card>
  )
}
