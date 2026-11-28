import { Dumbbell } from 'lucide-react'

const DAY_ALIASES = {
  monday: 'Monday', mon: 'Monday',
  tuesday: 'Tuesday', tue: 'Tuesday',
  wednesday: 'Wednesday', wed: 'Wednesday',
  thursday: 'Thursday', thu: 'Thursday',
  friday: 'Friday', fri: 'Friday',
  saturday: 'Saturday', sat: 'Saturday',
  sunday: 'Sunday', sun: 'Sunday',
}

export function parseWorkoutSuggestion(content) {
  if (typeof content !== 'string') return null

  const days = []
  const restDays = []
  let current = null

  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line) continue
    line = line.replace(/^\s*#{1,6}\s*/, '').trim()
    const heading = line.replace(/^\s*(?:[-*]\s*)+/, '').replace(/^\*\*(.+)\*\*$/, '$1').trim()

    const dayMatch = heading.match(/^(Monday|Mon|Tuesday|Tue|Wednesday|Wed|Thursday|Thu|Friday|Fri|Saturday|Sat|Sunday|Sun)\b\s*(?:[:\-–—]\s*)?(.*)$/i)
    if (dayMatch) {
      const day = DAY_ALIASES[dayMatch[1].toLowerCase()]
      const detail = dayMatch[2]?.trim() || ''
      if (/\brest\b/i.test(detail)) {
        restDays.push(day)
        current = null
      } else {
        current = day
        if (!days.some((item) => item.day === day)) days.push({ day, title: detail, exercises: [] })
      }
      continue
    }

    const numberedDayMatch = heading.match(/^Day\s*(\d+)\b\s*(?:[:\-–—]\s*)?(.*)$/i)
    if (numberedDayMatch) {
      const fallbackDays = ['Monday', 'Wednesday', 'Saturday', 'Tuesday', 'Thursday', 'Friday', 'Sunday']
      const day = fallbackDays[(Number(numberedDayMatch[1]) - 1) % fallbackDays.length]
      const detail = numberedDayMatch[2]?.trim() || ''
      current = /\brest\b/i.test(detail) ? null : day
      if (current && !days.some((item) => item.day === day)) days.push({ day, title: detail, exercises: [] })
      continue
    }

    const exerciseMatch = line.match(/^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/)
    if (!exerciseMatch || !current) continue

    const item = exerciseMatch[1].replace(/\s*\*\*\s*$/, '').trim()
    let name = item
    let details = ''
    const separated = item.match(/^(.+?)\s*(?:[:\-–—]|\([^)]*\))\s*(.*)$/)
    if (separated) {
      name = separated[1].trim()
      details = separated[2].trim()
    }
    if (!name || /\b(warm.?up|cool.?down|stretching)\b/i.test(name)) continue

    const purposeIndex = details.search(/\bPurpose:\s*/i)
    const purpose = purposeIndex >= 0 ? details.slice(purposeIndex).replace(/^Purpose:\s*/i, '').trim() : ''
    if (purposeIndex >= 0) details = details.slice(0, purposeIndex).replace(/[;|,\s]+$/, '').trim()

    const day = days.find((item) => item.day === current)
    if (day) day.exercises.push({ name, details, purpose })
  }

  const scheduledDays = days.filter((item) => item.exercises.length > 0)
  return scheduledDays.length ? { days: scheduledDays, restDays: [...new Set(restDays)] } : null
}

export default function WorkoutChatSuggestion({ content }) {
  const plan = parseWorkoutSuggestion(content)
  if (!plan) return <p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed">{content}</p>

  return (
    <div className="min-w-0 space-y-3 rounded-2xl rounded-tl-sm border border-gold/20 bg-black/20 p-3 sm:p-4">
      {plan.days.map((day) => (
        <section key={day.day} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gold">
            <Dumbbell size={15} />
            {day.day}{day.title ? ` - ${day.title}` : ''}
          </h3>
          <ol className="mt-2 space-y-1.5">
            {day.exercises.map((exercise, index) => (
              <li key={`${exercise.name}-${index}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2 text-sm">
                <span className="text-xs font-bold text-mute">{index + 1}</span>
                <p>
                  <span className="font-semibold text-ink">{exercise.name}</span>
                  {exercise.details && <span className="text-mute"> - {exercise.details}</span>}
                  {exercise.purpose && <span className="mt-1 block text-xs text-mute"><span className="font-semibold">Purpose:</span> {exercise.purpose}</span>}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {plan.restDays.length > 0 && <p className="text-xs text-mute">Rest: {plan.restDays.join(', ')}</p>}
    </div>
  )
}
