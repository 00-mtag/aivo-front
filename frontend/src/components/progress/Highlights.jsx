import { AlertTriangle, Award, CheckCircle2, Info, Lightbulb, Lock } from 'lucide-react'
import { Card, CardTitle } from './ui'

const TONE = {
  good: { icon: CheckCircle2, cls: 'text-emerald-400' },
  warn: { icon: AlertTriangle, cls: 'text-amber-400' },
  info: { icon: Info, cls: 'text-gold' },
}

export function Insights({ progress }) {
  return (
    <Card className="lg:col-span-7">
      <CardTitle icon={Lightbulb}>What this means</CardTitle>
      <ul className="space-y-2.5">
        {progress.insights.map((i, k) => {
          const t = TONE[i.tone]
          return (
            <li key={k} className="flex items-start gap-2.5 text-sm text-white/80">
              <t.icon size={18} className={`mt-0.5 shrink-0 ${t.cls}`} />{i.text}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function Badges({ progress }) {
  return (
    <Card className="lg:col-span-12">
      <CardTitle icon={Award}>Milestones</CardTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {progress.badges.map(b => (
          <div key={b.id} className={`flex items-center gap-3 rounded-xl border p-3 ${b.earned ? 'border-gold/50 bg-gold/10' : 'border-white/10 opacity-60'}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${b.earned ? 'bg-gold text-black' : 'bg-white/10 text-white/50'}`}>
              {b.earned ? <Award size={18} /> : <Lock size={16} />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{b.label}</p>
              <p className="truncate text-[11px] text-white/50">{b.earned ? 'Earned' : b.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
