import { useEffect, useRef, useState } from 'react'
import logo from '../assets/logo.png'

const STAGES = [
  [0, 'Warming up'],
  [25, 'Loading your profile'],
  [50, 'Syncing workouts and meals'],
  [75, 'Setting up your panels'],
  [94, 'Ready to train'],
]
const RADIUS = 58
const CIRC = 2 * Math.PI * RADIUS
// Quick start, slower middle, quick finish: feels like real work is happening.
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Full-screen loader that counts 1 -> 100% with a progress bar and ring.
 * Props: message (optional headline), duration (ms), onDone (called after the exit fade).
 */
export default function LoadingScreen({ message = 'Getting things ready', duration = 1900, onDone }) {
  const [pct, setPct] = useState(1)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? Math.min(duration, 700) : duration
    const start = performance.now()
    const timers = []
    let raf
    const tick = (now) => {
      const t = Math.min((now - start) / total, 1)
      setPct(Math.max(1, Math.round(ease(t) * 100)))
      if (t < 1) raf = requestAnimationFrame(tick)
      else {
        timers.push(setTimeout(() => setLeaving(true), 250))
        timers.push(setTimeout(() => doneRef.current?.(), 650))
      }
    }
    raf = requestAnimationFrame(tick)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      document.body.style.overflow = prevOverflow
    }
  }, [duration])

  const stage = [...STAGES].reverse().find(([from]) => pct >= from)[1]

  return (
    <div
      role="progressbar"
      aria-label={message}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d0d0d] px-6 text-white transition-opacity duration-400 ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <style>{`
        @keyframes aivo-halo { 0% { transform: scale(.9); opacity: .55 } 100% { transform: scale(1.45); opacity: 0 } }
        @keyframes aivo-sheen { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }
        @media (prefers-reduced-motion: reduce) { .aivo-halo, .aivo-sheen { animation: none !important } }
      `}</style>

      <div className="relative grid h-24 w-24 place-items-center text-gold sm:h-28 sm:w-28">
        <span className="aivo-halo absolute inset-3 rounded-full border border-current" style={{ animation: 'aivo-halo 1.8s ease-out infinite' }} />
        <svg viewBox="0 0 140 140" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="5" />
          <circle
            cx="70" cy="70" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)}
          />
        </svg>
        <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/40 sm:h-16 sm:w-16 bg-[#101010]">
          <img src={logo} alt="" className="h-[58%] w-auto" />
        </span>
      </div>

      <p className="mt-5 flex items-baseline font-black leading-none tabular-nums">
        <span className="text-4xl sm:text-5xl">{pct}</span>
        <span className="ml-0.5 text-lg text-gold sm:text-xl">%</span>
      </p>

      <div className="mt-4 h-1 w-full max-w-[11rem] overflow-hidden rounded-full bg-white/10 text-gold sm:max-w-[14rem]">
        <div className="relative h-full overflow-hidden rounded-full bg-gold shadow-[0_0_14px_currentColor]" style={{ width: `${pct}%` }}>
          <span className="aivo-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animation: 'aivo-sheen 1.2s linear infinite' }} />
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold sm:text-sm">{message}</p>
      <p className="mt-1 h-4 text-[11px] text-white/60" aria-live="polite">{stage}...</p>
    </div>
  )
}
