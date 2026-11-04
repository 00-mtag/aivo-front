import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from '../workouts/Modal'

export default function GoalModal({ goal, onSave, onReset, onClose }) {
  const [f, setF] = useState({ daily_calories: goal.daily_calories, daily_protein: goal.daily_protein, daily_carbohydrates: goal.daily_carbohydrates, daily_fat: goal.daily_fat })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const n = (v, fallback) => Math.max(0, Math.round(Number(v) || fallback))
  const submit = (e) => {
    e.preventDefault()
    onSave({ ...goal, daily_calories: Math.max(800, n(f.daily_calories, goal.daily_calories)), daily_protein: n(f.daily_protein, goal.daily_protein), daily_carbohydrates: n(f.daily_carbohydrates, goal.daily_carbohydrates), daily_fat: n(f.daily_fat, goal.daily_fat) })
  }
  const field = (k, label) => <Field label={label}><input type="number" min="0" value={f[k]} onChange={set(k)} className={fieldClass} /></Field>
  return (
    <Modal title="Daily nutrition goals" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {field('daily_calories', 'Calories (kcal)')}{field('daily_protein', 'Protein (g)')}{field('daily_carbohydrates', 'Carbs (g)')}{field('daily_fat', 'Fat (g)')}
        </div>
        <p className="text-[11px] text-mute">Your starting targets come from your onboarding answers. They are estimates, not medical advice.</p>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button type="button" onClick={onReset} className="text-xs font-semibold text-mute transition hover:text-ink">Reset to recommended</button>
          <div className="flex gap-3"><button type="button" onClick={onClose} className={ghostBtn}>Cancel</button><button type="submit" className={goldBtn}>Save goals</button></div>
        </div>
      </form>
    </Modal>
  )
}
