import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, Dumbbell, Minus, Pause, Play, Plus, RotateCcw, SkipForward, Timer, Trophy, X } from 'lucide-react'
import { DAY_NAMES, equipmentLabel, exerciseLine, exerciseTarget, fmtClock as fmt, inferEquipment } from '../../lib/workouts'
import { api, errorsFrom } from '../../lib/api'
import { ghostBtn, goldBtn } from './Modal'
import { getProfile } from '../../lib/profile'

const REST_TIMED = 30   // seconds of rest after a timed set
const REST_REPS = 60    // seconds of rest after a sets-and-reps set
const PREP = 3          // "get ready" seconds before a timed set starts

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

// A ring that empties as the time runs down.
function Ring({ value, total, tone = 'gold', children }) {
  const size = 220, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const p = total > 0 ? Math.min(1, value / total) : 0
  const color = tone === 'sky' ? '#38bdf8' : '#f5b82e'
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset .3s linear' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

// Countdown for ONE set of a timed exercise. A short "get ready" runs first. At zero the set is checked off automatically.
function SetTimer({ seconds, setNumber, totalSets, onComplete }) {
  const [target, setTarget] = useState(seconds)
  const [value, setValue] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [prep, setPrep] = useState(null)
  const t0 = useRef(0)
  const acc = useRef(0)
  const cb = useRef(onComplete)
  cb.current = onComplete

  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => {
      const ms = acc.current + Date.now() - t0.current
      const left = Math.max(0, Math.ceil((target * 1000 - ms) / 1000))
      setValue(left)
      if (left === 0) { clearInterval(id); setRunning(false); alertUser(); cb.current?.(target) }
    }, 200)
    return () => clearInterval(id)
  }, [running, target])

  useEffect(() => {
    if (prep == null) return undefined
    if (prep === 0) { setPrep(null); t0.current = Date.now(); setRunning(true); return undefined }
    try { navigator.vibrate?.(30) } catch { /* not supported */ }
    const id = setTimeout(() => setPrep((p) => p - 1), 1000)
    return () => clearTimeout(id)
  }, [prep])

  const start = () => { setStarted(true); setPrep(PREP) }
  const resume = () => { t0.current = Date.now(); setRunning(true) }
  const pause = () => { acc.current += Date.now() - t0.current; setRunning(false) }
  const reset = () => { acc.current = 0; setValue(target); setRunning(false); setStarted(false); setPrep(null) }
  const adjust = (d) => { const n = Math.min(3600, Math.max(5, target + d)); setTarget(n); setValue(n) }
  const btn = 'grid h-12 w-12 place-items-center rounded-full border border-white/20 transition hover:bg-white/10 active:scale-95'

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-card p-6 text-center">
      <p className="mb-4 text-xs text-mute">Set {setNumber} of {totalSets}</p>
      <Ring value={prep != null ? 0 : value} total={target}>
        {prep != null ? (
          <>
            <p className="text-[11px] font-bold tracking-widest text-gold">GET READY</p>
            <p className="text-7xl font-bold tabular-nums">{prep}</p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold tracking-widest text-mute">{running ? 'GO' : started ? 'PAUSED' : 'TIME'}</p>
            <p className={`text-6xl font-bold tabular-nums ${running ? 'text-gold' : ''}`} aria-live="off">{fmt(value)}</p>
          </>
        )}
      </Ring>
      <div className="mt-5 flex items-center justify-center gap-3">
        {!started ? (
          <>
            <button type="button" aria-label="10 seconds less" onClick={() => adjust(-10)} className={btn}><Minus size={16} /></button>
            <button type="button" onClick={start} className={`${goldBtn} flex items-center gap-2 !px-8 !py-3.5 text-base`}><Play size={18} /> Start timer</button>
            <button type="button" aria-label="10 seconds more" onClick={() => adjust(10)} className={btn}><Plus size={16} /></button>
          </>
        ) : (
          <>
            <button type="button" aria-label={running ? 'Pause' : 'Resume'} disabled={prep != null} onClick={running ? pause : resume} className={`${btn} disabled:opacity-30`}>{running ? <Pause size={18} /> : <Play size={18} />}</button>
            <button type="button" aria-label="Restart timer" onClick={reset} className={btn}><RotateCcw size={16} /></button>
          </>
        )}
      </div>
      <p className="mt-3 text-[11px] text-mute">{started ? 'The set is checked off when the timer ends.' : 'You get 3 seconds to get ready. Use − and + to change the time.'}</p>
    </div>
  )
}

