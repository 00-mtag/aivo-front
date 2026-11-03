import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from './Modal'
import { GOALS, LEVELS } from '../../lib/workouts'

export default function PlanModal({ plan, onSave, onClose }) {
  const [f, setF] = useState({ name: plan?.name ?? '', goal: plan?.goal ?? GOALS[1], level: plan?.level ?? 'Beginner', minutes: plan?.minutes ?? 45 })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const minutes = Math.min(180, Math.max(10, Number(f.minutes) || 45))
  const submit = (e) => { e.preventDefault(); if (f.name.trim()) onSave({ ...f, minutes }) }

  return (
    <Modal title={plan ? 'Edit plan' : 'Create new plan'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Plan name"><input autoFocus value={f.name} onChange={set('name')} maxLength={40} placeholder="e.g. Push Day" className={fieldClass} /></Field>
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
        <Field label="Minutes per session (10–180)"><input type="number" min="10" max="180" value={f.minutes} onChange={set('minutes')} className={fieldClass} /></Field>
        <p className="text-[11px] text-mute">{plan ? '' : 'After creating the plan you can add exercises to each day of the week.'}</p>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button type="submit" disabled={!f.name.trim()} className={goldBtn}>{plan ? 'Save changes' : 'Create plan'}</button>
        </div>
      </form>
    </Modal>
  )
}
