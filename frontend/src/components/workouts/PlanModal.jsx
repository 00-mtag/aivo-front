import { useState } from 'react'
import Modal, { fieldClass, ghostBtn, goldBtn } from './Modal'
import { Chip, EquipmentPicker, GOAL_META, Label, Tile } from './controls'
import { GOALS, LEVELS, planWeeks } from '../../lib/workouts'
import { getProfile } from '../../lib/profile'

const MINUTES = [20, 30, 45, 60, 75, 90]
const WEEKS = [2, 4, 6, 8, 12]
const LEVEL_DESC = { Beginner: 'New or getting back into it', Intermediate: 'You train regularly', Advanced: 'Years of consistent training' }
const defaultName = (goal) => `${goal} plan`
const withCurrent = (list, v) => (list.includes(v) ? list : [...list, v].sort((a, b) => a - b))

// Everything is a tap. Name, goal, level, time and equipment all have sensible choices.
export default function PlanModal({ plan, equipment, onSave, onClose, onAiDecide }) {
  const profile = getProfile() ?? {}
  const startGoal = plan?.goal || (GOALS.includes(profile.goal) ? profile.goal : GOALS[1])
  const startLevel = plan?.level || (LEVELS.includes(profile.experience) ? profile.experience : LEVELS[0])
  const [f, setF] = useState({
    name: plan?.name ?? defaultName(startGoal),
    description: plan?.description ?? '',
    goal: startGoal,
    level: startLevel,
    minutes: plan?.minutes ?? 45,
    weeks: plan ? planWeeks(plan) : 4,
    equipment: equipment ?? [],
  })
  const [nameTouched, setNameTouched] = useState(Boolean(plan))
  const [showDesc, setShowDesc] = useState(Boolean(plan?.description))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const pickGoal = (goal) => set({ goal, ...(nameTouched ? {} : { name: defaultName(goal) }) })
  const ready = f.name.trim() && f.equipment.length > 0

  const submit = async () => {
    if (!ready) return
    setSaving(true)
    setError('')
    try {
      await onSave({ ...f, name: f.name.trim(), description: f.description.trim() })
    } catch (saveError) {
      setError(saveError.message || 'The workout could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={plan ? 'Edit plan' : 'Create a plan'} subtitle={plan ? null : 'Four quick choices. You add the exercises next.'} onClose={onClose}
      footer={(
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!ready && !plan && <p className="mr-auto text-xs text-mute">{f.equipment.length ? 'Give your plan a name.' : 'Pick where you train.'}</p>}
          <button type="button" onClick={onClose} disabled={saving} className={ghostBtn}>Cancel</button>
          {!plan && <button type="button" onClick={onAiDecide} disabled={saving} className={ghostBtn}>Let AI decide</button>}
          <button type="button" onClick={submit} disabled={!ready || saving} className={goldBtn}>{saving ? 'Saving...' : plan ? 'Save changes' : 'Create plan'}</button>
        </div>
      )}>
      {error && <p role="alert" className="mb-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <Label>1. What is your goal?</Label>
      <div role="radiogroup" aria-label="Goal" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {GOALS.map((g) => <Tile key={g} compact icon={GOAL_META[g]?.icon} title={g} desc={GOAL_META[g]?.desc} selected={f.goal === g} onClick={() => pickGoal(g)} />)}
      </div>

      <Label>2. Your level</Label>
      <div role="radiogroup" aria-label="Level" className="grid grid-cols-3 gap-2">
        {LEVELS.map((l) => (
          <button key={l} type="button" role="radio" aria-checked={f.level === l} onClick={() => set({ level: l })}
            className={`rounded-2xl border px-2 py-3 text-center transition active:scale-95 ${f.level === l ? 'border-gold bg-gold/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>
            <span className="block text-sm font-semibold">{l}</span>
            <span className="mt-0.5 block text-[10px] leading-tight text-mute">{LEVEL_DESC[l]}</span>
          </button>
        ))}
      </div>

      <Label hint="We show matching exercises">3. Where do you train?</Label>
      <EquipmentPicker value={f.equipment} onChange={(equipment) => set({ equipment })} />

      <Label>4. How long each session?</Label>
      <div className="flex flex-wrap gap-2">{withCurrent(MINUTES, f.minutes).map((m) => <Chip key={m} active={f.minutes === m} onClick={() => set({ minutes: m })}>{m} min</Chip>)}</div>

      <Label>For how many weeks?</Label>
      <div className="flex flex-wrap gap-2">{withCurrent(WEEKS, f.weeks).map((w) => <Chip key={w} active={f.weeks === w} onClick={() => set({ weeks: w })}>{w} weeks</Chip>)}</div>

      <Label hint="Easy to change later">Plan name</Label>
      <input value={f.name} onChange={(e) => { setNameTouched(true); set({ name: e.target.value }) }} maxLength={40} aria-label="Plan name" className={fieldClass} />
      {showDesc ? (
        <input value={f.description} onChange={(e) => set({ description: e.target.value })} maxLength={90} placeholder="What is this plan for? (optional)" aria-label="Description" className={`${fieldClass} mt-2`} />
      ) : (
        <button type="button" onClick={() => setShowDesc(true)} className="mt-2 text-xs font-semibold text-gold hover:underline">+ Add a description</button>
      )}
    </Modal>
  )
}
