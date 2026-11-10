import { Flame, Scale } from 'lucide-react'
import { Card, CardTitle, fmt } from './ui'

export function CaloriesChart({ progress }) {
  const { days, targets, totals } = progress
  const max = Math.max(targets.calories * 1.25, ...days.map(d => d.calories))
  return (
    <Card className="lg:col-span-7">
      <CardTitle icon={Flame}>Calories this week</CardTitle>
      <div className="relative flex h-36 items-end gap-2 sm:gap-3">
        <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-gold/70" style={{ bottom: `${(targets.calories / max) * 100}%` }} />
        {days.map(d => (
          <div key={d.key} className="flex h-full flex-1 items-end" title={`${d.label}: ${fmt(d.calories)} kcal`}>
            <div className={`w-full rounded-t-lg ${d.calories === 0 ? 'bg-white/10' : d.calories > targets.calories * 1.1 ? 'bg-red-500/80' : 'bg-gold'}`}
              style={{ height: d.calories === 0 ? 4 : `${(d.calories / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {days.map(d => <span key={d.key} className={`flex-1 text-center text-[11px] ${d.isToday ? 'font-semibold text-gold' : 'text-white/50'}`}>{d.label}</span>)}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
        <span><span className="text-gold">Dashed line</span> is your {fmt(targets.calories)} kcal target</span>
        <span><span className="text-red-400">Red bars</span> are more than 10% over</span>
        <span>Average: {fmt(totals.avgCalories)} kcal</span>
      </p>
    </Card>
  )
}

export function WeightCard({ progress }) {
  const { series, start, now, change } = progress.weight
  const w = 320, h = 110, pad = 10
  let chart = <p className="py-8 text-center text-sm text-white/50">Log your weight at least twice to see a trend.</p>
  if (series.length > 1) {
    const vals = series.map(s => s.kg)
    const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5
    const pts = vals.map((v, i) => [pad + (i * (w - pad * 2)) / (vals.length - 1), h - pad - ((v - min) / (max - min)) * (h - pad * 2)])
    chart = (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Weight trend over time">
        <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="#f5b82e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#f5b82e" />)}
      </svg>
    )
  }
  const good = change <= 0
  return (
    <Card className="lg:col-span-5">
      <CardTitle icon={Scale}>Weight trend</CardTitle>
      {chart}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xs text-white/50">Start</p><p className="font-bold">{start ?? '--'} kg</p></div>
        <div><p className="text-xs text-white/50">Now</p><p className="font-bold">{now ?? '--'} kg</p></div>
        <div><p className="text-xs text-white/50">Change</p><p className={`font-bold ${change === 0 ? '' : good ? 'text-emerald-400' : 'text-red-400'}`}>{change > 0 ? '+' : ''}{change} kg</p></div>
      </div>
    </Card>
  )
}
