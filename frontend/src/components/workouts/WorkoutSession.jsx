import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, Minus, Pause, Play, Plus, RotateCcw, SkipForward, Trophy, X } from 'lucide-react'
import { DAY_NAMES, timedSeconds } from '../../lib/workouts'
import { goldBtn } from './Modal'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function alertUser() {
  try { navigator.vibrate?.([200, 100, 200]) } catch { /* not supported */ }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx(), osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880; gain.gain.value = 0.15
    osc.start(); osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => ctx.close(), 800)
  } catch { /* no audio */ }
}

// Only for timed exercises (reps written like "45 sec" or "2 min"): a countdown the user can adjust before starting.
function ExerciseTimer({ seconds, onComplete, setsLeft }) {
  const [target, setTarget] = useState(seconds)
  const [value, setValue] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const t0 = useRef(0)
  const acc = useRef(0)
  const cb = useRef(onComplete)
  cb.current = onComplete

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const ms = acc.current + Date.now() - t0.current
      const left = Math.max(0, Math.ceil((target * 1000 - ms) / 1000))
      setValue(left)
      if (left === 0) { acc.current = target * 1000; setRunning(false); setFinished(true); alertUser(); cb.current?.() }
    }, 200)
    return () => clearInterval(id)
  }, [running, target])

  const start = () => { t0.current = Date.now(); setRunning(true); setStarted(true) }
  const pause = () => { acc.current += Date.now() - t0.current; setRunning(false) }
  const reset = () => { acc.current = 0; setFinished(false); setValue(target); setRunning(false); setStarted(false) }
  const adjust = (d) => { const n = Math.min(3600, Math.max(5, target + d)); setTarget(n); setValue(n) }
  const btn = 'grid h-11 w-11 place-items-center rounded-full border border-white/20 transition hover:bg-white/10'

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-card p-6 text-center">
      <p className="text-xs text-mute">{finished ? "Time's up! Set done." : 'Set timer'}</p>
      <p className={`mt-1 text-6xl font-bold tabular-nums ${finished ? 'text-green-400' : running ? 'text-gold' : ''}`}>{fmt(value)}</p>
      <div className="mt-5 flex items-center justify-center gap-3">
        {!started && (
          <>
            <button type="button" aria-label="10 seconds less" onClick={() => adjust(-10)} className={btn}><Minus size={16} /></button>
            <button type="button" onClick={start} className={`${goldBtn} flex items-center gap-2 !px-8`}><Play size={16} /> Start timer</button>
            <button type="button" aria-label="10 seconds more" onClick={() => adjust(10)} className={btn}><Plus size={16} /></button>
          </>
        )}
        {started && !finished && (
          <>
            <button type="button" aria-label={running ? 'Pause' : 'Resume'} onClick={running ? pause : start} className={btn}>{running ? <Pause size={18} /> : <Play size={18} />}</button>
            <button type="button" aria-label="Restart timer" onClick={reset} className={btn}><RotateCcw size={16} /></button>
          </>
        )}
        {finished && (setsLeft > 0
          ? <button type="button" onClick={reset} className={`${goldBtn} flex items-center gap-2`}><Play size={16} /> Start next set</button>
          : <p className="text-sm font-semibold text-green-400">All sets done</p>)}
      </div>
      {!started && <p className="mt-3 text-[11px] text-mute">Use − and + to change the time by 10 seconds.</p>}
    </div>
  )
}

