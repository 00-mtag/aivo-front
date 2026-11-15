import { Building2, Check, Dumbbell, HeartPulse, Home, Minus, Plus, Scale, TrendingDown } from 'lucide-react'
import { EQUIPMENT, TRAIN_PLACES, placeOf } from '../../lib/workouts'

export const GOAL_META = {
  'Lose weight': { icon: TrendingDown, desc: 'Burn fat and calories' },
  'Build muscle': { icon: Dumbbell, desc: 'Get stronger, add size' },
  'Improve endurance': { icon: HeartPulse, desc: 'Last longer, breathe easier' },
  'Maintain fitness': { icon: Scale, desc: 'Stay active and steady' },
}
const PLACE_ICON = { home: Home, homeWeights: Dumbbell, gym: Building2 }

// A round "pill" you tap to turn on or off.
export function Chip({ active, onClick, children, className = '' }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${active ? 'border-gold bg-gold/15 text-ink' : 'border-white/10 bg-black/20 text-mute hover:border-white/30 hover:text-ink'} ${className}`}>
      {active && <Check size={14} strokeWidth={3} className="text-gold" />}
      {children}
    </button>
  )
}

// A big tappable card (pick one).
export function Tile({ selected, onClick, icon: Icon, title, desc, compact = false }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border text-left transition active:scale-[0.99] ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} ${selected ? 'border-gold bg-gold/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>
      {Icon && <span className={`grid shrink-0 place-items-center rounded-xl transition ${compact ? 'h-9 w-9' : 'h-10 w-10'} ${selected ? 'bg-gold text-black' : 'bg-white/5 text-gold'}`}><Icon size={compact ? 18 : 20} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {desc && <span className="block truncate text-[11px] text-mute">{desc}</span>}
      </span>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${selected ? 'border-gold bg-gold text-black' : 'border-white/20'}`}>{selected && <Check size={12} strokeWidth={3} />}</span>
    </button>
  )
}

export const Label = ({ children, hint }) => (
  <div className="mb-2 mt-5 flex items-baseline justify-between gap-3 first:mt-0">
    <h3 className="text-sm font-bold">{children}</h3>
    {hint && <span className="text-[11px] text-mute">{hint}</span>}
  </div>
)

// − number + (tap to change, no typing).
export function Stepper({ value, onChange, min = 1, max = 20, step = 1, format = (v) => v, label }) {
  const bump = (d) => onChange(Math.min(max, Math.max(min, Math.round((value + d) * 100) / 100)))
  const btn = 'grid h-12 w-12 place-items-center rounded-full border border-white/20 transition hover:bg-white/10 active:scale-95 disabled:opacity-30'
  return (
    <div className="flex items-center justify-between gap-3" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label ?? ''}`} onClick={() => bump(-step)} disabled={value <= min} className={btn}><Minus size={18} /></button>
      <p className="min-w-[6rem] text-center text-3xl font-bold tabular-nums text-gold" aria-live="polite">{format(value)}</p>
      <button type="button" aria-label={`Increase ${label ?? ''}`} onClick={() => bump(step)} disabled={value >= max} className={btn}><Plus size={18} /></button>
    </div>
  )
}

// Where do you train? Three cards, plus chips to fine-tune the equipment.
export function EquipmentPicker({ value, onChange }) {
  const place = value.length ? placeOf(value) : null
  const toggle = (id) => {
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id]
    onChange(next.length ? next : ['bodyweight'])
  }
  return (
    <div>
      <div role="radiogroup" aria-label="Where do you train" className="grid gap-2">
        {TRAIN_PLACES.map((p) => (
          <Tile key={p.id} compact icon={PLACE_ICON[p.id]} title={p.title} desc={p.desc} selected={place === p.id} onClick={() => onChange(p.equipment)} />
        ))}
      </div>
      <p className="mb-2 mt-3 text-[11px] text-mute">{!place ? 'Pick one above, or tap the equipment you have:' : place === 'custom' ? 'Custom equipment. Tap to add or remove:' : 'Fine-tune what you have:'}</p>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT.map((e) => <Chip key={e.id} active={value.includes(e.id)} onClick={() => toggle(e.id)} className="!min-h-[2.25rem] !px-3 !text-xs">{e.label}</Chip>)}
      </div>
    </div>
  )
}
