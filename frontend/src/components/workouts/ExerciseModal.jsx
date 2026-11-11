import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from './Modal'
import { MUSCLES } from '../../lib/workouts'

export default function ExerciseModal({ exercise, startEditing, exerciseNames = [], exerciseCatalog = [], exerciseGoal, exerciseNamesLoading = false, exerciseNamesError = '', actionError = '', onSave, onDelete, onClose }) {
  const isNew = !exercise
  const [editing, setEditing] = useState(isNew || startEditing)
  const [f, setF] = useState({
    name: exercise?.name ?? '',
    sets: exercise?.sets ?? 3,
    reps: exercise?.reps ?? '10',
    weight: exercise?.weight ?? '',
    duration: exercise?.duration ?? '',
    muscle: exercise?.muscle ?? MUSCLES[0],
    notes: exercise?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const nameIsSuggested = exerciseNames.some((name) => name.toLowerCase() === f.name.trim().toLowerCase())
  const keepsExistingExercise = exercise?.exerciseId
    && exercise.name.toLowerCase() === f.name.trim().toLowerCase()
  const selectedCatalogExercise = exerciseCatalog.find(
    ({ name }) => name.trim().toLowerCase() === f.name.trim().toLowerCase()
  )
  const weightORduration = selectedCatalogExercise?.weightORduration
    ?? (keepsExistingExercise ? exercise?.weightORduration : null)
    ?? 'weight'
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      await onSave({
        ...exercise,
        name: f.name.trim(),
        sets: Math.min(20, Math.max(1, Number(f.sets) || 1)),
        reps: String(f.reps).trim() || '10',
        weight: weightORduration === 'weight' ? String(f.weight).trim() : '',
        duration: weightORduration === 'duration' ? String(f.duration).trim() : '',
        weightORduration,
        muscle: f.muscle,
        notes: f.notes.trim(),
      })
    } catch (error) {
      setSaveError(error.message || 'The exercise could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <Modal title="Exercise details" onClose={onClose}>
        {(actionError || saveError) && <p role="alert" className="mb-3 text-sm text-danger">{saveError || actionError}</p>}
        <p className="text-xl font-bold">{exercise.name}</p>
        <span className="mt-1 inline-block rounded-md bg-white/10 px-2 py-0.5 text-[11px]">{exercise.muscle}</span>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold text-gold">{exercise.sets}</p><p className="text-[11px] text-mute">Sets</p></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold text-gold">{exercise.reps}</p><p className="text-[11px] text-mute">Reps</p></div>
        </div>
        {(exercise.weight || exercise.duration) && (
          <p className="mt-3 text-sm text-mute">
            {exercise.duration ? `Duration: ${exercise.duration}${/\D/.test(exercise.duration) ? '' : ' sec'}` : `Weight: ${exercise.weight}`}
          </p>
        )}
        <p className="mt-4 text-sm text-ink/90">{exercise.notes || 'No notes yet. Use Edit to add form cues or tips.'}</p>
        <div className="mt-5 flex justify-between gap-3">
          <button type="button" onClick={onDelete} className="rounded-full border border-danger/50 px-5 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10">Remove</button>
          <button type="button" onClick={() => setEditing(true)} className={goldBtn}>Edit</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={isNew ? 'Add exercise' : 'Edit exercise'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
      {(actionError || saveError) && <p role="alert" className="text-sm text-danger">{saveError || actionError}</p>}
        <Field label={`Exercise name${exerciseGoal ? ` for ${exerciseGoal}` : ''}`}>
          <input autoFocus list="common-exercises" value={f.name} onChange={set('name')} maxLength={40} placeholder="e.g. Bench Press" className={fieldClass} />
          <datalist id="common-exercises">{exerciseNames.map((name) => <option key={name} value={name} />)}</datalist>
        </Field>
        {exerciseNamesLoading && <p role="status" className="text-xs text-mute">Loading exercise suggestions...</p>}
        {exerciseNamesError && <p role="alert" className="text-xs text-danger">{exerciseNamesError}</p>}
        {!exerciseNamesLoading && !exerciseNamesError && exerciseNames.length === 0 && (
          <p className="text-xs text-mute">No exercises are available in the catalog yet.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sets"><input type="number" min="1" max="20" value={f.sets} onChange={set('sets')} className={fieldClass} /></Field>
          <Field label="Reps"><input value={f.reps} onChange={set('reps')} maxLength={12} placeholder="e.g. 10" className={fieldClass} /></Field>
        </div>
        <Field label={weightORduration === 'duration' ? 'Duration (seconds)' : 'Weight'}>
          <input
            type={weightORduration === 'duration' ? 'number' : 'text'}
            min={weightORduration === 'duration' ? '1' : undefined}
            step={weightORduration === 'duration' ? '1' : undefined}
            value={weightORduration === 'duration' ? f.duration : f.weight}
            onChange={set(weightORduration)}
            placeholder={weightORduration === 'duration' ? 'e.g. 30' : 'e.g. 20 kg'}
            className={fieldClass}
          />
        </Field>
        <Field label="Muscle group">
          <select value={f.muscle} onChange={set('muscle')} className={fieldClass}>{MUSCLES.map((m) => <option key={m} className="bg-card">{m}</option>)}</select>
        </Field>
        <Field label="Notes (optional)"><textarea rows={3} value={f.notes} onChange={set('notes')} maxLength={200} placeholder="Form cues, tempo, weight..." className={fieldClass} /></Field>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={isNew ? onClose : () => setEditing(false)} disabled={saving} className={ghostBtn}>Cancel</button>
          <button type="submit" disabled={(!nameIsSuggested && !keepsExistingExercise) || (!keepsExistingExercise && (exerciseNamesLoading || Boolean(exerciseNamesError))) || saving} className={goldBtn}>{saving ? 'Saving...' : isNew ? 'Add exercise' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
