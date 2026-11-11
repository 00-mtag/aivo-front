import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import AskAivo from '../components/dashboard/AskAivo'
import MenuDrawer from '../components/dashboard/MenuDrawer'
import NotificationsBell from '../components/dashboard/NotificationsBell'
import { BmiCard, FitnessSummary } from '../components/dashboard/Cards'
import Suggestions from '../components/dashboard/Suggestions'
import WeekCalendar from '../components/dashboard/WeekCalendar'
import { api, clearSession, errorsFrom } from '../lib/api'
import { calculateProfileTdee, getProfile, recommendedDailyCalories, saveProfile } from '../lib/profile'
import { recommend, todayFocus } from '../lib/recommend'
import { loadPlans } from '../lib/workouts'
import { defaultGoal, loadNutrition, saveNutrition } from '../lib/nutrition'
import { normGoal, pickGoal, saveGoal as saveNutritionGoal } from '../lib/nutritionApi'
import LoadingScreen from '../components/LoadingScreen'
import usePanelLoader, { resetPanelLoaders } from '../lib/usePanelLoader'

function userName() {
  try {
    const profileName = getProfile()?.name          // a name edited in the menu wins
    if (profileName) return profileName
    const u = JSON.parse(localStorage.getItem('aivo_user') ?? 'null')
    return u?.username ?? u?.name ?? 'there'
  } catch { return 'there' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, finishLoading] = usePanelLoader('dashboard')
  const { pathname, key } = useLocation()
  const root = pathname.startsWith('/preview') ? '/preview' : '/app'
  // Always open at the top: on arrival, and when Home is clicked again while already here (each click gets a new location key)
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [key])
  const rec = recommend(getProfile())
  const plans = loadPlans()
  const focus = todayFocus(plans, rec)
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const [menuOpen, setMenuOpen] = useState(false)
  const [, refresh] = useState(0)   // re-reads the profile after it is edited in the menu
  const menuBtn = useRef(null)
  const onLoaded = () => { finishLoading(); window.scrollTo(0, 0) }   // widgets that scroll themselves into view while loading cannot leave the page halfway down
  const closeMenu = () => { setMenuOpen(false); menuBtn.current?.focus() }
  const saveProfileValues = async (values) => {
    const previousProfile = getProfile() ?? {}
    const updatedProfile = { ...previousProfile, ...values }
    let serverTdee = null
    if (!pathname.startsWith('/preview')) {
      try {
        const { data } = await api.put('/profile', {
          gender: values.gender === 'Other' ? 'Prefer not to say' : values.gender,
          phone_number: values.phone,
          birth_date: values.birthDate,
          height: String(values.heightCm),
          weight: String(values.weightKg),
          activity_level: values.activityLevel,
          fitness_goal: values.goal ?? values.fitnessGoal,
          experience_level: values.level ?? values.experience ?? values.experienceLevel,
          target_weight: values.targetWeightKg == null ? null : String(values.targetWeightKg),
        })
        serverTdee = data.profile?.tdee == null ? null : Number(data.profile.tdee)
      } catch (error) {
        throw new Error(errorsFrom(error).form || 'Your profile could not be saved to the server.', { cause: error })
      }
    }
    const tdee = serverTdee ?? calculateProfileTdee(updatedProfile)
    if (tdee !== null) updatedProfile.tdee = tdee
    const previousTarget = recommendedDailyCalories(previousProfile)
    const updatedTarget = recommendedDailyCalories(updatedProfile)
    saveProfile(updatedProfile)   // keep the onboarding answers, change only what was edited
    if (updatedTarget !== null && updatedTarget !== previousTarget) {
      const updatedRecommendation = recommend(updatedProfile)
      const updatedGoal = {
        ...defaultGoal({ ...updatedRecommendation, calories: updatedTarget }),
        goal_id: loadNutrition(updatedRecommendation).goal?.goal_id,
      }
      const localNutrition = loadNutrition(updatedRecommendation)
      saveNutrition({ ...localNutrition, goal: updatedGoal })

      try {
        const { data } = await api.get('/nutrition/goals')
        const currentGoal = pickGoal((data.nutrition_goals ?? []).map(normGoal))
        await saveNutritionGoal({ ...updatedGoal, goal_id: currentGoal?.goal_id })
      } catch (error) {
        throw new Error(`Your profile was saved, but the daily calorie goal could not be synced: ${error.message}`, { cause: error })
      }
    }
    refresh((n) => n + 1)
  }
  const logout = () => { clearSession(); resetPanelLoaders(); navigate('/login', { replace: true }) }
  const iconBtn = 'grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/5'

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      <main className="min-h-screen bg-[#161616] px-5 pb-24 pt-8 sm:px-8 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-10">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Welcome, {userName()}</h1>
            <p className="mt-1 text-sm">{greeting}, start your day now.</p>
          </div>
          <div className="flex items-center gap-1 text-gold">
            <NotificationsBell rec={rec} focus={focus} plans={plans} root={root} onOpenMenu={() => setMenuOpen(true)} />
            <button ref={menuBtn} type="button" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="app-menu"
              onClick={() => setMenuOpen(true)} className={iconBtn}><Menu size={28} /></button>
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

      <MenuDrawer open={menuOpen} onClose={closeMenu} name={userName()} rec={rec} onLogout={logout}
        profile={getProfile()} onSaveProfile={saveProfileValues} />
      {loading && <LoadingScreen message="Loading your dashboard" onDone={onLoaded} />}
    </div>
  )
}
