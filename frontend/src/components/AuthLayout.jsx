import { Dumbbell, UtensilsCrossed, Sparkles, Flame } from 'lucide-react'

const FEATURES = [
  { icon: Dumbbell, title: 'Workouts that fit you', text: 'Plans built around your goal, level and schedule.' },
  { icon: UtensilsCrossed, title: 'Nutrition made simple', text: 'Meal ideas with calories and macros, ready to log.' },
  { icon: Sparkles, title: 'An AI coach', text: 'Daily tips that adapt as you progress.' },
]

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-14 lg:flex">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-lime/20 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-cyan/15 blur-[110px]" />

        <p className="relative font-display text-xs font-semibold tracking-[0.35em] text-mute">FITNESS · NUTRITION · AI</p>

        <div className="relative">
          <h1 className="font-display text-[8rem] font-extrabold leading-none tracking-tight text-lime [text-shadow:0_0_70px_rgb(198_255_61/0.4)]">AIVO</h1>
          <p className="mt-2 font-display text-3xl font-semibold">Level up you.</p>
          <ul className="mt-12 space-y-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-card text-cyan"><Icon size={20} /></span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="text-sm text-mute">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative max-w-sm rounded-2xl border border-line bg-card/80 p-5 backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-lime font-display font-bold text-lime">7</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Level 7, Bronze rank</p>
              <div className="mt-2 h-2 rounded-full bg-line"><div className="h-2 w-3/5 rounded-full bg-lime" /></div>
            </div>
            <span className="flex items-center gap-1 font-semibold text-flame"><Flame size={18} />12</span>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <p className="font-display text-6xl font-extrabold tracking-tight text-lime [text-shadow:0_0_40px_rgb(198_255_61/0.35)]">AIVO</p>
            <p className="font-display text-lg font-semibold text-mute">Level up you.</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
