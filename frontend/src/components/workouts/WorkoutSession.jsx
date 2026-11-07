import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, Minus, Pause, Play, Plus, RotateCcw, SkipForward, Trophy, X } from 'lucide-react'
import { DAY_NAMES, timedSeconds } from '../../lib/workouts'
import { api, errorsFrom } from '../../lib/api'
import { goldBtn } from './Modal'

const REST_TIMED = 30   // seconds of rest after a timed set
const REST_REPS = 60    // seconds of rest after a sets-and-reps set
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

// Countdown for ONE set of a timed exercise. When it reaches zero the set is checked off automatically.
function SetTimer({ seconds, setNumber, totalSets, onComplete }) {
  const [target, setTarget] = useState(seconds)
  const [value, setValue] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
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
      if (left === 0) { clearInterval(id); setRunning(false); alertUser(); cb.current?.(target) }
    }, 200)
    return () => clearInterval(id)
  }, [running, target])

  const start = () => { t0.current = Date.now(); setRunning(true); setStarted(true) }
  const pause = () => { acc.current += Date.now() - t0.current; setRunning(false) }
  const reset = () => { acc.current = 0; setValue(target); setRunning(false); setStarted(false) }
  const adjust = (d) => { const n = Math.min(3600, Math.max(5, target + d)); setTarget(n); setValue(n) }
  const btn = 'grid h-11 w-11 place-items-center rounded-full border border-white/20 transition hover:bg-white/10'

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-card p-6 text-center">
      <p className="text-xs text-mute">Set {setNumber} of {totalSets} · Set timer</p>
      <p className={`mt-1 text-6xl font-bold tabular-nums ${running ? 'text-gold' : ''}`}>{fmt(value)}</p>
      <div className="mt-5 flex items-center justify-center gap-3">
        {!started ? (
          <>
            <button type="button" aria-label="10 seconds less" onClick={() => adjust(-10)} className={btn}><Minus size={16} /></button>
            <button type="button" onClick={start} className={`${goldBtn} flex items-center gap-2 !px-8`}><Play size={16} /> Start timer</button>
            <button type="button" aria-label="10 seconds more" onClick={() => adjust(10)} className={btn}><Plus size={16} /></button>
          </>
        ) : (
          <>
            <button type="button" aria-label={running ? 'Pause' : 'Resume'} onClick={running ? pause : start} className={btn}>{running ? <Pause size={18} /> : <Play size={18} />}</button>
            <button type="button" aria-label="Restart timer" onClick={reset} className={btn}><RotateCcw size={16} /></button>
          </>
        )}
      </div>
      <p className="mt-3 text-[11px] text-mute">{started ? 'The set is checked off when the timer ends.' : 'Use − and + to change the time by 10 seconds.'}</p>
    </div>
  )
}

// Rest between sets. Starts by itself, clearly labelled so it is not mistaken for the exercise timer.
function RestTimer({ seconds, nextSet, totalSets, onDone }) {
  const [left, setLeft] = useState(seconds)
  const end = useRef(Date.now() + seconds * 1000)
  const cb = useRef(onDone)
  cb.current = onDone

  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end.current - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) { clearInterval(id); alertUser(); cb.current?.() }
    }, 200)
    return () => clearInterval(id)
  }, [])

  const add = (d) => { end.current += d * 1000 }
  const small = 'rounded-full border border-sky-400/40 px-4 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/10'

  return (
    <div className="mt-6 rounded-2xl border border-sky-400/40 bg-sky-400/10 p-6 text-center">
      <p className="text-[11px] font-bold tracking-widest text-sky-300">REST</p>
      <p className="mt-1 text-6xl font-bold tabular-nums text-sky-400" aria-live="off">{fmt(left)}</p>
      <p className="mt-2 text-sm text-ink/90">Catch your breath. Next up: <b>Set {nextSet} of {totalSets}</b></p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button type="button" onClick={() => add(-10)} className={small}>−10s</button>
        <button type="button" onClick={() => cb.current?.()} className={`${small} !bg-sky-400 !text-black`}>Skip rest</button>
        <button type="button" onClick={() => add(10)} className={small}>+10s</button>
      </div>
    </div>
  )
}

