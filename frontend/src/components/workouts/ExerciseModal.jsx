import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from './Modal'
import { COMMON_EXERCISES, MUSCLES } from '../../lib/workouts'

export default function ExerciseModal({ exercise, startEditing, onSave, onDelete, onClose }) {
  const isNew = !exercise
  const [editing, setEditing] = useState(isNew || startEditing)
  const [f, setF] = useState({ name: exercise?.name ?? '', sets: exercise?.sets ?? 3, reps: exercise?.reps ?? '10', muscle: exercise?.muscle ?? MUSCLES[0], notes: exercise?.notes ?? '' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    onSave({ ...exercise, name: f.name.trim(), sets: Math.min(20, Math.max(1, Number(f.sets) || 1)), reps: String(f.reps).trim() || '10', muscle: f.muscle, notes: f.notes.trim() })
  }

  if (!editing) {
    return (
      <Modal title="Exercise details" onClose={onClose}>
        <p className="text-xl font-bold">{exercise.name}</p>
        <span className="mt-1 inline-block rounded-md bg-white/10 px-2 py-0.5 text-[11px]">{exercise.muscle}</span>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold text-gold">{exercise.sets}</p><p className="text-[11px] text-mute">Sets</p></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold text-gold">{exercise.reps}</p><p className="text-[11px] text-mute">Reps</p></div>
        </div>
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
        <Field label="Exercise name">
          <input autoFocus list="common-exercises" value={f.name} onChange={set('name')} maxLength={40} placeholder="e.g. Bench Press" className={fieldClass} />
          <datalist id="common-exercises">{COMMON_EXERCISES.map((n) => <option key={n} value={n} />)}</datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sets"><input type="number" min="1" max="20" value={f.sets} onChange={set('sets')} className={fieldClass} /></Field>
          <Field label="Reps or time"><input value={f.reps} onChange={set('reps')} maxLength={12} placeholder="10 or 45 sec" className={fieldClass} /></Field>
        </div>
        <Field label="Muscle group">
          <select value={f.muscle} onChange={set('muscle')} className={fieldClass}>{MUSCLES.map((m) => <option key={m} className="bg-card">{m}</option>)}</select>
        </Field>
        <Field label="Notes (optional)"><textarea rows={3} value={f.notes} onChange={set('notes')} maxLength={200} placeholder="Form cues, tempo, weight..." className={fieldClass} /></Field>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={isNew ? onClose : () => setEditing(false)} className={ghostBtn}>Cancel</button>
          <button type="submit" disabled={!f.name.trim()} className={goldBtn}>{isNew ? 'Add exercise' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
