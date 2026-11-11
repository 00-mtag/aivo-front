import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from './Modal'
import { DAYS, DAY_NAMES, GOALS } from '../../lib/workouts'
import { api, errorsFrom } from '../../lib/api'
import { exerciseCountForActivity, getProfile } from '../../lib/profile'

const ACTIVITY_LEVELS = ['Sedentary', 'Lightly active', 'Moderately active', 'Very active', 'Extra active']

export default function AiPlanModal({ onGenerate, onClose }) {
  const [step, setStep] = useState('consent')
  const [includeProfile, setIncludeProfile] = useState(false)
  const [goal, setGoal] = useState(GOALS[0])
  const [selectedActivityLevel, setSelectedActivityLevel] = useState('Sedentary')
  const [selectedDays, setSelectedDays] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const profile = getProfile()
  const profileActivityLevel = includeProfile
    ? profile?.activityLevel ?? profile?.activity_level ?? profile?.activity
    : selectedActivityLevel
  const exerciseCount = exerciseCountForActivity(profileActivityLevel)
  const activityDescription = includeProfile
    ? `${exerciseCount.activityLevel} activity`
    : `${exerciseCount.activityLevel} activity selected for this plan (not saved to your profile)`

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
        include_profile: includeProfile,
        ...(!includeProfile && { activity_level: selectedActivityLevel }),
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
    <Modal title={step === 'consent' ? 'Let AI decide' : 'Set your workout goal'} onClose={onClose}>
      {step === 'consent' ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink/90">
            To personalize your plan, AIVO can share your age (calculated from your birthday), weight, height, activity level, and saved health conditions with the AI service.
            Your birthday itself will not be shared, and no other profile details will be shared.
          </p>
          <p className="text-sm text-mute">You can decline profile sharing and select an activity level just for this plan. No other profile details are shared. AI suggestions are not medical advice.</p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
            <button type="button" onClick={() => { setIncludeProfile(false); setStep('goal') }} className={ghostBtn}>Goal only</button>
            <button type="button" onClick={() => { setIncludeProfile(true); setStep('goal') }} className={goldBtn}>Share details</button>
          </div>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); proceed() }} className="space-y-4">
          <Field label="What is the goal of this plan?">
            <select value={goal} onChange={(event) => setGoal(event.target.value)} className={fieldClass}>
              {GOALS.map((item) => <option key={item} value={item} className="bg-card">{item}</option>)}
            </select>
          </Field>
          {!includeProfile && (
            <Field label="Activity level for this plan">
              <select value={selectedActivityLevel} onChange={(event) => setSelectedActivityLevel(event.target.value)} className={fieldClass}>
                {ACTIVITY_LEVELS.map((item) => <option key={item} value={item} className="bg-card">{item}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-mute">This choice is used only to set the plan’s exercise count. It won’t be saved to your profile.</p>
            </Field>
          )}
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
            {includeProfile
              ? 'Your goal and the age calculated from your birthday, weight, height, activity level, and health conditions you approved will be sent to the AI. Your birthday itself is not shared.'
              : 'Your selected goal, activity level for this plan, workout days, and the app exercise catalog will be sent. No saved profile details will be shared.'}
          </p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>Cancel</button>
            <button type="button" onClick={() => { setError(''); setStep('consent') }} disabled={busy} className={ghostBtn}>Back</button>
            <button type="submit" disabled={busy || selectedDays.length === 0} className={goldBtn}>{busy ? 'Creating plan...' : 'Create AI plan'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