// Rest between sets. Starts by itself, clearly labelled so it is not mistaken for the exercise timer.
function RestTimer({ seconds, nextSet, totalSets, onDone }) {
  const [left, setLeft] = useState(seconds)
  const [total, setTotal] = useState(seconds)
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

  const add = (d) => { end.current += d * 1000; setTotal((t) => Math.max(t, Math.ceil((end.current - Date.now()) / 1000))) }
  const small = 'rounded-full border border-sky-400/40 px-4 py-2.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/10 active:scale-95'

  return (
    <div className="mt-6 rounded-3xl border border-sky-400/40 bg-sky-400/10 p-6 text-center">
      <Ring value={left} total={total} tone="sky">
        <p className="text-[11px] font-bold tracking-widest text-sky-300">REST</p>
        <p className="text-6xl font-bold tabular-nums text-sky-400" aria-live="off">{fmt(left)}</p>
      </Ring>
      <p className="mt-4 text-sm text-ink/90">Catch your breath. Next up: <b>Set {nextSet} of {totalSets}</b></p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button type="button" onClick={() => add(-10)} className={small}>−10s</button>
        <button type="button" onClick={() => cb.current?.()} className={`${small} !bg-sky-400 !text-black`}>Skip rest</button>
        <button type="button" onClick={() => add(10)} className={small}>+10s</button>
      </div>
    </div>
  )
}

