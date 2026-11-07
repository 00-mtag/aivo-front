import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from './Modal'
import { GOALS, LEVELS, planWeeks } from '../../lib/workouts'

export default function PlanModal({ plan, onSave, onClose }) {
  const [f, setF] = useState({
    name: plan?.name ?? '', description: plan?.description ?? '', goal: plan?.goal ?? GOALS[1],
    level: plan?.level ?? 'Beginner', minutes: plan?.minutes ?? 45, weeks: plan ? planWeeks(plan) : 4,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const clamp = (v, lo, hi, fallback) => Math.min(hi, Math.max(lo, Number(v) || fallback))
  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave({ ...f, minutes: clamp(f.minutes, 10, 180, 45), weeks: clamp(f.weeks, 1, 52, 4) })
    } catch (saveError) {
      setError(saveError.message || 'The workout could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={plan ? 'Edit plan' : 'Create new plan'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Field label="Plan name"><input autoFocus value={f.name} onChange={set('name')} maxLength={40} placeholder="e.g. Lean Bulk Plan" className={fieldClass} /></Field>
        <Field label="Description (optional)"><input value={f.description} onChange={set('description')} maxLength={90} placeholder="What is this plan for?" className={fieldClass} /></Field>
        <Field label="Goal">
          <select value={f.goal} onChange={set('goal')} className={fieldClass}>{GOALS.map((g) => <option key={g} className="bg-card">{g}</option>)}</select>
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-semibold">Level</p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button key={l} type="button" onClick={() => setF((s) => ({ ...s, level: l }))} className={`rounded-xl border py-2.5 text-xs font-semibold transition ${f.level === l ? 'border-gold bg-gold/15' : 'border-white/10 hover:border-white/30'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minutes per session"><input type="number" min="10" max="180" value={f.minutes} onChange={set('minutes')} className={fieldClass} /></Field>
          <Field label="Duration (weeks)"><input type="number" min="1" max="52" value={f.weeks} onChange={set('weeks')} className={fieldClass} /></Field>
        </div>
        <p className="text-[11px] text-mute">{plan ? '' : 'After creating the plan you can add exercises to each day of the week.'}</p>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className={ghostBtn}>Cancel</button>
          <button type="submit" disabled={!f.name.trim() || saving} className={goldBtn}>{saving ? 'Saving...' : plan ? 'Save changes' : 'Create plan'}</button>
        </div>
      </form>
    </Modal>
  )
}
