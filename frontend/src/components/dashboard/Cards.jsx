import { Activity, Droplet, Dumbbell, Flame, Zap } from 'lucide-react'
import { BMI_SEGMENTS, bmiInfo } from '../../lib/recommend'

export function Card({ className = '', children }) {
  return <section className={`rounded-xl border border-white/10 bg-card p-4 ${className}`}>{children}</section>
}

export const IconBox = ({ icon: Icon }) => (
  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 text-gold"><Icon size={16} /></span>
)

/* ---------- BMI: number and pill take the color of the user's category ---------- */
export function BmiCard({ weightKg = 70, heightM = 1.73 }) {
  const { bmi, category, color, message } = bmiInfo(weightKg, heightM)
  const idx = BMI_SEGMENTS.findIndex((s) => s.label === category)
  const seg = BMI_SEGMENTS[idx]
  const frac = Math.min(1, Math.max(0, (bmi - seg.lo) / (seg.hi - seg.lo)))
  const pos = Math.min(97, Math.max(3, (idx + frac) * 25))
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <section className="rounded-2xl border-2 border-gold bg-[#101010] p-5">
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="text-lg font-bold leading-tight">Your BMI</h3><p className="text-xs text-mute">Body Mass Index</p></div>
        <p className="text-xs font-bold">{date}</p>
      </div>
      <p className="mt-3 text-center text-7xl font-extrabold leading-none tracking-tight" style={{ color }}>{bmi.toFixed(1)}</p>
      <p className="mt-4 text-center text-sm">{message}</p>

      <div className="relative mt-5">
        <div className="grid grid-cols-4 gap-1">
          {BMI_SEGMENTS.map((s) => <span key={s.label} className="h-1.5 rounded-full" style={{ background: s.color }} />)}
        </div>
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-[#d9d9d9]" style={{ left: `${pos}%`, borderColor: color }} />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        {BMI_SEGMENTS.map((s) => (
          <div key={s.label} className="leading-tight"><p className="text-[10px]">{s.range}</p><p className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</p></div>
        ))}
      </div>
    </section>
  )
}

/* ---------- Summary of the user's condition, built from the onboarding answers ---------- */
function Tile({ icon: Icon, label, value, valueColor, sub }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <Icon size={18} className="text-gold" />
      <p className="mt-2 text-[10px] text-mute">{label}</p>
      <p className="text-base font-bold leading-tight" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
      <p className="mt-1 text-[10px] leading-snug text-mute">{sub}</p>
    </div>
  )
}

export function FitnessSummary({ rec, focus }) {
  const chips = [rec.goal, rec.level, `${rec.age} yrs`, `${rec.weightKg} kg`, `${rec.heightCm} cm`]
  return (
    <Card>
      <div className="flex items-center gap-3">
        <IconBox icon={Zap} />
        <p className="flex-1 text-sm font-semibold">Your Fitness Summary</p>
        <span className="text-[10px] text-mute">{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
      </div>

      <div className="mt-3 rounded-lg border border-gold/50 bg-gold/10 p-3">
        <p className="text-[10px] font-semibold tracking-wide text-gold">TODAY</p>
        <p className="text-sm font-semibold">{focus.title}</p>
        <p className="text-[11px] text-ink/80">{focus.sub}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((c) => <span key={c} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px]">{c}</span>)}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile icon={Activity} label="Condition" value={rec.category} valueColor={rec.color} sub={rec.condition} />
        <Tile icon={Flame} label="Daily calories" value={`${rec.calories.toLocaleString()} kcal`} sub={`Aim for about ${rec.protein} g of protein`} />
        <Tile icon={Dumbbell} label="Weekly workouts" value={`${rec.perWeek} days`} sub={`${rec.workout.minutes} min each, ${rec.level.toLowerCase()} level`} />
        <Tile icon={Droplet} label="Water" value={`${rec.waterL} L / day`} sub="Spread through the day" />
      </div>

      <p className="mt-3 text-[11px] text-ink/90"><span className="font-semibold text-gold">Your focus:</span> {rec.focus}</p>
      {rec.note && <p className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5 text-[11px] text-ink/90">{rec.note}</p>}
      <p className="mt-3 text-[10px] text-mute">Estimates based on your answers. Not medical advice.</p>
    </Card>
  )
}
