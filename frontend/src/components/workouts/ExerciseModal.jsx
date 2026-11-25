import { useMemo, useState } from 'react'
import { Dumbbell, Pencil, Plus, Search, Timer, Trash2 } from 'lucide-react'
import Modal, { fieldClass, ghostBtn, goldBtn } from './Modal'
import { Chip, Label, Stepper, Tile } from './controls'
import {
  DURATION_CHIPS, EQUIPMENT, EQUIPMENT_IDS, MUSCLES, enrichExercise, equipmentLabel, exerciseFits, exerciseSeconds,
  exerciseTarget, fmtDuration, inferMuscle,
} from '../../lib/workouts'
import { libraryAsCatalog, removeFromLibrary, saveToLibrary } from '../../lib/customExercises'

const SET_CHIPS = [2, 3, 4, 5]
const REP_CHIPS = [5, 6, 8, 10, 12, 15, 20, 25]
const defaultSeconds = (e) => (e.muscle === 'Cardio' ? 60 : 30)

const Badge = ({ children, gold = false }) => (
  <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${gold ? 'bg-gold/15 text-gold' : 'bg-white/10 text-ink/80'}`}>{children}</span>
)

export default function ExerciseModal({
  exercise, startEditing, exerciseCatalog = [], exerciseGoal, exerciseNamesLoading = false, exerciseNamesError = '',
  actionError = '', equipment, onSave, onDelete, onClose,
}) {
  const isNew = !exercise
  const startSeconds = exercise ? exerciseSeconds(exercise) : null
  const [view, setView] = useState(isNew ? 'pick' : startEditing ? 'details' : 'read')
  const [f, setF] = useState(() => ({
    name: exercise?.name ?? '',
    exerciseId: exercise?.exerciseId,
    timed: startSeconds != null,
    sets: exercise?.sets ?? 3,
    reps: exercise && startSeconds == null && exercise.reps ? String(exercise.reps) : '10',
    seconds: startSeconds ?? 30,
    weight: exercise?.weight ?? '',
    muscle: exercise?.muscle ?? inferMuscle(exercise?.name ?? ''),
    notes: exercise?.notes ?? '',
    custom: Boolean(exercise?.custom),            // an exercise the user typed in themselves
    customId: exercise?.customId,
    equipment: exercise?.equipment,
    muscles: exercise?.muscles,
  }))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showNote, setShowNote] = useState(Boolean(exercise?.notes))

  // picker filters
  const [q, setQ] = useState('')
  const [eq, setEq] = useState(equipment?.length ? equipment : EQUIPMENT_IDS)
  const [muscleF, setMuscleF] = useState('All')
  const [typeF, setTypeF] = useState('all')

  // "Add my own exercise" form, and the user's saved exercises
  const [cu, setCu] = useState({ name: '', equipment: [], muscles: [], timed: null })
  const [cuBack, setCuBack] = useState('pick')
  const [library, setLibrary] = useState(0)     // bumps when the user's own list changes
  const [delId, setDelId] = useState(null)

  // Recommended exercises (best for the plan's goal) first, then the rest of the catalog.
  // The user's own exercises come first, then the recommended ones, then the rest.
  const catalog = useMemo(
    () => [...libraryAsCatalog().map(enrichExercise), ...exerciseCatalog.map(enrichExercise)]
      .sort((a, b) => ((b.custom ? 2 : b.bestFor ? 1 : 0) - (a.custom ? 2 : a.bestFor ? 1 : 0))),
    [exerciseCatalog, library], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const toggleEq = (id) => setEq((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))

  const openCustom = (prefill, back = 'pick', from) => {
    setCu(from ?? { name: prefill ?? '', equipment: [], muscles: [], timed: null })
    setCuBack(back)
    setView('custom')
  }
  const finishCustom = () => {
    setF((s) => ({
      ...s, name: cu.name.trim(), custom: true, exerciseId: null, timed: cu.timed, muscle: cu.muscles[0], muscles: cu.muscles, equipment: cu.equipment,
      seconds: cu.timed ? (s.timed ? s.seconds : 30) : s.seconds, weight: cu.timed ? '' : s.weight,
    }))
    setView('details')
  }

  const choose = (e) => {
    setF((s) => ({
      ...s, name: e.name, exerciseId: e.custom ? null : e.id, timed: e.timed, muscle: e.muscle, muscles: e.muscles,
      custom: Boolean(e.custom), customId: e.custom ? e.id : undefined, equipment: e.custom ? e.equipment : undefined,
      seconds: e.timed ? (s.timed ? s.seconds : defaultSeconds(e)) : s.seconds,
      weight: e.timed ? '' : s.weight,
    }))
    setView('details')
  }

  const submit = async () => {
    setSaving(true)
    setSaveError('')
    try {
      // The user's own exercise is remembered in their list, so they can pick it again next time.
      const mine = f.custom
        ? saveToLibrary({ id: f.customId, name: f.name.trim(), muscles: f.muscles?.length ? f.muscles : [f.muscle], equipment: f.equipment?.length ? f.equipment : ['bodyweight'], timed: f.timed })
        : null
      if (mine) setLibrary((n) => n + 1)
      await onSave({
        ...exercise,
        ...(mine ? { custom: true, customId: mine.id, equipment: mine.equipment, muscles: mine.muscles } : { custom: false, customId: undefined }),
        exerciseId: mine ? null : f.exerciseId ?? exercise?.exerciseId,
        name: f.name.trim(),
        sets: Math.min(20, Math.max(1, Number(f.sets) || 1)),
        reps: f.timed ? `${f.seconds} sec` : String(f.reps).trim() || '10',
        weight: f.timed ? '' : String(f.weight).trim(),
        duration: f.timed ? String(f.seconds) : '',
        weightORduration: f.timed ? 'duration' : 'weight',
        muscle: f.muscle,
        notes: f.notes.trim(),
      })
    } catch (error) {
      setSaveError(error.message || 'The exercise could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const errorBox = (actionError || saveError) && <p role="alert" className="mb-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{saveError || actionError}</p>

  /* ---------- read-only view of an exercise ---------- */
  if (view === 'read') {
    const t = exerciseTarget(exercise)
    return (
      <Modal title="Exercise details" onClose={onClose}
        footer={confirmDelete ? (
          <div role="alertdialog" aria-label="Confirm remove">
            <p className="text-sm font-semibold">Remove this exercise from the day?</p>
            <div className="mt-3 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className={ghostBtn}>Keep it</button>
              <button type="button" onClick={onDelete} className="rounded-full bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">Remove</button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full border border-danger/50 px-5 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10">Remove</button>
            <button type="button" onClick={() => setView('details')} className={`${goldBtn} flex items-center gap-2`}><Pencil size={15} /> Edit</button>
          </div>
        )}>
        {errorBox}
        <p className="text-xl font-bold">{exercise.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(exercise.muscles ?? [exercise.muscle]).map((m) => <Badge key={m}>{m}</Badge>)}
          {(exercise.equipment ?? []).map((t2) => <Badge key={t2}>{equipmentLabel(t2)}</Badge>)}
          {t.timed && <Badge gold>Timed</Badge>}
          {exercise.custom && <Badge gold>Mine</Badge>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold text-gold">{exercise.sets}</p><p className="text-[11px] text-mute">Sets</p></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold text-gold">{t.timed ? t.label : exercise.reps}</p><p className="text-[11px] text-mute">{t.timed ? 'Per set' : 'Reps'}</p></div>
        </div>
        {!t.timed && exercise.weight && <p className="mt-3 text-sm text-mute">Weight: {exercise.weight}</p>}
        <p className="mt-4 text-sm text-ink/90">{exercise.notes || 'No notes yet. Tap Edit to add form tips.'}</p>
      </Modal>
    )
  }

  /* ---------- step 1: choose the exercise ---------- */
  if (view === 'pick') {
    const loading = exerciseNamesLoading
    const needle = q.trim().toLowerCase()
    const matchQ = (e) => !needle || e.name.toLowerCase().includes(needle)
    const okMuscle = (e, m) => m === 'All' || (e.muscles ?? [e.muscle]).includes(m)
    const mixed = catalog.some((e) => e.bestFor) && catalog.some((e) => !e.bestFor)
    const okType = (e, t) => t === 'all' || (t === 'timed') === e.timed
    // Does an exercise pass the filters? Any one of them can be swapped to see "what if".
    const test = (e, o = {}) => matchQ(e) && exerciseFits(e, o.eq ?? eq) && okMuscle(e, o.m ?? muscleF) && okType(e, o.t ?? typeF)

    const exact = catalog.filter((e) => test(e))
    const muscleCount = (m) => catalog.filter((e) => test(e, { m })).length
    const typeCount = (t) => catalog.filter((e) => test(e, { t })).length
    const unlocks = (id) => (eq.includes(id) ? 0 : catalog.filter((e) => test(e, { eq: [...eq, id] }) && !test(e)).length)

    // Near misses: exercises that fail exactly one filter, so the user always has something to pick.
    const rest = catalog.filter((e) => matchQ(e) && !test(e))
    const missed = (e) => [!exerciseFits(e, eq) && 'eq', !okMuscle(e, muscleF) && 'm', !okType(e, typeF) && 't'].filter(Boolean)
    const groups = []
    if (exact.length < 4) {
      const defs = [
        ['eq', muscleF !== 'All' ? `${muscleF} exercises that need other equipment` : 'Exercises that need other equipment'],
        ['m', 'Other muscle groups with your equipment'],
        ['t', typeF === 'timed' ? 'Rep-based exercises instead' : 'Timed exercises instead'],
      ]
      defs.forEach(([key, title]) => {
        const items = rest.filter((e) => { const m = missed(e); return m.length === 1 && m[0] === key })
        if (items.length) groups.push({ key, title, items: items.slice(0, 6) })
      })
      if (!exact.length && !groups.length) {
        const close = rest.filter((e) => missed(e).length === 2).slice(0, 8)
        if (close.length) groups.push({ key: 'close', title: 'Closest matches', items: close })
      }
      if (!exact.length && !groups.length) {
        const any = catalog.filter(matchQ).slice(0, 12)
        if (any.length) groups.push({ key: 'all', title: 'All exercises', items: any })
      }
    }

    const filtersOn = eq.length < EQUIPMENT_IDS.length || muscleF !== 'All' || typeF !== 'all' || q
    const clear = () => { setEq(EQUIPMENT_IDS); setMuscleF('All'); setTypeF('all'); setQ('') }
    const eqText = eq.length === EQUIPMENT_IDS.length ? 'any equipment' : eq.length ? eq.map((id) => equipmentLabel(id)).join(' or ') : 'no equipment'
    const unlockable = EQUIPMENT.filter((e) => unlocks(e.id) > 0)
    const count = (n) => <span className="ml-1 text-[10px] font-medium opacity-60">{n}</span>

    const row = (e) => {
      const lacking = e.equipment.filter((t) => !eq.includes(t))
      if (delId === e.id) {
        return (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3" role="alertdialog" aria-label={`Delete ${e.name}`}>
            <p className="min-w-0 truncate text-sm">Delete <b>{e.name}</b> from your list?</p>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={() => setDelId(null)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold">Keep</button>
              <button type="button" onClick={() => { removeFromLibrary(e.id); setLibrary((n) => n + 1); setDelId(null) }} className="rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white">Delete</button>
            </span>
          </li>
        )
      }
      return (
        <li key={e.id} className="flex items-stretch gap-2">
          <button type="button" onClick={() => choose(e)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-left transition hover:border-gold/60 active:scale-[0.99]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-gold">{e.timed ? <Timer size={20} /> : <Dumbbell size={20} />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{e.name}</span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                {(e.muscles ?? [e.muscle]).slice(0, 2).map((m) => <Badge key={m}>{m}</Badge>)}
                {e.equipment.map((t) => <Badge key={t}>{equipmentLabel(t)}</Badge>)}
                {e.timed && <Badge gold>Timed</Badge>}
                {e.custom && <Badge gold>Mine</Badge>}
                {mixed && e.bestFor && !e.custom && <Badge gold>Recommended</Badge>}
                {lacking.length > 0 && <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">Needs {lacking.map(equipmentLabel).join(', ')}</span>}
              </span>
            </span>
          </button>
          {e.custom && (
            <button type="button" aria-label={`Delete ${e.name} from my exercises`} onClick={() => setDelId(e.id)}
              className="grid w-11 shrink-0 place-items-center rounded-2xl border border-white/10 text-mute transition hover:border-danger/50 hover:text-danger"><Trash2 size={16} /></button>
          )}
        </li>
      )
    }

    const exactName = catalog.some((e) => e.name.toLowerCase() === needle)
    const addOwn = (
      <button type="button" onClick={() => openCustom(q.trim())}
        className="flex w-full items-center gap-3 rounded-2xl border border-gold/50 bg-gold/5 px-4 py-3 text-left transition hover:bg-gold/10 active:scale-[0.99]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-black"><Plus size={20} /></span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{needle && !exactName ? `Add "${q.trim()}" as your own exercise` : "Can't find yours? Add your own exercise"}</span>
          <span className="block text-[11px] text-mute">Takes 3 taps. It is saved to your list for next time.</span>
        </span>
      </button>
    )

    return (
      <Modal title="Choose an exercise" subtitle={exerciseGoal ? (catalog.some((e) => e.bestFor) && catalog.some((e) => !e.bestFor) ? `Recommended for ${exerciseGoal} come first. Tap one to continue.` : `Best for ${exerciseGoal}. Tap one to continue.`) : 'Tap one to continue.'} onClose={onClose} wide>
        {errorBox}
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (optional)" aria-label="Search exercises" className={`${fieldClass} !pl-10`} />
        </label>
        {needle && !exactName && <div className="mt-3">{addOwn}</div>}

        <Label hint={eq.length === EQUIPMENT_IDS.length ? 'Everything' : `${eq.length} selected`}>Equipment you can use</Label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => {
            const n = unlocks(e.id)
            return <Chip key={e.id} active={eq.includes(e.id)} onClick={() => toggleEq(e.id)} className="!min-h-[2.25rem] !px-3 !text-xs">{e.label}{n > 0 && <span className="ml-1 text-[10px] font-bold text-gold">+{n}</span>}</Chip>
          })}
        </div>

        <Label>Muscle group</Label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {['All', ...MUSCLES].map((m) => {
            const n = m === 'All' ? null : muscleCount(m)
            return <Chip key={m} active={muscleF === m} onClick={() => setMuscleF(m)} className={`!min-h-[2.25rem] !px-3 !text-xs ${n === 0 && muscleF !== m ? 'opacity-50' : ''}`}>{m}{n != null && count(n)}</Chip>
          })}
        </div>

        <Label>Type</Label>
        <div className="flex gap-2">
          {[['all', 'All'], ['reps', 'Reps'], ['timed', 'Timed']].map(([id, label]) => {
            const n = id === 'all' ? null : typeCount(id)
            return <Chip key={id} active={typeF === id} onClick={() => setTypeF(id)} className={`!min-h-[2.25rem] !px-3 !text-xs ${n === 0 && typeF !== id ? 'opacity-50' : ''}`}>{label}{n != null && count(n)}</Chip>
          })}
        </div>

        <div className="mb-2 mt-5 flex items-center justify-between text-xs text-mute">
          <span aria-live="polite">{loading ? 'Loading exercises...' : `${exact.length} matching exercise${exact.length === 1 ? '' : 's'}`}</span>
          {filtersOn && <button type="button" onClick={clear} className="font-semibold text-gold hover:underline">Clear filters</button>}
        </div>
        {exerciseNamesError && <p role="alert" className="mb-2 text-sm text-danger">{exerciseNamesError}</p>}
        {!loading && !exerciseNamesError && catalog.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-mute">No exercises are available for this goal yet.</p>}

        {!loading && catalog.length > 0 && exact.length === 0 && (
          <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/5 p-4" role="status">
            <p className="text-sm font-semibold">No exact match, but you have options.</p>
            <p className="mt-1 text-xs text-ink/80">
              We found no {muscleF !== 'All' ? `${muscleF.toLowerCase()} ` : ''}{typeF === 'all' ? '' : `${typeF} `}exercise for {eqText}. Add equipment to see more, or pick from the ideas below.
            </p>
            {unlockable.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {unlockable.map((e) => (
                  <button key={e.id} type="button" onClick={() => toggleEq(e.id)}
                    className="rounded-full border border-gold/60 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10 active:scale-95">
                    + {e.label} ({unlocks(e.id)})
                  </button>
                ))}
              </div>
            )}
            {filtersOn && <button type="button" onClick={clear} className="mt-3 text-xs font-semibold text-gold hover:underline">Show everything</button>}
            {!needle && <button type="button" onClick={() => openCustom('')} className="mt-3 block text-xs font-semibold text-gold hover:underline">Or add your own exercise</button>}
          </div>
        )}

        {exact.length > 0 && <ul className="space-y-2">{exact.map(row)}</ul>}

        {!loading && groups.map((g) => (
          <section key={g.key} className="mt-5" aria-label={g.title}>
            <h4 className="mb-2 text-xs font-bold text-gold">{exact.length ? 'More ideas: ' : ''}{g.title}</h4>
            <ul className="space-y-2">{g.items.map(row)}</ul>
          </section>
        ))}

        {!(needle && !exactName) && <div className="mt-6">{addOwn}</div>}
      </Modal>
    )
  }

  /* ---------- add your own exercise: the app asks what it is, with taps ---------- */
  if (view === 'custom') {
    const name = cu.name.trim()
    // Already in the server's list? Offer that one instead of making a duplicate.
    const already = catalog.find((e) => e.name.toLowerCase() === name.toLowerCase() && e.id !== f.customId)
    const toggleIn = (key, id) => setCu((c) => ({ ...c, [key]: c[key].includes(id) ? c[key].filter((x) => x !== id) : [...c[key], id] }))
    const valid = name.length >= 2 && cu.equipment.length > 0 && cu.muscles.length > 0 && cu.timed !== null && !already
    const missing = !name ? 'Type a name.' : already ? 'That exercise is already in the list.' : !cu.equipment.length ? 'Pick the equipment.' : !cu.muscles.length ? 'Pick a muscle group.' : cu.timed === null ? 'Choose reps or timed.' : ''
    return (
      <Modal title="Add your own exercise" subtitle="Tell AIVO what it is, so your progress counts it correctly." onClose={onClose}
        footer={(
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xs text-mute">{missing}</p>
            <div className="flex shrink-0 gap-3">
              <button type="button" onClick={() => setView(cuBack)} className={ghostBtn}>Back</button>
              <button type="button" onClick={finishCustom} disabled={!valid} className={goldBtn}>Continue</button>
            </div>
          </div>
        )}>
        <Label>Exercise name</Label>
        <input value={cu.name} onChange={(e) => setCu((c) => ({ ...c, name: e.target.value }))} maxLength={40} placeholder="e.g. Bulgarian split squat" aria-label="Exercise name" className={fieldClass} />
        {already && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/5 p-3 text-xs" role="status">
            <p className="min-w-0"><b>{already.name}</b> is already in the list.</p>
            <button type="button" onClick={() => choose(already)} className="shrink-0 font-semibold text-gold hover:underline">Use it</button>
          </div>
        )}

        <Label hint="Pick all that apply">What equipment does it use?</Label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => <Chip key={e.id} active={cu.equipment.includes(e.id)} onClick={() => toggleIn('equipment', e.id)}>{e.label}</Chip>)}
        </div>

        <Label hint="Tap the main one first">Which muscles does it work?</Label>
        <div className="flex flex-wrap gap-2">
          {MUSCLES.map((m) => (
            <Chip key={m} active={cu.muscles.includes(m)} onClick={() => toggleIn('muscles', m)}>
              {m}{cu.muscles[0] === m && <span className="ml-1 text-[10px] font-bold text-gold">main</span>}
            </Chip>
          ))}
        </div>

        <Label>How do you do it?</Label>
        <div role="radiogroup" aria-label="How do you do it" className="grid gap-2 sm:grid-cols-2">
          <Tile compact icon={Dumbbell} title="Reps" desc="Count repetitions, like squats" selected={cu.timed === false} onClick={() => setCu((c) => ({ ...c, timed: false }))} />
          <Tile compact icon={Timer} title="Timed" desc="Hold or move for a time, like a plank" selected={cu.timed === true} onClick={() => setCu((c) => ({ ...c, timed: true }))} />
        </div>

        <p className="mt-5 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-mute">
          Why we ask: equipment keeps the filters right, the muscle group shows what you trained, and reps or timed decides whether you get a rep counter or a countdown during the workout. Calories for your own exercises are estimated.
        </p>
      </Modal>
    )
  }

  /* ---------- step 2: sets, reps or time ---------- */
  const repsNumber = Number(f.reps)
  const repsIsNumber = Number.isFinite(repsNumber) && repsNumber > 0 && /^\d+$/.test(String(f.reps).trim())
  const unit = /lb/i.test(f.weight) ? 'lb' : 'kg'
  const weightNum = parseFloat(f.weight) || 0
  const summary = f.timed
    ? `${f.sets} sets of ${fmtDuration(f.seconds)}`
    : `${f.sets} sets of ${f.reps} reps${weightNum ? ` at ${weightNum} ${unit}` : ''}`

  return (
    <Modal title={isNew ? 'Set it up' : 'Edit exercise'} onClose={onClose}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-mute">{summary}</p>
          <div className="flex shrink-0 gap-3">
            <button type="button" onClick={isNew ? () => setView(f.custom && !f.customId ? 'custom' : 'pick') : onClose} disabled={saving} className={ghostBtn}>{isNew ? 'Back' : 'Cancel'}</button>
            <button type="button" onClick={submit} disabled={saving || !f.name} className={goldBtn}>{saving ? 'Saving...' : isNew ? 'Add exercise' : 'Save'}</button>
          </div>
        </div>
      )}>
      {errorBox}
      <div className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold text-black">{f.timed ? <Timer size={20} /> : <Dumbbell size={20} />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{f.name}{f.custom && <span className="ml-2 align-middle"><Badge gold>Mine</Badge></span>}</p>
          <p className="text-[11px] text-mute">{f.timed ? 'Timed exercise. You will get a countdown.' : 'Counted in reps.'}</p>
        </div>
        {f.custom
          ? <button type="button" onClick={() => openCustom('', 'details', { name: f.name, equipment: f.equipment ?? [], muscles: f.muscles?.length ? f.muscles : [f.muscle], timed: f.timed })} className="shrink-0 text-xs font-semibold text-gold hover:underline">Edit info</button>
          : <button type="button" onClick={() => setView('pick')} className="shrink-0 text-xs font-semibold text-gold hover:underline">Change</button>}
      </div>

      <Label>Sets</Label>
      <Stepper label="sets" value={f.sets} min={1} max={20} onChange={(v) => set({ sets: v })} />
      <div className="mt-3 flex flex-wrap justify-center gap-2">{SET_CHIPS.map((n) => <Chip key={n} active={f.sets === n} onClick={() => set({ sets: n })}>{n}</Chip>)}</div>

      {f.timed ? (
        <>
          <Label hint="Each set counts down">Time per set</Label>
          <Stepper label="time" value={f.seconds} min={5} max={3600} step={5} format={fmtDuration} onChange={(v) => set({ seconds: v })} />
          <div className="mt-3 flex flex-wrap justify-center gap-2">{DURATION_CHIPS.map((s) => <Chip key={s} active={f.seconds === s} onClick={() => set({ seconds: s })}>{fmtDuration(s)}</Chip>)}</div>
        </>
      ) : (
        <>
          <Label>Reps per set</Label>
          <Stepper label="reps" value={repsIsNumber ? repsNumber : 10} min={1} max={100} onChange={(v) => set({ reps: String(v) })} />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {!repsIsNumber && <Chip active onClick={() => {}}>{f.reps}</Chip>}
            {REP_CHIPS.map((n) => <Chip key={n} active={f.reps === String(n)} onClick={() => set({ reps: String(n) })}>{n}</Chip>)}
          </div>
          <Label hint="Optional">Weight</Label>
          <Stepper label="weight" value={weightNum} min={0} max={500} step={2.5} format={(v) => (v ? `${v} ${unit}` : 'None')} onChange={(v) => set({ weight: v ? `${v} ${unit}` : '' })} />
        </>
      )}

      <Label>Muscle group</Label>
      <div className="flex flex-wrap gap-2">{MUSCLES.map((m) => <Chip key={m} active={f.muscle === m} onClick={() => set({ muscle: m, ...(f.custom ? { muscles: [m, ...(f.muscles ?? []).filter((x) => x !== m)] } : {}) })} className="!min-h-[2.25rem] !px-3 !text-xs">{m}</Chip>)}</div>

      {showNote ? (
        <>
          <Label hint="Optional">Notes</Label>
          <textarea rows={3} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={200} placeholder="Form tips, tempo..." className={fieldClass} />
        </>
      ) : (
        <button type="button" onClick={() => setShowNote(true)} className="mt-5 text-xs font-semibold text-gold hover:underline">+ Add a note</button>
      )}
    </Modal>
  )
}
