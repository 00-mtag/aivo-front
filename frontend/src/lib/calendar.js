import { DAY_NAMES } from './workouts'

const ICS_DAY = { Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA', Sun: 'SU' }
const JS_DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const p2 = (n) => String(n).padStart(2, '0')
const local = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`
const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const fold = (line) => {
  const out = []
  let l = line
  while (l.length > 74) { out.push(l.slice(0, 74)); l = ' ' + l.slice(74) }
  out.push(l)
  return out.join('\r\n')
}

// Earliest upcoming date that falls on one of the chosen weekdays at the chosen time.
function firstOccurrence(days, time) {
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  let best = null
  for (const day of days) {
    for (let add = 0; add < 8; add++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add, h, m)
      if (d.getDay() === JS_DAY[day] && d > now) { if (!best || d < best) best = d; break }
    }
  }
  return best
}

const describe = (plan, days) =>
  days.map((d) => `${DAY_NAMES[d]}: ${plan.schedule[d].map((e) => `${e.name} ${e.sets}x${e.reps}`).join(', ')}`).join('\n')

export function buildIcs(plan, { days, time, remindMin }) {
  const start = firstOccurrence(days, time)
  const end = new Date(start.getTime() + plan.minutes * 60000)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AIVO//Workouts//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${plan.id}-${Date.now()}@aivo`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${local(start)}`, `DTEND:${local(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => ICS_DAY[d]).join(',')}`,
    `SUMMARY:${esc(`Workout: ${plan.name}`)}`,
    `DESCRIPTION:${esc(describe(plan, days))}`,
    'BEGIN:VALARM', `TRIGGER:-PT${remindMin}M`, 'ACTION:DISPLAY', `DESCRIPTION:${esc(`Time for ${plan.name}`)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n')
}

export function downloadIcs(plan, opts) {
  const blob = new Blob([buildIcs(plan, opts)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workout'}.ics`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function googleUrl(plan, { days, time }) {
  const start = firstOccurrence(days, time)
  const end = new Date(start.getTime() + plan.minutes * 60000)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Workout: ${plan.name}`,
    details: describe(plan, days),
    dates: `${local(start)}/${local(end)}`,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => ICS_DAY[d]).join(',')}`,
  })
  return `https://calendar.google.com/calendar/render?${q}`
}
