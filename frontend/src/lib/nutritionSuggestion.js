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

    const mealHeading = line
      .replace(/\*\*/g, '')
      .match(/^\s{0,3}(?:#{1,6}\s*)?(Breakfast|Lunch|Dinner|Snack)\b\s*:?\s*(.*)$/i)
    if (mealHeading) {
      mealType = MEAL_TYPES.find((type) => type.toLowerCase() === mealHeading[1].toLowerCase())
      mealContent = Boolean(mealHeading[2].trim())
      if (date) sections[date][mealType] = mealContent
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

export function parseNutritionSuggestionDetails(content) {
  if (typeof content !== 'string') return []

  const days = []
  let currentDay = null
  let currentMeal = null

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine
      .trim()
      .replace(/^#{1,6}\s*/, '')
      .replace(/\*\*/g, '')
      .trim()
    if (!line) continue

    const dateHeading = line.match(/^(\d{4}-\d{2}-\d{2})\b/)
    if (dateHeading) {
      currentDay = { date: dateHeading[1], meals: [] }
      days.push(currentDay)
      currentMeal = null
      continue
    }

    const mealHeading = line.match(/^(Breakfast|Lunch|Dinner|Snack)\b\s*:?\s*(.*)$/i)
    if (mealHeading) {
      currentDay ??= { date: null, meals: [] }
      if (!days.includes(currentDay)) days.push(currentDay)
      const type = MEAL_TYPES.find((mealType) => mealType.toLowerCase() === mealHeading[1].toLowerCase())
      currentMeal = { type, foods: [], estimate: '' }
      currentDay.meals.push(currentMeal)
      if (mealHeading[2].trim()) currentMeal.foods.push(mealHeading[2].trim())
      continue
    }

    if (!currentMeal) continue
    if (/^Estimated nutrition\b/i.test(line)) {
      currentMeal.estimate = line
      continue
    }

    const foodLine = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/)
    if (foodLine) currentMeal.foods.push(foodLine[1].trim())
  }

  return days.filter((day) => day.meals.length > 0)
}
