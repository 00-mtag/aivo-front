import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight } from 'lucide-react'
import { Card } from './Cards'
import { DAYS, loadPlans } from '../../lib/workouts'

export default function WeekCalendar() {
  const navigate = useNavigate()
  const root = useLocation().pathname.startsWith('/preview') ? '/preview' : '/app'
  const [plans] = useState(loadPlans)
  const go = () => navigate(`${root}/workouts`)

  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const todayIdx = (now.getDay() + 6) % 7

  // One row per plan per day, and only for days that actually have exercises.
  const rows = DAYS.flatMap((day, i) => plans
    .filter((p) => p.schedule[day]?.length)
    .map((p) => ({ day, i, plan: p, n: p.schedule[day].length, date: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i) })))

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-gold" />
        <p className="flex-1 text-sm font-semibold">Weekly Fitness Calendar</p>
        {rows.length > 0 && <button type="button" onClick={go} className="flex items-center gap-0.5 text-[11px] text-gold hover:underline">View all <ChevronRight size={12} /></button>}
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-white/15 p-5 text-center">
          <p className="text-sm font-semibold">{plans.length === 0 ? 'Start or create your workout plan' : 'Nothing scheduled yet'}</p>
          <p className="mt-1 text-[11px] text-mute">{plans.length === 0 ? 'Your plans will show up here, day by day.' : 'Add exercises to a day in your plan to see it here.'}</p>
          <button type="button" onClick={go} className="mt-4 rounded-full bg-gold px-5 py-2 text-xs font-bold text-black transition hover:brightness-110">
            {plans.length === 0 ? 'Go to Workouts' : 'Open Workouts'}
          </button>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
          {rows.map((r) => (
            <li key={`${r.day}-${r.plan.id}`}>
              <button type="button" onClick={go} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/5 ${r.i === todayIdx ? 'bg-gold/10' : ''}`}>
                <span className="w-8 text-xs font-bold">{r.day}</span>
                <span className="w-12 text-[10px] text-mute">{r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[11px] font-medium text-gold">{r.plan.name}</span>
                  <span className="block text-[10px] text-mute">{r.n} exercises · {r.plan.minutes} min</span>
                </span>
                {r.i === todayIdx && <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold text-black">TODAY</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
