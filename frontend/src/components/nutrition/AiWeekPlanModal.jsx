import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from '../workouts/Modal'
import { api, errorsFrom } from '../../lib/api'

const MAX_CALORIES = 5000

export default function AiWeekPlanModal({ defaultCalories, startDate, goal, gender, beforeGenerate, onSave, onClose }) {
  const minCalories = gender === 'Female' ? 1200 : 1500
  const [calories, setCalories] = useState(String(Math.min(MAX_CALORIES, Math.max(minCalories, defaultCalories))))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    const dailyCalories = Number(calories)
    if (!Number.isInteger(dailyCalories) || dailyCalories < minCalories || dailyCalories > MAX_CALORIES) {
      setError(`Enter a whole number between ${minCalories.toLocaleString()} and ${MAX_CALORIES.toLocaleString()} kcal/day.`)
      return
    }
    if (!beforeGenerate()) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/nutrition/ai-week-plan', {
        daily_calories: dailyCalories,
        start_date: startDate,
        goal,
      })
      await onSave(data)
    } catch (requestError) {
      setError(requestError.response
        ? errorsFrom(requestError).form
        : requestError.message || 'The weekly meal plan could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Let AI decide" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink/90">
          AIVO will create a full week of meals using foods in the app database and save them to your meal plan.
          Your TDEE and fitness goal are used to suggest a starting daily calorie target, which you can change.
        </p>
        <Field label="Daily calorie target (kcal)">
          <input type="number" min={minCalories} max={MAX_CALORIES} step="1" value={calories}
            onChange={(event) => { setCalories(event.target.value); setError('') }}
            className={fieldClass} />
        </Field>
        <p className="text-xs font-medium text-gold">Recommend daily kcal/day for {goal} = {calories || '—'} kcal</p>
        <p className="text-[11px] text-mute">
          Enter a whole number from {minCalories.toLocaleString()} to {MAX_CALORIES.toLocaleString()} kcal/day.
          These limits help prevent calorie targets that are too low or unusually high.
        </p>
        <p className="text-[11px] text-mute">
          When you create the plan, your saved allergies and dietary preferences will be shared with the AI along with the selected target and available food catalog.
          Food details may be incomplete, so review the plan for allergen safety. Calorie estimates are not medical advice.
        </p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>Cancel</button>
          <button type="button" onClick={generate} disabled={busy} className={goldBtn}>{busy ? 'Planning your week...' : 'Create weekly plan'}</button>
        </div>
      </div>
    </Modal>
  )
}
