import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarCheck, ChevronLeft, ChevronRight, Dumbbell, Flame, TrendingDown, TrendingUp } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import useProgress from '../lib/useProgress'
import { StatTile, fmt } from '../components/progress/ui'
import WeekCard from '../components/progress/WeekCard'
import WeekDetail from '../components/progress/WeekDetail'
import WorkoutStrip from '../components/progress/WorkoutStrip'
import NutritionCard from '../components/progress/NutritionCard'
import { CaloriesChart, WeightCard } from '../components/progress/Charts'
import { Badges, Insights } from '../components/progress/Highlights'

export default function Progress() {
  const root = useLocation().pathname.startsWith('/preview') ? '/preview' : '/app'
  const [offset, setOffset] = useState(0)
  const [detail, setDetail] = useState(null) // null | 'workouts' | 'food' | 'water'
  const p = useProgress(offset)
  const WeightIcon = p.weight.change > 0 ? TrendingUp : TrendingDown

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <Sidebar />
      <main className="min-h-screen bg-[#161616] px-5 pb-28 pt-8 sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Your Progress</h1>
          <p className="text-sm text-white/70">Built from the workouts and meals you log.</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-card p-1">
          <button onClick={() => setOffset(o => o - 1)} aria-label="Previous week" className="grid h-8 w-8 place-items-center rounded-full text-gold hover:bg-white/5"><ChevronLeft size={18} /></button>
          <span className="min-w-[8.5rem] text-center text-xs text-white/80">{offset === 0 ? 'This week' : p.range}</span>
          <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset === 0} aria-label="Next week" className="grid h-8 w-8 place-items-center rounded-full text-gold hover:bg-white/5 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </header>

      {!p.hasData && (
        <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm text-white/80 sm:flex sm:items-center sm:justify-between">
          <p>Nothing logged yet. Complete a workout or log a meal and your numbers appear here.</p>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <Link to={`${root}/workouts`} className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-black">Workouts</Link>
            <Link to={`${root}/nutrition`} className="rounded-full border border-gold/60 px-4 py-2 text-xs font-semibold text-gold">Meal plan</Link>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-5"><WeekCard progress={p} onOpen={() => setDetail('workouts')} /></div>
        <Insights progress={p} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:col-span-12">
          <StatTile icon={CalendarCheck} label="Day streak" value={`${p.streak} day${p.streak === 1 ? '' : 's'}`} note="Workout or meal logged" />
          <StatTile icon={Dumbbell} label="Active time" value={`${p.totals.minutes} min`} note="This week" />
          <StatTile icon={Flame} label="Avg. calories" value={p.totals.foodDays ? `${fmt(p.totals.avgCalories)} kcal` : '--'} note={`Goal ${fmt(p.targets.calories)} kcal`} />
          <StatTile icon={WeightIcon} label="Weight change" value={`${p.weight.change > 0 ? '+' : ''}${p.weight.change} kg`} note="Since you started" />
        </div>

        <WorkoutStrip progress={p} root={root} onDetails={() => setDetail('workouts')} />
        <NutritionCard progress={p} root={root} onDetails={() => setDetail('food')} />
        <CaloriesChart progress={p} />
        <WeightCard progress={p} />
        <Badges progress={p} />
      </div>

      <p className="mt-6 text-center text-[11px] text-white/40">Estimates based on what you log. Not medical advice.</p>

      {detail && <WeekDetail progress={p} tab={detail} onTab={setDetail} onClose={() => setDetail(null)} root={root} />}
      </main>
    </div>
  )
}