// One row per set. For timed exercises the checks are locked and fill in by themselves when each timer ends.
function SetsList({ sets, label, timed, locked, onToggle }) {
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
            <span className="text-sm"><span className="font-semibold">Set {k + 1}</span> <span className="text-mute">· {label}</span></span>
            <button type="button" disabled={locked} aria-pressed={done}
              aria-label={locked ? `Set ${k + 1} ${done ? 'done' : 'not done yet'}` : `${done ? 'Unmark' : 'Mark'} set ${k + 1} as done`}
              onClick={() => onToggle(k)}
              className={`grid h-11 w-11 place-items-center rounded-full border-2 transition active:scale-95 disabled:cursor-not-allowed ${done ? 'border-gold bg-gold text-black' : locked ? 'border-white/15 text-transparent' : 'border-white/30 text-transparent hover:border-gold hover:text-gold/60'}`}>
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

export default function WorkoutSession({ plan, day, onClose, onComplete }) {
  const list = plan.schedule[day] ?? []
  const [started, setStarted] = useState(false)
  const [i, setI] = useState(0)
  const [status, setStatus] = useState({})
  const [sets, setSets] = useState({})        // exercise id -> [true, false, ...] one flag per set
  const [targets, setTargets] = useState({})  // exercise id -> timer length the user chose last
  const [resting, setResting] = useState(false)
  const [finished, setFinished] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [pendingRecord, setPendingRecord] = useState(null)
  const [calorieRecords, setCalorieRecords] = useState([])
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0)
  const [needsBodyWeight, setNeedsBodyWeight] = useState(false)
  const [bodyWeightKg, setBodyWeightKg] = useState(() => {
    const weight = Number(getProfile()?.weightKg)
    return Number.isFinite(weight) && weight >= 20 && weight <= 350 ? String(weight) : ''
  })
  const startedAt = useRef(Date.now())
  const exerciseStartedAt = useRef(null)
  const exerciseDurations = useRef({})
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    if (!started || finished) return undefined
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [started, finished])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => { exerciseStartedAt.current = Date.now() }, [i, started])
  // Keep the screen on during the workout (where the browser allows it).
  useEffect(() => {
    if (!started || finished) return undefined
    let lock = null
    navigator.wakeLock?.request?.('screen').then((l) => { lock = l }).catch(() => {})
    return () => { try { lock?.release?.() } catch { /* already released */ } }
  }, [started, finished])

  const begin = () => { startedAt.current = Date.now(); exerciseStartedAt.current = Date.now(); setStarted(true) }
  const exit = () => { if (finished || !started) onClose(); else setConfirmExit(true) }
  const goTo = (n) => { setResting(false); setI(n) }
  const saveCompletion = async (record) => {
    setSavingRecord(true)
    setRecordError('')
    try {
      const { data } = await api.post('/progress/workouts', record)
      setCalorieRecords(data.calorie_burned_records ?? [])
      setTotalCaloriesBurned(Number(data.total_calories_burned) || 0)
      setPendingRecord(null)
      setFinished(true)
      completeRef.current?.({ name: plan.name, day, minutes: Math.max(1, Math.round(record.workout_duration / 60)), done: record.exercises_done, skipped: record.exercises_skipped })
    } catch (error) {
      setPendingRecord(record)
      setNeedsBodyWeight(Boolean(error.response?.data?.errors?.body_weight_kg))
      const errors = errorsFrom(error)
      setRecordError(errors.form || errors.fields.body_weight_kg || 'Please check the workout details and try again.')
    } finally {
      setSavingRecord(false)
    }
  }
  const mark = (value) => {
    const nextStatus = { ...status, [list[i].id]: value }
    setStatus(nextStatus)
    const exerciseId = list[i].id
    const secondsSpent = Math.max(1, Math.ceil((Date.now() - (exerciseStartedAt.current ?? Date.now())) / 1000))
    exerciseDurations.current[exerciseId] = (exerciseDurations.current[exerciseId] ?? 0) + secondsSpent
    if (i === list.length - 1) {
      setResting(false)
      const duration = Math.floor((Date.now() - startedAt.current) / 1000)
      setElapsed(duration)
      const exerciseDurationsPayload = list
        .filter((exercise) => exerciseDurations.current[exercise.id] > 0)
        .map((exercise) => ({
          workout_exercise_id: Number(exercise.id),
          duration_seconds: exerciseDurations.current[exercise.id],
        }))
      void saveCompletion({
        workout_id: plan.id,
        workout_type: DAY_NAMES[day],
        workout_duration: duration,
        exercises_done: list.filter((exercise) => nextStatus[exercise.id] === 'done').length,
        exercises_skipped: list.filter((exercise) => nextStatus[exercise.id] === 'skipped').length,
        exercise_durations: exerciseDurationsPayload,
        ...(bodyWeightKg ? { body_weight_kg: Number(bodyWeightKg) } : {}),
      })
    } else {
      goTo(i + 1)
    }
  }

  const ex = list[i]
  // Timed exercises count down for the time chosen in the plan. Everything else is counted in reps.
  const target = ex ? exerciseTarget(ex) : { timed: false, seconds: null, label: '' }
  const timed = target.timed
  const timedSec = target.seconds
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
  const calorieByWorkoutExercise = Object.fromEntries(
    calorieRecords.map((record) => [record.workout_exercise_id, Number(record.calories_burned) || 0])
  )
  const totalSets = list.reduce((n, e) => n + (Number(e.sets) || 0), 0)
  const needs = [...new Set(list.flatMap((e) => e.equipment ?? inferEquipment(e.name)))]
  const nextSetNumber = Math.min(doneCount + 1, ex?.sets ?? 1)

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0d0d0d]">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 py-5">
        <header className="flex items-center justify-between">
          <div className="min-w-0"><p className="truncate text-sm font-bold">{plan.name}</p><p className="text-[11px] text-mute">{DAY_NAMES[day]}</p></div>
          <div className="flex items-center gap-4">
            {started && <div className="text-right leading-tight"><p className="text-[10px] text-mute">Workout time</p><p className="text-lg font-bold tabular-nums text-gold">{fmt(elapsed)}</p></div>}
            <button type="button" aria-label="Close workout" onClick={exit} className="grid h-9 w-9 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-ink"><X size={22} /></button>
          </div>
        </header>

        {!started ? (
          /* ---------- overview: what is coming ---------- */
          <section className="flex flex-1 flex-col py-6">
            <p className="text-[11px] font-semibold tracking-wide text-gold">READY?</p>
            <h1 className="mt-1 text-3xl font-bold">{DAY_NAMES[day]}'s workout</h1>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[[list.length, 'Exercises'], [totalSets, 'Total sets'], [`${plan.minutes} min`, 'Estimated']].map(([v, k]) => (
                <div key={k} className="rounded-xl border border-white/10 bg-card p-3"><p className="text-xl font-bold text-gold">{v}</p><p className="text-[11px] text-mute">{k}</p></div>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold">What you need</p>
              <div className="flex flex-wrap gap-2">
                {needs.length === 1 && needs[0] === 'bodyweight'
                  ? <span className="rounded-full bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold">No equipment needed</span>
                  : needs.filter((n) => n !== 'bodyweight').map((n) => <span key={n} className="rounded-full bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold">{equipmentLabel(n)}</span>)}
              </div>
            </div>
            <ol className="mt-5 space-y-2">
              {list.map((e, n) => {
                const t = exerciseTarget(e)
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card px-3 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">{n + 1}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{e.name}</span><span className="block text-xs text-mute">{exerciseLine(e)}</span></span>
                    <span className="text-gold" aria-label={t.timed ? 'Timed' : 'Reps'}>{t.timed ? <Timer size={18} /> : <Dumbbell size={18} />}</span>
                  </li>
                )
              })}
            </ol>
            <div className="mt-5 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-mute">
              <b className="text-ink/90">How it works:</b> for reps, do the set and tap the check. For timed exercises, a countdown runs for you. A rest timer starts between sets.
            </div>
            <div className="mt-auto pt-6">
              <button type="button" disabled={list.length === 0} onClick={begin} className={`${goldBtn} flex w-full items-center justify-center gap-2 py-4 text-base`}><Play size={20} /> Start workout</button>
              {list.length === 0 && <p className="mt-2 text-center text-[11px] text-mute">This day has no exercises yet.</p>}
            </div>
          </section>
        ) : finished ? (
          <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-gold/15 text-gold"><Trophy size={40} /></span>
            <h1 className="mt-5 text-3xl font-bold">Workout complete!</h1>
            <p className="mt-1 text-sm text-ink/80">Great job finishing {DAY_NAMES[day]}'s session.</p>
            <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Time', fmt(elapsed)], ['Done', done], ['Skipped', skipped], ['Calories burned', `${fmt(totalCaloriesBurned)} kcal`]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/10 bg-card p-3"><p className="text-2xl font-bold text-gold">{v}</p><p className="text-[11px] text-mute">{k}</p></div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-mute">Calories are estimates based on exercise time, activity intensity, and body weight.</p>
            <ul className="mt-5 w-full space-y-2 text-left text-sm">
              {list.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-card px-4 py-2.5">
                  <span>{e.name}</span>
                  <span className="text-right">
                    <span className={`block ${status[e.id] === 'done' ? 'text-green-400' : 'text-mute'}`}>{status[e.id] === 'done' ? 'Done' : 'Skipped'}</span>
                    <span className="text-xs text-gold">{fmt(calorieByWorkoutExercise[e.id] ?? 0)} kcal</span>
                  </span>
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
                {needsBodyWeight && (
                  <label className="mt-3 block text-xs font-semibold">
                    Body weight (kg)
                    <input type="number" min="20" max="350" step="0.1" value={bodyWeightKg} onChange={(event) => setBodyWeightKg(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-base text-ink" />
                  </label>
                )}
                <button type="button" disabled={savingRecord || (needsBodyWeight && !bodyWeightKg)} onClick={() => pendingRecord && saveCompletion({
                  ...pendingRecord,
                  ...(bodyWeightKg ? { body_weight_kg: Number(bodyWeightKg) } : {}),
                })} className="mt-2 font-semibold underline disabled:opacity-50">
                  {savingRecord ? 'Saving...' : 'Retry saving'}
                </button>
              </div>
            )}
            <div className="flex gap-1.5" aria-hidden="true">
              {list.map((e, n) => <span key={e.id} className={`h-1 flex-1 rounded-full ${n < i ? 'bg-gold' : n === i ? 'bg-gold/60' : 'bg-white/15'}`} />)}
            </div>
            <p className="mt-4 text-[11px] font-semibold tracking-wide text-gold">EXERCISE {i + 1} OF {list.length}</p>
            <h1 className="mt-1 text-3xl font-bold">{ex.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px]">{ex.muscle}</span>
              {timed && <span className="flex items-center gap-1 rounded-md bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold"><Timer size={12} /> Timed</span>}
              <span className="text-sm font-semibold text-gold">{ex.sets} sets × {target.label}</span>
              {!timed && ex.weight && <span className="text-xs text-mute">{ex.weight}</span>}
            </div>
            {ex.notes && <p className="mt-3 text-sm text-ink/80">{ex.notes}</p>}

            {resting ? (
              <RestTimer key={`${ex.id}-rest-${doneCount}`} seconds={timed ? REST_TIMED : REST_REPS} nextSet={doneCount + 1} totalSets={ex.sets} onDone={() => setResting(false)} />
            ) : timed && !allDone ? (
              <SetTimer key={`${ex.id}-set-${doneCount}`} seconds={targets[ex.id] ?? timedSec} setNumber={nextSetNumber} totalSets={ex.sets} onComplete={completeTimedSet} />
            ) : !timed && !allDone ? (
              <div className="mt-6 rounded-3xl border border-white/10 bg-card p-6 text-center">
                <p className="text-xs text-mute">Set {nextSetNumber} of {ex.sets}</p>
                <p className="mt-1 text-6xl font-bold text-gold">{ex.reps}<span className="ml-2 text-xl font-semibold text-ink/80">reps</span></p>
                {ex.weight && <p className="mt-1 text-sm text-mute">with {ex.weight}</p>}
                <p className="mt-3 text-[11px] text-mute">Do your reps, then tap the check below.</p>
              </div>
            ) : null}

            <SetsList sets={doneSets} label={timed ? target.label : `${ex.reps} reps`} timed={timed} locked={timed || resting} onToggle={toggleSet} />

            <div className="mt-auto pt-8">
              {list[i + 1] && <p className="mb-3 text-center text-xs text-mute">Up next: <span className="text-ink">{list[i + 1].name}</span> ({exerciseTarget(list[i + 1]).timed ? 'timed' : 'reps'})</p>}
              <button type="button" disabled={!allDone || savingRecord} onClick={() => mark('done')} className={`${goldBtn} flex w-full items-center justify-center gap-2 py-4 text-base`}>
                <Check size={20} strokeWidth={3} /> {savingRecord ? 'Saving workout...' : i === list.length - 1 ? 'Done, finish workout' : 'Done, next exercise'}
              </button>
              {!allDone && <p className="mt-2 text-center text-[11px] text-mute">{timed ? 'Finish every set timer to continue.' : 'Check off every set to continue.'}</p>}
              <div className="mt-3 flex justify-between text-sm font-semibold text-mute">
                <button type="button" disabled={i === 0 || savingRecord} onClick={() => goTo(i - 1)} className="flex items-center gap-1 py-2 transition hover:text-ink disabled:opacity-30"><ChevronLeft size={16} /> Previous</button>
                <button type="button" disabled={savingRecord} onClick={() => mark('skipped')} className="flex items-center gap-1 py-2 transition hover:text-ink disabled:opacity-50">Skip <SkipForward size={16} /></button>
              </div>
            </div>
          </section>
        )}
      </div>

      {confirmExit && (
        <div className="fixed inset-0 z-[61] grid place-items-center bg-black/70 p-4">
          <div role="alertdialog" aria-modal="true" aria-label="End workout" className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5">
            <h2 className="text-lg font-bold">End this workout?</h2>
            <p className="mt-1 text-sm text-ink/90">Your progress will not be saved.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmExit(false)} className={ghostBtn}>Keep going</button>
              <button type="button" onClick={onClose} className="rounded-full bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">End workout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
