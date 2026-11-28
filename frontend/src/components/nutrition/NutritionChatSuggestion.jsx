import { CalendarDays, UtensilsCrossed } from 'lucide-react'
import { parseNutritionSuggestion, parseNutritionSuggestionDetails } from '../../lib/nutritionSuggestion'

const plainReply = (content) => (
  <p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed">{content}</p>
)

const dateLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export default function NutritionChatSuggestion({ content }) {
  const suggestion = parseNutritionSuggestion(content)
  const days = parseNutritionSuggestionDetails(content)
  if (!suggestion || !days.length) return plainReply(content)

  return (
    <div className="min-w-0 space-y-3 rounded-2xl rounded-tl-sm border border-gold/20 bg-black/20 p-3 sm:p-4">
      {days.map((day, dayIndex) => (
        <section key={day.date ?? `meal-${dayIndex}`} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {day.date && (
            <h3 className="flex items-center gap-2 text-sm font-bold text-gold">
              <CalendarDays size={15} />
              {dateLabel(day.date)}
            </h3>
          )}
          {day.meals.map((meal) => (
            <div key={meal.type} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-gold">
                <UtensilsCrossed size={14} />
                {meal.type}
              </h4>
              {meal.foods.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {meal.foods.map((food, index) => (
                    <li key={`${food}-${index}`} className="flex gap-2 text-sm">
                      <span className="text-xs font-bold text-mute">{index + 1}</span>
                      <span className="text-ink">{food}</span>
                    </li>
                  ))}
                </ul>
              )}
              {meal.estimate && (
                <p className="mt-3 border-t border-white/10 pt-2 text-xs leading-relaxed text-mute">
                  {meal.estimate}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
