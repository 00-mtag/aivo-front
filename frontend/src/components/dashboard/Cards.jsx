import { Activity, Calendar, ChevronRight, Clock, Droplet, Dumbbell, Flame, Footprints, Sparkles, Zap, Check } from 'lucide-react'
import gymImg from '../../assets/gym-bg.jpg'

const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

export function Card({ className = '', children }) {
  return <section className={`rounded-xl border border-white/10 bg-card p-4 ${className}`}>{children}</section>
}

const IconBox = ({ icon: Icon }) => (
  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 text-gold"><Icon size={16} /></span>
)

/* ---------- BMI ---------- */
const bmiOf = (kg, m) => kg / (m * m)
const SEGMENTS = [
  { w: 17.5, color: '#3b82f6' }, { w: 32.5, color: '#22c55e' }, { w: 25, color: '#eab308' }, { w: 25, color: '#ef4444' },
]
export function BmiCard({ weightKg = 70, heightM = 1.73 }) {
  const bmi = bmiOf(weightKg, heightM)
  const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  const left = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100))
  return (
    <Card>
      <div className="flex items-center gap-3">
        <IconBox icon={Activity} />
        <div className="flex-1"><p className="text-sm font-semibold">BMI Card</p><p className="text-[10px] text-mute">Body Mass Index</p></div>
        <span className="text-[10px] text-mute">{today()}</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <p className="text-4xl font-bold">{bmi.toFixed(1)}</p>
        <span className="rounded-full bg-green-600 px-3 py-0.5 text-xs font-semibold">{cat}</span>
      </div>
      <p className="mt-1 text-[11px] text-mute">{cat === 'Normal' ? 'Your BMI is within the healthy range.' : 'Your BMI is outside the healthy range.'}</p>
      <div className="relative mt-4 flex h-1.5 overflow-hidden rounded-full">
        {SEGMENTS.map((s, i) => <div key={i} style={{ width: `${s.w}%`, background: s.color }} />)}
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white" style={{ left: `${left}%` }} />
      </div>
      <div className="mt-2 flex text-[10px] text-mute">
        {[['< 18.5', 'Underweight'], ['18.5 – 24.9', 'Normal'], ['25 – 29.9', 'Overweight'], ['> 30', 'Obese']].map(([r, l]) => (
          <div key={l} className="flex-1 text-center leading-tight"><p>{r}</p><p>{l}</p></div>
        ))}
      </div>
    </Card>
  )
}

/* ---------- Today's summary ---------- */
function Tile({ icon: Icon, iconClass = 'text-gold', label, children }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <Icon size={20} className={iconClass} />
      <p className="mt-2 text-[10px] text-mute">{label}</p>
      {children}
    </div>
  )
}
const Bar = ({ pct, color }) => (
  <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
)
export function FitnessSummary({ calories = 428, steps = 7842, stepGoal = 10000, water = 1.8, waterGoal = 2.5 }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <IconBox icon={Zap} />
        <p className="flex-1 text-sm font-semibold">Today's Fitness Summary</p>
        <span className="text-[10px] text-mute">{today()}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={Dumbbell} label="Today's Workout">
          <p className="text-sm font-semibold leading-tight">Upper Body Strength</p>
          <p className="mt-2 flex items-center gap-1 text-[10px] text-mute"><Clock size={11} />45 min</p>
        </Tile>
        <Tile icon={Flame} label="Calories Burned">
          <p className="text-xl font-bold">{calories} <span className="text-xs font-medium">kcal</span></p>
          <p className="mt-2 text-[10px] text-green-400">↑ +12% vs. yesterday</p>
        </Tile>
        <Tile icon={Footprints} label="Steps">
          <p className="text-xl font-bold">{steps.toLocaleString()}</p>
          <p className="text-[10px] text-mute">/ {stepGoal.toLocaleString()}</p>
          <Bar pct={(steps / stepGoal) * 100} color="#d4af37" />
        </Tile>
        <Tile icon={Droplet} iconClass="text-sky-400" label="Water Intake">
          <p className="text-xl font-bold">{water} <span className="text-xs font-medium">L</span></p>
          <p className="text-[10px] text-mute">/ {waterGoal} L</p>
          <Bar pct={(water / waterGoal) * 100} color="#38bdf8" />
        </Tile>
      </div>
    </Card>
  )
}

/* ---------- AI suggestion ---------- */
export function AiSuggestion({ goal, level = 'Intermediate' }) {
  return (
    <Card className="border-gold/60">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <IconBox icon={Sparkles} />
        <p className="flex-1 text-sm font-semibold">AI Suggestion</p>
        <span className="hidden text-[10px] text-mute sm:block">Based on your goals and recent activity</span>
      </div>
      <div className="mt-4 flex gap-4">
        <img src={gymImg} alt="" className="h-32 w-28 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Full Body Strength + Core</p>
          <span className="mt-1 inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px]">{goal ?? 'Workout'}</span>
          <p className="mt-2 text-[11px] leading-snug text-mute">A balanced session to build strength, improve endurance, and activate your core. Perfect for maintaining progress and boosting energy levels.</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-mute">
        <span className="flex items-center gap-1"><Clock size={12} />45 min</span>
        <span className="flex items-center gap-1"><Dumbbell size={12} className="text-gold" />{level}</span>
        <span className="flex items-center gap-1"><Flame size={12} className="text-orange-400" />~ 420 kcal</span>
      </div>
      <button type="button" className="mt-4 flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-black transition hover:brightness-110">
        View plan <ChevronRight size={16} />
      </button>
    </Card>
  )
}

/* ---------- Weekly calendar ---------- */
const WEEK = [
  { day: 'Mon', date: 'Oct 27', title: 'Upper Body Strength', meta: '45 min • Gym', done: true },
  { day: 'Tue', date: 'Oct 28', title: 'HIIT Cardio', meta: '30 min • Gym' },
  { day: 'Wed', date: 'Oct 29', title: 'Active Recovery', meta: '20 min • Home' },
  { day: 'Thu', date: 'Oct 30', title: 'Lower Body Strength', meta: '45 min • Gym' },
  { day: 'Fri', date: 'Oct 31', title: 'Mobility & Flexibility', meta: '30 min • Home' },
  { day: 'Sat', date: 'Nov 1', title: 'Rest Day', rest: true },
  { day: 'Sun', date: 'Nov 2', title: 'Full Body (Optional)', meta: '45 min • Gym' },
]
export function WeeklyCalendar() {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-gold" />
        <p className="flex-1 text-sm font-semibold">Weekly Fitness Calendar</p>
        <button type="button" className="flex items-center gap-0.5 text-[11px] text-gold hover:underline">View all <ChevronRight size={12} /></button>
      </div>
      <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10">
        {WEEK.map((d) => (
          <li key={d.day} className="flex items-center gap-3 px-3 py-2">
            <span className="w-8 text-xs font-bold">{d.day}</span>
            <span className="w-12 text-[10px] text-mute">{d.date}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className={`block truncate text-[11px] font-medium ${d.rest ? 'text-ink' : 'text-gold'}`}>{d.title}</span>
              <span className="block text-[10px] text-mute">{d.meta ?? '—'}</span>
            </span>
            <span className={`grid h-4 w-4 place-items-center rounded-full border ${d.done ? 'border-green-500 bg-green-500 text-black' : 'border-white/40'}`}>
              {d.done && <Check size={11} strokeWidth={3} />}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
