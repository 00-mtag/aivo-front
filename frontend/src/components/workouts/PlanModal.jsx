import { useState } from 'react'
import { Info } from 'lucide-react'
import Modal, { fieldClass, ghostBtn, goldBtn } from './Modal'
import { Chip, EquipmentPicker, Label } from './controls'
import { GOALS, LEVELS, placeOf, planWeeks } from '../../lib/workouts'
import { getProfile } from '../../lib/profile'

const MINUTES = [20, 30, 45, 60, 75, 90]
const WEEKS = [2, 4, 6, 8, 12]
const DEFAULTS = { minutes: 45, weeks: 4 }
// null means "None" (the user did not want to set it), so it is never added to the list.
const withCurrent = (list, v) => (v == null || list.includes(v) ? list : [...list, v].sort((a, b) => a - b))

// Goal and level come from the onboarding answers (the user's profile), so they are not asked again.
// The only required choice is where the user trains. Session length and weeks are optional (pick "None" to skip).
export default function PlanModal({ plan, equipment, place, onSave, onClose, onAiDecide }) {
  const profile = getProfile() ?? {}
  const profileGoal = profile.goal ?? profile.fitnessGoal
  const profileLevel = profile.experience ?? profile.level ?? profile.experienceLevel
  const goal = plan?.goal || (GOALS.includes(profileGoal) ? profileGoal : GOALS[1])
  const level = plan?.level || (LEVELS.includes(profileLevel) ? profileLevel : LEVELS[0])
  const startEquipment = equipment?.length ? equipment : []

  const [f, setF] = useState({
    name: plan?.name ?? `${goal} plan`,
    description: plan?.description ?? '',
    minutes: plan ? (plan.minutes ?? null) : DEFAULTS.minutes,
    weeks: plan ? (plan.weeks == null ? null : planWeeks(plan)) : DEFAULTS.weeks,
    place: place ?? (startEquipment.length ? placeOf(startEquipment) : null),
    equipment: startEquipment,
  })
  const [showDesc, setShowDesc] = useState(Boolean(plan?.description))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const ready = f.name.trim() && f.place && f.equipment.length > 0

  const submit = async () => {
    if (!ready) return
    setSaving(true)
    setError('')
    try {
      // minutes / weeks are null when the user picked "None"
      await onSave({ name: f.name.trim(), description: f.description.trim(), goal, level, minutes: f.minutes, weeks: f.weeks, place: f.place, equipment: f.equipment })
    } catch (saveError) {
      setError(saveError.message || 'The workout could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={plan ? 'Edit plan' : 'Create a plan'} subtitle={plan ? null : 'One quick question. You add the exercises next.'} onClose={onClose}
      footer={(
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!ready && !plan && <p className="mr-auto text-xs text-mute">{f.name.trim() ? 'Pick where you train.' : 'Give your plan a name.'}</p>}
          <button type="button" onClick={onClose} disabled={saving} className={ghostBtn}>Cancel</button>
          {!plan && <button type="button" onClick={onAiDecide} disabled={saving} className={ghostBtn}>Let AI decide</button>}
          <button type="button" onClick={submit} disabled={!ready || saving} className={goldBtn}>{saving ? 'Saving...' : plan ? 'Save changes' : 'Create plan'}</button>
        </div>
      )}>
      {error && <p role="alert" className="mb-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 text-xs text-ink/90">
        <Info size={15} className="mt-0.5 shrink-0 text-gold" />
        <p>Made for your goal <b>{goal}</b> at <b>{level}</b> level, from your profile.</p>
      </div>

      <Label hint="We show matching exercises">Where do you train?</Label>
      <EquipmentPicker place={f.place} equipment={f.equipment} onChange={({ place: nextPlace, equipment: nextEquipment }) => set({ place: nextPlace, equipment: nextEquipment })} />

      <Label hint="Easy to change later">Plan name</Label>
      <input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={40} aria-label="Plan name" className={fieldClass} />
      {showDesc ? (
        <input value={f.description} onChange={(e) => set({ description: e.target.value })} maxLength={90} placeholder="What is this plan for? (optional)" aria-label="Description" className={`${fieldClass} mt-2`} />
      ) : (
        <button type="button" onClick={() => setShowDesc(true)} className="mt-2 text-xs font-semibold text-gold hover:underline">+ Add a description</button>
      )}

      {/* Optional: always visible. Pick "None" to skip either one. */}
      <Label hint="Optional">Session length and weeks</Label>
      <div>
        <p className="mb-2 text-xs text-mute">How long is each session?</p>
        <div className="flex flex-wrap gap-2">
          {withCurrent(MINUTES, f.minutes).map((m) => <Chip key={m} active={f.minutes === m} onClick={() => set({ minutes: m })}>{m} min</Chip>)}
          <Chip active={f.minutes == null} onClick={() => set({ minutes: null })}>None</Chip>
        </div>
        <p className="mb-2 mt-4 text-xs text-mute">For how many weeks?</p>
        <div className="flex flex-wrap gap-2">
          {withCurrent(WEEKS, f.weeks).map((w) => <Chip key={w} active={f.weeks === w} onClick={() => set({ weeks: w })}>{w} weeks</Chip>)}
          <Chip active={f.weeks == null} onClick={() => set({ weeks: null })}>None</Chip>
        </div>
      </div>
    </Modal>
  )
}
