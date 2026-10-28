import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

// A scroll-wheel style picker: mouse wheel, arrows, tapping a neighbour row, or the keyboard.
export default function WheelPicker({ options, index, onChange, rows = 3, big = false, format = String, renderSelected, label }) {
  const ref = useRef(null)
  const acc = useRef(0)
  const latest = useRef({})
  latest.current = { index, onChange, max: options.length - 1 }

  const move = (d) => {
    const { index: i, onChange: change, max } = latest.current
    const n = Math.min(max, Math.max(0, i + d))
    if (n !== i) change(n)
  }

  useEffect(() => {
    const el = ref.current
    const onWheel = (e) => {
      e.preventDefault()
      acc.current += e.deltaY
      if (Math.abs(acc.current) >= 40) { move(Math.sign(acc.current)); acc.current = 0 }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const half = (rows - 1) / 2
  const offsets = Array.from({ length: rows }, (_, i) => i - half)
  const arrow = 'mx-auto grid h-7 w-full place-items-center text-gold transition hover:brightness-125'

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
      }}
      className="rounded-xl border border-white/10 bg-card px-2 py-1 outline-none focus-visible:border-gold/60"
    >
      <button type="button" aria-label="Previous" onClick={() => move(-1)} className={arrow}><ChevronUp size={16} /></button>
      {offsets.map((o) => {
        const opt = options[index + o]
        if (o === 0) {
          return (
            <div key={o} role="option" aria-selected className={`my-1 flex flex-col items-center justify-center rounded-lg border border-gold bg-gold/15 font-bold ${big ? 'h-14 text-xl' : 'h-10 text-sm'}`}>
              {renderSelected ? renderSelected(opt) : format(opt)}
            </div>
          )
        }
        if (opt === undefined) return <div key={o} className="h-8" />
        return (
          <button key={o} type="button" onClick={() => move(o)} className={`flex h-8 w-full items-center justify-center text-sm transition hover:text-ink ${Math.abs(o) === 1 ? 'text-ink/90' : 'text-mute/60'}`}>
            {format(opt)}
          </button>
        )
      })}
      <button type="button" aria-label="Next" onClick={() => move(1)} className={arrow}><ChevronDown size={16} /></button>
    </div>
  )
}
