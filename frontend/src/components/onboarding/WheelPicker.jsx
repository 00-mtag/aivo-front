import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// A smooth scroll-wheel picker.
// Touch: swipe with momentum, it snaps to the nearest value.   Mouse: wheel, drag, or click a value.
// Keyboard: arrows, PageUp/PageDown, Home/End.   Same props as before.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const BG = '20,20,20'
const CSS = '.aivo-wheel::-webkit-scrollbar{display:none}'
const FADE = [1, 0.6, 0.34, 0.16]

const Item = memo(function Item({ i, rel, h, big, content, onPick }) {
  const a = Math.abs(rel)
  const size = rel === 0 ? (big ? 'text-2xl font-bold text-ink' : 'text-lg font-bold text-ink') : 'text-base text-mute'
  return (
    <div role="option" aria-selected={rel === 0} onClick={() => onPick(i)}
      className={`flex w-full cursor-pointer select-none items-center justify-center ${size}`}
      style={{
        height: h, scrollSnapAlign: 'center', opacity: FADE[a],
        transform: `perspective(260px) rotateX(${-rel * 16}deg) scale(${1 - a * 0.07})`,
        transition: 'opacity .15s ease, transform .15s ease',
      }}>
      <span className="flex items-baseline gap-1.5 truncate px-2">{content}</span>
    </div>
  )
})

export default function WheelPicker({ options, index, onChange, rows = 5, big = false, format = String, renderSelected, label }) {
  const H = big ? 52 : 44
  const pad = ((rows - 1) / 2) * H
  const max = options.length - 1

  const ref = useRef(null)
  const live = useRef(index)           // the value currently shown
  const [shown, setShown] = useState(index)
  const [dragging, setDragging] = useState(false)
  const cb = useRef(onChange)
  cb.current = onChange
  const idle = useRef(null)
  const programmatic = useRef(false)   // true while we are scrolling it ourselves
  const first = useRef(true)
  const moved = useRef(false)
  const drag = useRef(null)
  const wheelAcc = useRef(0)

  const hold = useCallback((ms) => {
    programmatic.current = true
    clearTimeout(idle.current)
    idle.current = setTimeout(() => { programmatic.current = false }, ms)
  }, [])

  const scrollToIdx = useCallback((i) => {
    ref.current?.scrollTo({ top: i * H, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [H])

  const commit = useCallback((i) => {
    if (i === live.current) return
    live.current = i
    setShown(i)
    cb.current(i)
    try { navigator.vibrate?.(4) } catch { /* not supported */ }
  }, [])

  const goTo = useCallback((i) => {
    const n = clamp(i, 0, max)
    hold(500)
    commit(n)
    scrollToIdx(n)
  }, [max, hold, commit, scrollToIdx])

  // Start at the right value, without animation.
  useLayoutEffect(() => { if (ref.current) ref.current.scrollTop = clamp(index, 0, max) * H }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The page changed the value (unit switch, day clamp...): glide there.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (live.current === index) return
    live.current = index
    setShown(index)
    hold(500)
    scrollToIdx(clamp(index, 0, max))
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  // One step per wheel notch, so a mouse wheel is precise.
  useEffect(() => {
    const el = ref.current
    const onWheel = (e) => {
      e.preventDefault()
      wheelAcc.current += e.deltaY
      if (Math.abs(wheelAcc.current) >= 40) { goTo(live.current + Math.sign(wheelAcc.current)); wheelAcc.current = 0 }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [goTo])

  useEffect(() => () => clearTimeout(idle.current), [])

  const onScroll = () => {
    if (!programmatic.current) commit(clamp(Math.round(ref.current.scrollTop / H), 0, max))
    clearTimeout(idle.current)
    idle.current = setTimeout(() => { programmatic.current = false }, 140)
  }

  // Mouse drag (touch uses native scrolling).
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    drag.current = { y: e.clientY, top: ref.current.scrollTop }
    moved.current = false
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.y
    if (!moved.current && Math.abs(dy) > 4) { moved.current = true; setDragging(true); ref.current.setPointerCapture?.(e.pointerId) }
    if (moved.current) ref.current.scrollTop = d.top - dy
  }
  const endDrag = () => {
    if (!drag.current) return
    const wasMoved = moved.current
    drag.current = null
    if (wasMoved) { setDragging(false); scrollToIdx(live.current); setTimeout(() => { moved.current = false }, 0) }
  }

  const pick = useCallback((i) => { if (!moved.current) goTo(i) }, [goTo])

  const onKeyDown = (e) => {
    const step = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key]
    if (step) { e.preventDefault(); goTo(live.current + step) }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0) }
    else if (e.key === 'End') { e.preventDefault(); goTo(max) }
  }

  return (
    <div role="listbox" aria-label={label} tabIndex={0} onKeyDown={onKeyDown}
      className="relative overflow-hidden rounded-2xl border border-white/10 outline-none transition focus-visible:border-gold/60"
      style={{ height: rows * H, background: `rgb(${BG})` }}>
      <style>{CSS}</style>
      {/* the highlighted row */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 rounded-xl border border-gold/40 bg-gold/10" style={{ top: pad, height: H }} />
      <div ref={ref} onScroll={onScroll} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        className="aivo-wheel relative h-full overflow-y-scroll"
        style={{ scrollSnapType: dragging ? 'none' : 'y mandatory', overscrollBehavior: 'contain', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        <div style={{ height: pad }} />
        {options.map((opt, i) => (
          <Item key={i} i={i} h={H} big={big} onPick={pick}
            rel={clamp(i - shown, -3, 3)}
            content={i === shown && renderSelected ? renderSelected(opt) : format(opt)} />
        ))}
        <div style={{ height: pad }} />
      </div>
      {/* soft fade at the top and bottom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0" style={{ height: pad, background: `linear-gradient(rgb(${BG}), rgba(${BG},0))` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: pad, background: `linear-gradient(rgba(${BG},0), rgb(${BG}))` }} />
    </div>
  )
}