// One row per set. Tap the check when the set is done; the Done button unlocks when every set is checked.
function SetsList({ sets, reps, onToggle }) {
  const next = sets.indexOf(false)
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold">Sets</span>
        <span className="text-mute">{sets.filter(Boolean).length} of {sets.length} done</span>
      </div>
      <ul className="space-y-2">
        {sets.map((done, k) => (
          <li key={k} className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${done ? 'border-gold/60 bg-gold/10' : k === next ? 'border-white/30 bg-card' : 'border-white/10 bg-card'}`}>
            <span className="text-sm"><span className="font-semibold">Set {k + 1}</span> <span className="text-mute">· {reps}</span></span>
            <button type="button" aria-pressed={done} aria-label={`${done ? 'Unmark' : 'Mark'} set ${k + 1} as done`} onClick={() => onToggle(k)}
              className={`grid h-10 w-10 place-items-center rounded-full border-2 transition ${done ? 'border-gold bg-gold text-black' : 'border-white/30 text-transparent hover:border-gold hover:text-gold/60'}`}>
              <Check size={18} strokeWidth={3} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function WorkoutSession({ plan, day, onClose }) {
  const list = plan.schedule[day] ?? []
  const [i, setI] = useState(0)
  const [status, setStatus] = useState({})
  const [sets, setSets] = useState({})   // exercise id -> [true, false, ...] one flag per set
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (finished) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [finished])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const exit = () => { if (finished || window.confirm('End this workout? Your progress will not be saved.')) onClose() }
  const mark = (value) => {
    setStatus((s) => ({ ...s, [list[i].id]: value }))
    if (i === list.length - 1) setFinished(true)
    else setI(i + 1)
  }

  const ex = list[i]
  const doneSets = sets[ex?.id] ?? Array(ex?.sets ?? 0).fill(false)
  const allDone = doneSets.length > 0 && doneSets.every(Boolean)
  const toggleSet = (k) => setSets((s) => { const cur = s[ex.id] ?? Array(ex.sets).fill(false); const n = [...cur]; n[k] = !n[k]; return { ...s, [ex.id]: n } })
  const completeNextSet = () => setSets((s) => { const cur = s[ex.id] ?? Array(ex.sets).fill(false); const k = cur.indexOf(false); if (k < 0) return s; const n = [...cur]; n[k] = true; return { ...s, [ex.id]: n } })
  const done = list.filter((e) => status[e.id] === 'done').length
  const skipped = list.filter((e) => status[e.id] === 'skipped').length

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0d0d0d]">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 py-5">
        <header className="flex items-center justify-between">
          <div className="min-w-0"><p className="truncate text-sm font-bold">{plan.name}</p><p className="text-[11px] text-mute">{DAY_NAMES[day]}</p></div>
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight"><p className="text-[10px] text-mute">Workout time</p><p className="text-lg font-bold tabular-nums text-gold">{fmt(elapsed)}</p></div>
            <button type="button" aria-label="Close workout" onClick={exit} className="text-mute transition hover:text-ink"><X size={22} /></button>
          </div>
        </header>

        {finished ? (
          <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-gold/15 text-gold"><Trophy size={40} /></span>
            <h1 className="mt-5 text-3xl font-bold">Workout complete!</h1>
            <p className="mt-1 text-sm text-ink/80">Great job finishing {DAY_NAMES[day]}'s session.</p>
            <div className="mt-6 grid w-full grid-cols-3 gap-3">
              {[['Time', fmt(elapsed)], ['Done', done], ['Skipped', skipped]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/10 bg-card p-3"><p className="text-2xl font-bold text-gold">{v}</p><p className="text-[11px] text-mute">{k}</p></div>
              ))}
            </div>
            <ul className="mt-5 w-full space-y-2 text-left text-sm">
              {list.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-card px-4 py-2.5">
                  <span>{e.name}</span>
                  <span className={status[e.id] === 'done' ? 'text-green-400' : 'text-mute'}>{status[e.id] === 'done' ? 'Done' : 'Skipped'}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onClose} className={`${goldBtn} mt-7 w-full py-3.5`}>Close</button>
          </section>
        ) : (
          <section className="flex flex-1 flex-col py-6">
            <div className="flex gap-1.5" aria-hidden="true">
              {list.map((e, n) => <span key={e.id} className={`h-1 flex-1 rounded-full ${n < i ? 'bg-gold' : n === i ? 'bg-gold/60' : 'bg-white/15'}`} />)}
            </div>
            <p className="mt-4 text-[11px] font-semibold tracking-wide text-gold">EXERCISE {i + 1} OF {list.length}</p>
            <h1 className="mt-1 text-3xl font-bold">{ex.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px]">{ex.muscle}</span>
              <span className="text-sm font-semibold text-gold">{ex.sets} sets × {ex.reps}</span>
            </div>
            {ex.notes && <p className="mt-3 text-sm text-ink/80">{ex.notes}</p>}

            {timedSeconds(ex.reps) != null && <ExerciseTimer key={ex.id} seconds={timedSeconds(ex.reps)} onComplete={completeNextSet} setsLeft={doneSets.filter((x) => !x).length} />}
            <SetsList sets={doneSets} reps={ex.reps} onToggle={toggleSet} />

            <div className="mt-auto pt-8">
              {list[i + 1] && <p className="mb-3 text-center text-xs text-mute">Up next: <span className="text-ink">{list[i + 1].name}</span></p>}
              <button type="button" disabled={!allDone} onClick={() => mark('done')} className={`${goldBtn} flex w-full items-center justify-center gap-2 py-4 text-base`}>
                <Check size={20} strokeWidth={3} /> {i === list.length - 1 ? 'Done, finish workout' : 'Done, next exercise'}
              </button>
              {!allDone && <p className="mt-2 text-center text-[11px] text-mute">Check off every set to continue.</p>}
              <div className="mt-3 flex justify-between text-sm font-semibold text-mute">
                <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="flex items-center gap-1 transition hover:text-ink disabled:opacity-30"><ChevronLeft size={16} /> Previous</button>
                <button type="button" onClick={() => mark('skipped')} className="flex items-center gap-1 transition hover:text-ink">Skip <SkipForward size={16} /></button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
