const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export function parseNutritionSuggestion(content) {
  if (typeof content !== 'string') return null

  const sections = {}
  let date = null
  let mealType = null
  let mealContent = false
  for (const line of content.split(/\r?\n/)) {
    const dateHeading = line.match(/^\s{0,3}(?:#{1,6}\s*)?(?:\*\*)?(\d{4}-\d{2}-\d{2})\b/)
    if (dateHeading) {
      date = dateHeading[1]
      mealType = null
      mealContent = false
      sections[date] ??= {}
      continue
    }

    const mealHeading = line.match(/^\s{0,3}(?:#{1,6}\s*)?(?:\*\*)?(Breakfast|Lunch|Dinner|Snack)\b/i)
    if (mealHeading) {
      mealType = MEAL_TYPES.find((type) => type.toLowerCase() === mealHeading[1].toLowerCase())
      mealContent = false
      if (date) sections[date][mealType] ??= false
      continue
    }

    if (line.trim() && mealType) {
      mealContent = true
      if (date) sections[date][mealType] = true
    }
  }

  const dates = Object.keys(sections).sort()
  if (dates.length && dates.every((day) => MEAL_TYPES.every((type) => sections[day][type] === true))) {
    return { type: 'week', dates }
  }

  const mealHeadings = [...content.matchAll(/^\s{0,3}(?:#{1,6}\s*)?(?:\*\*)?(Breakfast|Lunch|Dinner|Snack)\b/gim)]
    .map((match) => MEAL_TYPES.find((type) => type.toLowerCase() === match[1].toLowerCase()))
  const uniqueMealTypes = [...new Set(mealHeadings)]
  if (dates.length <= 1 && uniqueMealTypes.length === 1 && mealContent) {
    return { type: 'meal', mealType: uniqueMealTypes[0] }
  }

  return null
}