// One row per set. For timed exercises the checks are locked and fill in by themselves when each timer ends.
function SetsList({ sets, reps, timed, locked, onToggle }) {
  const next = sets.indexOf(false)
  const label = timed ? reps : `${reps} reps`
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold">Sets</span>
        <span className="text-mute">{sets.filter(Boolean).length} of {sets.length} done</span>
      </div>
      <ul className="space-y-2">
        {sets.map((done, k) => (
          <li key={k} className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${done ? 'border-gold/60 bg-gold/10' : k === next ? 'border-white/30 bg-card' : 'border-white/10 bg-card'}`}>
            <span className="text-sm"><span className="font-semibold">Set {k + 1}</span> <span className="text-mute">· {label}</span></span>
            <button type="button" disabled={locked} aria-pressed={done}
              aria-label={locked ? `Set ${k + 1} ${done ? 'done' : 'not done yet'}` : `${done ? 'Unmark' : 'Mark'} set ${k + 1} as done`}
              onClick={() => onToggle(k)}
              className={`grid h-10 w-10 place-items-center rounded-full border-2 transition disabled:cursor-not-allowed ${done ? 'border-gold bg-gold text-black' : locked ? 'border-white/15 text-transparent' : 'border-white/30 text-transparent hover:border-gold hover:text-gold/60'}`}>
              <Check size={18} strokeWidth={3} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-mute">
        {timed ? 'Sets are checked off automatically when each timer ends.' : 'Tap the check after each set. A rest timer starts between sets.'}
      </p>
    </div>
  )
}

export default function WorkoutSession({ plan, day, onClose }) {
  const list = plan.schedule[day] ?? []
  const [i, setI] = useState(0)
  const [status, setStatus] = useState({})
  const [sets, setSets] = useState({})        // exercise id -> [true, false, ...] one flag per set
  const [targets, setTargets] = useState({})  // exercise id -> timer length the user chose last
  const [resting, setResting] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [pendingRecord, setPendingRecord] = useState(null)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (finished) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [finished])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const exit = () => { if (finished || window.confirm('End this workout? Your progress will not be saved.')) onClose() }
  const goTo = (n) => { setResting(false); setI(n) }
  const saveCompletion = async (record) => {
    setSavingRecord(true)
    setRecordError('')
    try {
      await api.post('/progress/workouts', record)
      setPendingRecord(null)
      setFinished(true)
    } catch (error) {
      setPendingRecord(record)
      setRecordError(errorsFrom(error).form)
    } finally {
      setSavingRecord(false)
    }
  }
  const mark = (value) => {
    const nextStatus = { ...status, [list[i].id]: value }
    setStatus(nextStatus)
    if (i === list.length - 1) {
      setResting(false)
      const duration = Math.floor((Date.now() - startedAt.current) / 1000)
      setElapsed(duration)
      void saveCompletion({
        workout_id: plan.id,
        workout_type: DAY_NAMES[day],
        workout_duration: duration,
        exercises_done: list.filter((exercise) => nextStatus[exercise.id] === 'done').length,
        exercises_skipped: list.filter((exercise) => nextStatus[exercise.id] === 'skipped').length,
      })
    } else {
      goTo(i + 1)
    }
  }

  const ex = list[i]
  const timedSec = ex ? timedSeconds(ex.reps) : null
  const timed = timedSec != null
  const doneSets = sets[ex?.id] ?? Array(ex?.sets ?? 0).fill(false)
  const doneCount = doneSets.filter(Boolean).length
  const allDone = doneSets.length > 0 && doneCount === doneSets.length

  // Reps exercise: the user checks a set by hand. Checking a set (with more to go) starts the rest timer.
  const toggleSet = (k) => {
    if (timed || resting) return
    const n = [...doneSets]; n[k] = !n[k]
    setSets((s) => ({ ...s, [ex.id]: n }))
    setResting(n[k] && n.some((x) => !x))
  }
  // Timed exercise: the countdown finishing checks off the next set, then rest starts if sets remain.
  const completeTimedSet = (usedSeconds) => {
    const n = [...doneSets]; const k = n.indexOf(false)
    if (k < 0) return
    n[k] = true
    setSets((s) => ({ ...s, [ex.id]: n }))
    setTargets((t) => ({ ...t, [ex.id]: usedSeconds }))
    setResting(n.some((x) => !x))
  }

  const done = list.filter((e) => status[e.id] === 'done').length
  const skipped = list.filter((e) => status[e.id] === 'skipped').length
  const repsText = ex ? (timed ? ex.reps : `${ex.reps} reps`) : ''

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
            {recordError && (
              <div role="alert" className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                <p>Workout finished, but its progress could not be saved: {recordError}</p>
                <button type="button" disabled={savingRecord} onClick={() => pendingRecord && saveCompletion(pendingRecord)} className="mt-2 font-semibold underline disabled:opacity-50">
                  {savingRecord ? 'Saving...' : 'Retry saving'}
                </button>
              </div>
            )}
            <div className="flex gap-1.5" aria-hidden="true">
              {list.map((e, n) => <span key={e.id} className={`h-1 flex-1 rounded-full ${n < i ? 'bg-gold' : n === i ? 'bg-gold/60' : 'bg-white/15'}`} />)}
            </div>
            <p className="mt-4 text-[11px] font-semibold tracking-wide text-gold">EXERCISE {i + 1} OF {list.length}</p>
            <h1 className="mt-1 text-3xl font-bold">{ex.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px]">{ex.muscle}</span>
              <span className="text-sm font-semibold text-gold">{ex.sets} sets × {repsText}</span>
            </div>
            {ex.notes && <p className="mt-3 text-sm text-ink/80">{ex.notes}</p>}

            {resting ? (
              <RestTimer key={`${ex.id}-rest-${doneCount}`} seconds={timed ? REST_TIMED : REST_REPS} nextSet={doneCount + 1} totalSets={ex.sets} onDone={() => setResting(false)} />
            ) : timed && !allDone ? (
              <SetTimer key={`${ex.id}-set-${doneCount}`} seconds={targets[ex.id] ?? timedSec} setNumber={doneCount + 1} totalSets={ex.sets} onComplete={completeTimedSet} />
            ) : null}

            <SetsList sets={doneSets} reps={ex.reps} timed={timed} locked={timed || resting} onToggle={toggleSet} />

            <div className="mt-auto pt-8">
              {list[i + 1] && <p className="mb-3 text-center text-xs text-mute">Up next: <span className="text-ink">{list[i + 1].name}</span></p>}
              <button type="button" disabled={!allDone || savingRecord} onClick={() => mark('done')} className={`${goldBtn} flex w-full items-center justify-center gap-2 py-4 text-base`}>
                <Check size={20} strokeWidth={3} /> {savingRecord ? 'Saving workout...' : i === list.length - 1 ? 'Done, finish workout' : 'Done, next exercise'}
              </button>
              {!allDone && <p className="mt-2 text-center text-[11px] text-mute">{timed ? 'Finish every set timer to continue.' : 'Check off every set to continue.'}</p>}
              <div className="mt-3 flex justify-between text-sm font-semibold text-mute">
                <button type="button" disabled={i === 0 || savingRecord} onClick={() => goTo(i - 1)} className="flex items-center gap-1 transition hover:text-ink disabled:opacity-30"><ChevronLeft size={16} /> Previous</button>
                <button type="button" disabled={savingRecord} onClick={() => mark('skipped')} className="flex items-center gap-1 transition hover:text-ink disabled:opacity-50">Skip <SkipForward size={16} /></button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
