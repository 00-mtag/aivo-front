import { useMemo, useState } from 'react'
import { Dumbbell, Pencil, Search, Timer } from 'lucide-react'
import Modal, { fieldClass, ghostBtn, goldBtn } from './Modal'
import { Chip, Label, Stepper } from './controls'
import {
  DURATION_CHIPS, EQUIPMENT, EQUIPMENT_IDS, MUSCLES, enrichExercise, equipmentLabel, exerciseFits, exerciseSeconds,
  exerciseTarget, fmtDuration, inferMuscle,
} from '../../lib/workouts'

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

  const catalog = useMemo(() => exerciseCatalog.map(enrichExercise), [exerciseCatalog])
  const shown = useMemo(() => catalog.filter((e) =>
    exerciseFits(e, eq)
    && (muscleF === 'All' || e.muscle === muscleF)
    && (typeF === 'all' || (typeF === 'timed') === e.timed)
    && (!q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase()))), [catalog, eq, muscleF, typeF, q])
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const toggleEq = (id) => setEq((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))

  const choose = (e) => {
    setF((s) => ({
      ...s, name: e.name, exerciseId: e.id, timed: e.timed, muscle: e.muscle,
      seconds: e.timed ? (s.timed ? s.seconds : defaultSeconds(e)) : s.seconds,
      weight: e.timed ? '' : s.weight,
    }))
    setView('details')
  }

  const submit = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await onSave({
        ...exercise,
        exerciseId: f.exerciseId ?? exercise?.exerciseId,
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
        <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{exercise.muscle}</Badge>{t.timed && <Badge gold>Timed</Badge>}</div>
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
    return (
      <Modal title="Choose an exercise" subtitle={exerciseGoal ? `Best for ${exerciseGoal}. Tap one to continue.` : 'Tap one to continue.'} onClose={onClose} wide>
        {errorBox}
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (optional)" aria-label="Search exercises" className={`${fieldClass} !pl-10`} />
        </label>

        <Label hint={eq.length === EQUIPMENT_IDS.length ? 'Everything' : `${eq.length} selected`}>Equipment you can use</Label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => <Chip key={e.id} active={eq.includes(e.id)} onClick={() => toggleEq(e.id)} className="!min-h-[2.25rem] !px-3 !text-xs">{e.label}</Chip>)}
        </div>

        <Label>Muscle group</Label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {['All', ...MUSCLES].map((m) => <Chip key={m} active={muscleF === m} onClick={() => setMuscleF(m)} className="!min-h-[2.25rem] !px-3 !text-xs">{m}</Chip>)}
        </div>

        <Label>Type</Label>
        <div className="flex gap-2">
          {[['all', 'All'], ['reps', 'Reps'], ['timed', 'Timed']].map(([id, label]) => <Chip key={id} active={typeF === id} onClick={() => setTypeF(id)} className="!min-h-[2.25rem] !px-3 !text-xs">{label}</Chip>)}
        </div>

        <div className="mb-2 mt-5 flex items-center justify-between text-xs text-mute">
          <span aria-live="polite">{loading ? 'Loading exercises...' : `${shown.length} exercise${shown.length === 1 ? '' : 's'}`}</span>
          {(eq.length < EQUIPMENT_IDS.length || muscleF !== 'All' || typeF !== 'all' || q) && (
            <button type="button" onClick={() => { setEq(EQUIPMENT_IDS); setMuscleF('All'); setTypeF('all'); setQ('') }} className="font-semibold text-gold hover:underline">Clear filters</button>
          )}
        </div>
        {exerciseNamesError && <p role="alert" className="mb-2 text-sm text-danger">{exerciseNamesError}</p>}
        {!loading && !exerciseNamesError && catalog.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-mute">No exercises are available for this goal yet.</p>}
        {!loading && catalog.length > 0 && shown.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 p-5 text-center">
            <p className="text-sm text-mute">Nothing matches. Try adding more equipment or another muscle group.</p>
            <button type="button" onClick={() => { setEq(EQUIPMENT_IDS); setMuscleF('All'); setTypeF('all'); setQ('') }} className={`${ghostBtn} mt-3 !py-2`}>Show everything</button>
          </div>
        )}
        <ul className="space-y-2">
          {shown.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => choose(e)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-left transition hover:border-gold/60 active:scale-[0.99]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-gold">{e.timed ? <Timer size={20} /> : <Dumbbell size={20} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{e.muscle}</Badge>
                    {e.equipment.map((t) => <Badge key={t}>{equipmentLabel(t)}</Badge>)}
                    {e.timed && <Badge gold>Timed</Badge>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
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
            <button type="button" onClick={isNew ? () => setView('pick') : onClose} disabled={saving} className={ghostBtn}>{isNew ? 'Back' : 'Cancel'}</button>
            <button type="button" onClick={submit} disabled={saving || !f.name} className={goldBtn}>{saving ? 'Saving...' : isNew ? 'Add exercise' : 'Save'}</button>
          </div>
        </div>
      )}>
      {errorBox}
      <div className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold text-black">{f.timed ? <Timer size={20} /> : <Dumbbell size={20} />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{f.name}</p>
          <p className="text-[11px] text-mute">{f.timed ? 'Timed exercise. You will get a countdown.' : 'Counted in reps.'}</p>
        </div>
        <button type="button" onClick={() => setView('pick')} className="shrink-0 text-xs font-semibold text-gold hover:underline">Change</button>
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
      <div className="flex flex-wrap gap-2">{MUSCLES.map((m) => <Chip key={m} active={f.muscle === m} onClick={() => set({ muscle: m })} className="!min-h-[2.25rem] !px-3 !text-xs">{m}</Chip>)}</div>

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
