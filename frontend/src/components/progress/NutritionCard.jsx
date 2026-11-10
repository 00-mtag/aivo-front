import { Droplet, Flame, UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardTitle, ProgressBar, fmt } from './ui'

function Row({ icon: Icon, label, value, goal, unit, over }) {
  const diff = goal - value
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-white/80"><Icon size={14} className="text-gold" />{label}</span>
        <span className="text-white/50">{fmt(value)} / {fmt(goal)} {unit}</span>
      </div>
      <ProgressBar value={value} goal={goal} color={over ? 'bg-red-500' : 'bg-gold'} />
      <p className={`mt-1 text-[11px] ${over ? 'text-red-400' : 'text-white/40'}`}>
        {over ? `${fmt(-diff)} ${unit} over` : `${unit === 'L' ? Math.round(diff * 10) / 10 : fmt(diff)} ${unit} left`}
      </p>
    </div>
  )
}

export default function NutritionCard({ progress, onDetails, root }) {
  const { today, totals, targets, weekOffset } = progress
  const live = weekOffset === 0 && today
  const cal = live ? today.calories : totals.avgCalories
  const pro = live ? today.protein : totals.avgProtein
  const wat = live ? today.water : totals.avgWater
  const empty = !cal && !pro && !wat
  return (
    <Card className="lg:col-span-4">
      <CardTitle icon={UtensilsCrossed} action={<button onClick={onDetails} className="text-xs text-gold hover:underline">See details</button>}>
        {live ? 'Nutrition today' : 'Daily average'}
      </CardTitle>
      {empty ? (
        <div className="rounded-xl border border-dashed border-white/15 p-6 text-center">
          <p className="text-sm text-white/60">No meals logged {live ? 'today' : 'this week'}.</p>
          <Link to={`${root}/nutrition`} className="mt-3 inline-block rounded-full bg-gold px-5 py-2 text-xs font-semibold text-black">Create meal plan</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Row icon={Flame} label="Calories" value={cal} goal={targets.calories} unit="kcal" over={cal > targets.calories * 1.1} />
          <Row icon={UtensilsCrossed} label="Protein" value={pro} goal={targets.protein} unit="g" />
          <Row icon={Droplet} label="Water" value={wat} goal={targets.water} unit="L" />
        </div>
      )}
    </Card>
  )
}
