import { useNavigate } from 'react-router-dom'
import { Bell, User } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import AskAivo from '../components/dashboard/AskAivo'
import { BmiCard, FitnessSummary } from '../components/dashboard/Cards'
import Suggestions from '../components/dashboard/Suggestions'
import WeekCalendar from '../components/dashboard/WeekCalendar'
import { clearSession } from '../lib/api'
import { getProfile } from '../lib/profile'
import { recommend, todayFocus } from '../lib/recommend'
import { loadPlans } from '../lib/workouts'

function userName() {
  try {
    const u = JSON.parse(localStorage.getItem('aivo_user') ?? 'null')
    return u?.username ?? u?.name ?? 'there'
  } catch { return 'there' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const rec = recommend(getProfile())
  const focus = todayFocus(loadPlans(), rec)
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const logout = () => { clearSession(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      <main className="min-h-screen bg-[#161616] px-5 pb-24 pt-8 sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-10">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Welcome Maderpaker, {userName()}</h1>
            <p className="mt-1 text-sm">{greeting}, start your day now.</p>
          </div>
          <div className="flex items-center gap-5 text-gold">
            <button type="button" aria-label="Notifications"><Bell size={26} /></button>
            <button type="button" aria-label="Log out" title="Log out" onClick={logout}><User size={26} /></button>
          </div>
        </header>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_21rem]">
          <div className="grid gap-5 md:grid-cols-[1fr_1.35fr] md:items-start">
            {/* Two stacked columns on wide screens so no card is stretched to match its neighbour. On phones the order is BMI, summary, suggestions, calendar. */}
            <div className="contents md:block md:space-y-5">
              <div className="order-1"><BmiCard weightKg={rec.weightKg} heightM={rec.heightCm / 100} /></div>
              <div className="order-3"><Suggestions rec={rec} /></div>
            </div>
            <div className="contents md:block md:space-y-5">
              <div className="order-2"><FitnessSummary rec={rec} focus={focus} /></div>
              <div className="order-4"><WeekCalendar /></div>
            </div>
          </div>
          <AskAivo context={{
            page: 'Dashboard',
            data: {
              fitnessGoal: rec.goal,
              experienceLevel: rec.level,
              dailyCalorieTargetEstimate: rec.calories,
              dailyProteinTargetEstimateGrams: rec.protein,
              todayWorkoutFocus: focus,
            },
          }} />
        </div>
      </main>
    </div>
  )
}
