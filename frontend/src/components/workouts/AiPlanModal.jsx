import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from './Modal'
import { DAYS, DAY_NAMES, GOALS } from '../../lib/workouts'
import { api, errorsFrom } from '../../lib/api'
import { exerciseCountForActivity, getProfile } from '../../lib/profile'

export default function AiPlanModal({ onGenerate, onClose }) {
  const [goal, setGoal] = useState(GOALS[0])
  const [selectedDays, setSelectedDays] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const profile = getProfile()
  const profileActivityLevel = profile?.activityLevel ?? profile?.activity_level ?? profile?.activity
  const activityLevel = profileActivityLevel ?? 'Sedentary'
  const exerciseCount = exerciseCountForActivity(activityLevel)
  const activityDescription = profileActivityLevel
    ? `your ${exerciseCount.activityLevel.toLowerCase()} profile activity level`
    : 'the default Sedentary activity level'

  const proceed = async () => {
    if (selectedDays.length === 0) {
      setError('Choose at least one day you can work out.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/ai/workout-plan', {
        goal,
        include_profile: true,
        schedule_days: selectedDays,
      })
      await onGenerate(data.plan)
    } catch (requestError) {
      setError(requestError.response
        ? errorsFrom(requestError).form
        : requestError.message || 'The AI workout plan could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Set your workout goal" onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); proceed() }} className="space-y-4">
        <p className="text-sm leading-relaxed text-ink/90">
          When you create this plan, AIVO will share your age (calculated from your birthday), weight, height, activity level, and saved health conditions with the AI service to personalize it. Your birthday itself is not shared. AI suggestions are not medical advice.
        </p>
        <Field label="What is the goal of this plan?">
          <select value={goal} onChange={(event) => setGoal(event.target.value)} className={fieldClass}>
            {GOALS.map((item) => <option key={item} value={item} className="bg-card">{item}</option>)}
          </select>
        </Field>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold">Which days can you work out?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAYS.map((day) => {
              const checked = selectedDays.includes(day)
              return (
                <label key={day} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition ${
                  checked ? 'border-gold bg-gold/10 text-ink' : 'border-white/10 text-mute hover:border-white/30'
                }`}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    setSelectedDays((current) => checked
                      ? current.filter((item) => item !== day)
                      : [...current, day])
                    setError('')
                  }} className="accent-gold" />
                  {DAY_NAMES[day]}
                </label>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-mute">
            For your {goal.toLowerCase()} goal, AIVO will plan {exerciseCount.min}–{exerciseCount.max} exercises per selected day based on {activityDescription}
            (targeting {exerciseCount.target} per day).
          </p>
        </fieldset>
        <p className="text-[11px] text-mute">
          Your goal, selected workout days, exercise catalog, and the profile details above will be sent when you create the plan.
        </p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>Cancel</button>
          <button type="submit" disabled={busy || selectedDays.length === 0} className={goldBtn}>{busy ? 'Creating plan...' : 'Create AI plan'}</button>
        </div>
      </form>
    </Modal>
  )
}
