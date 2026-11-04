import { NavLink, useLocation } from 'react-router-dom'
import { Bot, Dumbbell, Home, Settings, UtensilsCrossed } from 'lucide-react'
import logo from '../../assets/logo.png'

const base = 'grid h-11 w-11 place-items-center rounded-xl transition'
const link = ({ isActive }) => `${base} ${isActive ? 'bg-gold/15 text-gold' : 'text-gold/80 hover:bg-white/5 hover:text-gold'}`
const soon = `${base} cursor-not-allowed text-gold/40`

export default function Sidebar() {
  // The dev-only /preview pages keep their own links so they work without logging in.
  const root = useLocation().pathname.startsWith('/preview') ? '/preview' : '/app'
  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-white/10 bg-[#0d0d0d] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-20 lg:flex-col lg:justify-between lg:border-t-0 lg:py-8">
      <img src={logo} alt="AIVO" className="hidden h-10 w-auto lg:block" />
      {/* On phones the nav items join the bar directly, so all five icons are spaced evenly */}
      <nav className="contents lg:flex lg:flex-col lg:items-center lg:gap-8">
        <NavLink to={root} end aria-label="Home" title="Home" className={link}><Home size={26} /></NavLink>
        <NavLink to={`${root}/workouts`} aria-label="Workouts" title="Workouts" className={link}><Dumbbell size={26} /></NavLink>
        <button type="button" aria-label="Nutrition (coming soon)" title="Nutrition: coming soon" className={soon}><UtensilsCrossed size={26} /></button>
        <button type="button" aria-label="AI Coach (coming soon)" title="AI Coach: coming soon" className={soon}><Bot size={26} /></button>
      </nav>
      <button type="button" aria-label="Settings (coming soon)" title="Settings: coming soon" className={soon}><Settings size={26} /></button>
    </aside>
  )
}
