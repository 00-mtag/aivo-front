import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'

// One question per screen. The heading takes focus so screen readers announce each new step.
export function Screen({ title, subtitle, children }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  return (
    <section>
      <h1 ref={ref} tabIndex={-1} className="text-[1.75rem] font-bold leading-tight outline-none">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-mute">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

// A big tappable card. role="radio" for pick-one, role="checkbox" when multi.
export function OptionCard({ selected, onClick, icon: Icon, glyph, title, desc, multi = false }) {
  return (
    <button type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={selected} onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${selected ? 'border-gold bg-gold/10' : 'border-white/10 bg-card hover:border-white/30'}`}>
      {(Icon || glyph) && (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl font-bold transition ${selected ? 'bg-gold text-black' : 'bg-white/5 text-gold'}`}>
          {Icon ? <Icon size={22} /> : glyph}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        {desc && <span className="mt-0.5 block text-xs text-mute">{desc}</span>}
      </span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center border transition ${multi ? 'rounded-md' : 'rounded-full'} ${selected ? 'border-gold bg-gold text-black' : 'border-white/20'}`}>
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${active ? 'border-gold bg-gold/15 text-ink' : 'border-white/10 bg-card text-mute hover:border-white/30 hover:text-ink'}`}>
      {active && <Check size={14} strokeWidth={3} className="text-gold" />}
      {children}
    </button>
  )
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-white/5 p-1">
      {options.map(([id, text]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${value === id ? 'bg-gold text-black' : 'text-mute hover:text-ink'}`}>{text}</button>
      ))}
    </div>
  )
}

const BANDS = [
  { max: 18.5, label: 'Underweight', color: '#60a5fa' },
  { max: 25, label: 'Healthy', color: '#34d399' },
  { max: 30, label: 'Overweight', color: '#f5b82e' },
  { max: Infinity, label: 'Obese', color: '#ef4444' },
]
export const bmiBand = (bmi) => BANDS.find((b) => bmi < b.max)

export function BmiMeter({ bmi }) {
  const band = bmiBand(bmi)
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4" aria-live="polite">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-mute">Your BMI</p>
          <p className="text-3xl font-extrabold leading-none" style={{ color: band.color }}>{bmi.toFixed(1)}</p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${band.color}26`, color: band.color }}>{band.label}</span>
      </div>
      <div className="mt-4 flex h-1.5 gap-1" aria-hidden="true">
        {BANDS.map((b) => <span key={b.label} className="flex-1 rounded-full" style={{ background: b.color, opacity: b === band ? 1 : 0.25 }} />)}
      </div>
    </div>
  )
}
