import { useEffect, useRef, useState } from 'react'
import { ClipboardList, Dumbbell, Play, Rocket, X } from 'lucide-react'
import { goldBtn } from './Modal'

const STEPS = [
  { icon: Rocket, title: 'Welcome to Workouts', text: 'This is where you build workout plans, follow them step by step, and keep your week on track.',
    points: ['A plan is a weekly routine', 'You choose the days and the exercises', 'AIVO can build one for you'] },
  { icon: ClipboardList, title: '1. Create a plan', text: 'Tap Create a plan. Choose your goal, your level, and where you train: at home, with weights, or at the gym.',
    points: ['Everything is a tap, almost no typing', 'Not sure? Tap "Let AI decide"', 'Your equipment choice filters the exercises'] },
  { icon: Dumbbell, title: '2. Add exercises to each day', text: 'Open your plan, pick a day, then tap Add exercise. You only see exercises that match your equipment.',
    points: ['Most exercises use sets and reps', 'Timed ones, like a plank, use a time per set', 'Days with no exercises are rest days'] },
  { icon: Play, title: '3. Start and follow along', text: 'Press Start on today\'s workout. AIVO guides you through every exercise.',
    points: ['Reps exercises: tap to check off each set', 'Timed exercises: a countdown runs for you', 'A rest timer starts between sets'] },
]

// First-visit walkthrough. Skippable, and it can be opened again from the ? button.
export default function GuideSheet({ hasPlans, onClose, onCreate }) {
  const [i, setI] = useState(0)
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [])
  const s = STEPS[i]
  const last = i === STEPS.length - 1
  const Icon = s.icon

  return (
    <div className="fixed inset-0 z-[56] flex items-end justify-center bg-black/80 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="How workouts work" className="w-full overflow-hidden rounded-t-3xl border border-white/10 bg-card sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-5">
          <p className="text-xs font-semibold text-mute">{i + 1} of {STEPS.length}</p>
          <button type="button" onClick={onClose} className="flex items-center gap-1 text-xs font-semibold text-mute transition hover:text-ink"><X size={14} /> Skip</button>
        </div>
        <div className="px-6 pb-2 pt-4 text-center" key={i}>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gold/15 text-gold"><Icon size={38} /></span>
          <h2 ref={ref} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">{s.title}</h2>
          <p className="mt-2 text-sm text-ink/85">{s.text}</p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm">
            {s.points.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{p}</li>)}
          </ul>
        </div>
        <div className="flex justify-center gap-1.5 py-4" aria-hidden="true">
          {STEPS.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-gold' : 'w-1.5 bg-white/20'}`} />)}
        </div>
        <div className="flex gap-3 px-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold transition hover:bg-white/5">Back</button>}
          <button type="button" className={`${goldBtn} flex-1 py-3`} onClick={() => (last ? (hasPlans ? onClose() : onCreate()) : setI(i + 1))}>
            {last ? (hasPlans ? 'Got it' : 'Create my first plan') : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
