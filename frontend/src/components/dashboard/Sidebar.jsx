import { useState } from 'react'
import { Bot, Dumbbell, Home, Settings, UtensilsCrossed } from 'lucide-react'

const ITEMS = [
  { icon: Home, label: 'Home' },
  { icon: Dumbbell, label: 'Workouts' },
  { icon: UtensilsCrossed, label: 'Nutrition' },
  { icon: Bot, label: 'AI Coach' },
]

export default function Sidebar() {
  const [active, setActive] = useState('Home')
  const btn = (label) => `grid h-11 w-11 place-items-center rounded-xl transition ${active === label ? 'bg-gold/15 text-gold' : 'text-gold/80 hover:bg-white/5 hover:text-gold'}`
  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-white/10 bg-[#0d0d0d] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-20 lg:flex-col lg:justify-between lg:border-t-0 lg:py-8">
      <p className="hidden font-extrabold text-3xl text-gold lg:block">A</p>
      <nav className="flex items-center gap-2 lg:flex-col lg:gap-8">
        {ITEMS.map(({ icon: Icon, label }) => (
          <button key={label} type="button" aria-label={label} title={label} onClick={() => setActive(label)} className={btn(label)}>
            <Icon size={26} />
          </button>
        ))}
      </nav>
      <button type="button" aria-label="Settings" title="Settings" onClick={() => setActive('Settings')} className={btn('Settings')}>
        <Settings size={26} />
      </button>
    </aside>
  )
}
