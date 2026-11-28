import { useState } from 'react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from '../workouts/Modal'
import { api, errorsFrom } from '../../lib/api'
import { fromYmd, toYmd } from '../../lib/nutrition'

const MAX_CALORIES = 5000

export default function AiWeekPlanModal({ defaultCalories, macroTargets, startDate, goal, gender, beforeGenerate, onSave, onClose }) {
  const minCalories = gender === 'Female' ? 1200 : 1500
  const recommendedCalories = Math.min(MAX_CALORIES, Math.max(minCalories, defaultCalories))
  const [planStartDate, setPlanStartDate] = useState(startDate)
  const [customCalories, setCustomCalories] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  const start = planStartDate ? fromYmd(planStartDate) : null
  const planEndDate = start
    ? toYmd(new Date(start.getFullYear(), start.getMonth(), start.getDate() + ((7 - start.getDay()) % 7)))
    : ''
  const dateRange = start
    ? `${start.toLocaleDateString('en-US', dateOptions)} – ${fromYmd(planEndDate).toLocaleDateString('en-US', dateOptions)}`
    : 'select a start date'

  const generate = async () => {
    const dailyCalories = Number(customCalories ?? recommendedCalories)
    if (!planStartDate) {
      setError('Choose a start date for the meal plan.')
      return
    }
    if (!Number.isInteger(dailyCalories) || dailyCalories < minCalories || dailyCalories > MAX_CALORIES) {
      setError(`Enter a whole number between ${minCalories.toLocaleString()} and ${MAX_CALORIES.toLocaleString()} kcal/day.`)
      return
    }
    if (!beforeGenerate(planStartDate)) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/nutrition/ai-week-plan', {
        daily_calories: dailyCalories,
        daily_protein: macroTargets.daily_protein,
        daily_carbohydrates: macroTargets.daily_carbohydrates,
        daily_fat: macroTargets.daily_fat,
        start_date: planStartDate,
        goal,
      })
      await onSave(data)
    } catch (requestError) {
      setError(requestError.response
        ? errorsFrom(requestError).form
        : requestError.message || 'The meal plan could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Let AI decide" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink/90">
          AIVO will create breakfast, lunch, dinner, and snack from the selected start date through Sunday ({dateRange}), using foods in the app database.
          Your TDEE and fitness goal are used to suggest a starting daily calorie target, which you can change.
          Your daily protein, carbohydrate, and fat targets are sent to guide the plan and enforced as limits.
        </p>
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
          AI-generated meals are suggestions and may not meet your daily macro-nutrient needs. Review and adjust the plan to fit your requirements.
        </p>
        <Field label="Start date">
          <input type="date" value={planStartDate}
            onChange={(event) => { setPlanStartDate(event.target.value); setError('') }}
            className={fieldClass} />
        </Field>
        <Field label="Daily calorie target (kcal)">
          <input type="number" min={minCalories} max={MAX_CALORIES} step="1" value={customCalories ?? recommendedCalories}
            onChange={(event) => { setCustomCalories(event.target.value); setError('') }}
            className={fieldClass} />
        </Field>
        <p className="text-xs font-medium text-gold">Recommend daily kcal/day for {goal} = {recommendedCalories} kcal</p>
        <p className="text-[11px] text-mute">
          Enter a whole number from {minCalories.toLocaleString()} to {MAX_CALORIES.toLocaleString()} kcal/day.
          These limits help prevent calorie targets that are too low or unusually high.
        </p>
        <p className="text-[11px] text-mute">
          Your saved allergies and dietary preferences are checked against the food ingredients. AIVO retries once if a conflict is found; if it still cannot avoid an allergen, the plan will not be saved.
          Ingredient details can be incomplete, so review meals before eating. Calorie estimates are not medical advice.
        </p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>Cancel</button>
          <button type="button" onClick={generate} disabled={busy} className={goldBtn}>{busy ? 'Planning your meals...' : 'Create plan through Sunday'}</button>
        </div>
      </div>
    </Modal>
  )
}
