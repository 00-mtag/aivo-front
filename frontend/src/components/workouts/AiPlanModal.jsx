import { useState } from 'react'
import Modal, { ghostBtn, goldBtn } from './Modal'
import { Info } from 'lucide-react'
import { Chip, EquipmentPicker, Label } from './controls'
import { DAYS, DAY_NAMES, GOALS } from '../../lib/workouts'
import { api, errorsFrom } from '../../lib/api'
import { exerciseCountForActivity, getProfile } from '../../lib/profile'

const PRESETS = [
  ['3 days', ['Mon', 'Wed', 'Fri']],
  ['4 days', ['Mon', 'Tue', 'Thu', 'Fri']],
  ['5 days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']],
  ['Every day', DAYS],
]

export default function AiPlanModal({ onGenerate, onClose }) {
  const profile = getProfile() ?? {}
  // The goal comes from the onboarding answers, so it is not asked again.
  const profileGoal = profile.goal ?? profile.fitnessGoal
  const goal = GOALS.includes(profileGoal) ? profileGoal : GOALS[1]
  const [selectedDays, setSelectedDays] = useState([])
  const [gear, setGear] = useState({ place: null, equipment: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const profileActivityLevel = profile?.activityLevel ?? profile?.activity_level ?? profile?.activity
  const exerciseCount = exerciseCountForActivity(profileActivityLevel ?? 'Sedentary')
  const activityDescription = profileActivityLevel
    ? `your ${exerciseCount.activityLevel.toLowerCase()} profile activity level`
    : 'the default Sedentary activity level'
  const ready = selectedDays.length > 0 && Boolean(gear.place) && gear.equipment.length > 0
  const sameDays = (days) => days.length === selectedDays.length && days.every((d) => selectedDays.includes(d))

  const proceed = async () => {
    if (!ready) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/ai/workout-plan', { goal, include_profile: true, schedule_days: selectedDays, equipment: gear.equipment })
      await onGenerate(data.plan, { equipment: gear.equipment, place: gear.place })
    } catch (requestError) {
      setError(requestError.response
        ? errorsFrom(requestError).form
        : requestError.message || 'The AI workout plan could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Let AI build your plan" subtitle="Tell AIVO two things. It does the rest." onClose={onClose} wide
      footer={(
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!ready && <p className="mr-auto text-xs text-mute">{selectedDays.length ? 'Pick where you train.' : 'Pick your workout days.'}</p>}
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>Cancel</button>
          <button type="button" onClick={proceed} disabled={busy || !ready} className={goldBtn}>{busy ? 'Creating plan...' : 'Create AI plan'}</button>
        </div>
      )}>
      <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 text-xs text-ink/90">
        <Info size={15} className="mt-0.5 shrink-0 text-gold" />
        <p>Made for your goal <b>{goal}</b>, from your profile.</p>
      </div>

      <Label hint="Tap a shortcut or pick days">Which days can you work out?</Label>
      <div className="mb-2 flex flex-wrap gap-2">
        {PRESETS.map(([label, days]) => <Chip key={label} active={sameDays(days)} onClick={() => { setSelectedDays(days); setError('') }} className="!min-h-[2.25rem] !px-3 !text-xs">{label}</Chip>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Workout days">
        {DAYS.map((day) => {
          const on = selectedDays.includes(day)
          return (
            <button key={day} type="button" aria-pressed={on} title={DAY_NAMES[day]}
              onClick={() => { setSelectedDays((cur) => (on ? cur.filter((d) => d !== day) : DAYS.filter((d) => d === day || cur.includes(d)))); setError('') }}
              className={`rounded-xl border py-3 text-xs font-semibold transition active:scale-95 ${on ? 'border-gold bg-gold text-black' : 'border-white/10 bg-black/20 text-mute hover:border-white/30'}`}>{day}</button>
          )
        })}
      </div>
      {selectedDays.length > 0 && (
        <p className="mt-2 text-[11px] text-mute">
          AIVO will plan {exerciseCount.min}–{exerciseCount.max} exercises per day based on {activityDescription} (about {exerciseCount.target} a day).
        </p>
      )}

      <Label hint="Only matching exercises">Where do you train?</Label>
      <EquipmentPicker place={gear.place} equipment={gear.equipment} onChange={setGear} />

      <p className="mt-5 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-mute">
        When you create this plan, AIVO shares your age (worked out from your birthday), weight, height, activity level, saved health conditions, goal, workout days and equipment with the AI service to personalize it. Your birthday itself is not shared. AI suggestions are not medical advice.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
