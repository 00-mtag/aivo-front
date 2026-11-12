import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, Bot, CheckCheck, Droplets, Dumbbell, Moon, TrendingUp, UtensilsCrossed, X } from 'lucide-react'
import { isLoggedIn } from '../../lib/api'
import { userKey } from '../../lib/profile'

const KEY = 'aivo:notifications'   // starts with "aivo" so "Clear data on this device" also resets it
const PREFS_KEY = 'aivo:prefs'
const SENT_REMINDERS_KEY = 'aivo:sentReminders'
const MEAL_TIMES = [
  { type: 'Breakfast', hour: 8, minute: 30 },
  { type: 'Lunch', hour: 12, minute: 0 },
  { type: 'Dinner', hour: 18, minute: 0 },
]
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/* ---------- storage: which notifications were read or dismissed ---------- */
const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { read: Array.isArray(s.read) ? s.read : [], dismissed: Array.isArray(s.dismissed) ? s.dismissed : [] }
  } catch { return { read: [], dismissed: [] } }
}
const save = (s) => {
  try { localStorage.setItem(KEY, JSON.stringify({ read: s.read.slice(-80), dismissed: s.dismissed.slice(-80) })) } catch { /* storage unavailable */ }
}
const readPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } catch { return {} }
}

const asText = (v) => (typeof v === 'string' ? v : v?.title ?? v?.label ?? v?.name ?? '')
const asNote = (v) => (typeof v === 'string' ? '' : v?.note ?? v?.description ?? v?.detail ?? v?.text ?? '')
const pad = (value) => String(value).padStart(2, '0')
const localDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const displayTime = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function scheduledReminders({ now, plans, focus, prefs }) {
  const events = []
  for (const offset of [0, 1]) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const dateKey = localDateKey(date)
    const weekday = WEEKDAYS[date.getDay()]
    const workoutPlans = (plans ?? []).filter((plan) =>
      plan.active !== false && plan.schedule?.[weekday.slice(0, 3)]?.length,
    )
    let workoutTitle = workoutPlans.map((plan) => plan.name).filter(Boolean).join(' + ')
    let exerciseNames = [...new Set(workoutPlans.flatMap((plan) =>
      (plan.schedule?.[weekday.slice(0, 3)] ?? []).map((exercise) => exercise.name).filter(Boolean),
    ))]
    if (offset === 0 && !workoutTitle && asText(focus) && !/rest/i.test(asText(focus))) {
      workoutTitle = asText(focus)
      exerciseNames = []
    }

    if (workoutTitle) {
      const [hour, minute] = String(prefs.reminderTime ?? '18:00').split(':').map(Number)
      if (Number.isInteger(hour) && Number.isInteger(minute)) {
        const workoutAt = new Date(date)
        workoutAt.setHours(hour, minute, 0, 0)
        const remindAt = new Date(workoutAt.getTime() - 6 * 60 * 60 * 1000)
        const exerciseSummary = exerciseNames.length ? ` Exercises: ${exerciseNames.join(', ')}.` : ''
        events.push({
          id: `workout-${dateKey}-${pad(hour)}${pad(minute)}`,
          kind: 'workout',
          title: `Workout: ${workoutTitle}`,
          body: `${weekday} at ${displayTime(workoutAt)}.${exerciseSummary}`,
          remindAt,
          eventAt: workoutAt,
          to: '/app/workouts',
          icon: Dumbbell,
        })
      }
    }

    for (const meal of MEAL_TIMES) {
      const eventAt = new Date(date)
      eventAt.setHours(meal.hour, meal.minute, 0, 0)
      const remindAt = new Date(eventAt.getTime() - 2 * 60 * 60 * 1000)
      events.push({
        id: `${meal.type.toLowerCase()}-${dateKey}`,
        kind: 'meal',
        title: `${meal.type} reminder`,
        body: `Your ${meal.type.toLowerCase()} is at ${displayTime(eventAt)}.${plannedMealDescription(dateKey, meal.type)}`,
        remindAt,
        eventAt,
        to: '/app/nutrition',
        icon: UtensilsCrossed,
      })
    }
  }
  return events
}

function readSentReminders() {
  try {
    const value = JSON.parse(localStorage.getItem(userKey(SENT_REMINDERS_KEY)) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function plannedMealDescription(date, mealType) {
  try {
    const nutrition = JSON.parse(localStorage.getItem(userKey('aivo_nutrition')) || '{}')
    const meal = nutrition.meals?.find((item) => item.meal_date === date && item.meal_type === mealType)
    const foods = (meal?.items ?? []).map((item) => item.food_name ?? item.name).filter(Boolean)
    return foods.length ? ` Planned: ${foods.join(', ')}.` : ''
  } catch {
    return ''
  }
}

/* ---------- what to show ---------- */
// Everything here comes from data the dashboard already has, so the list is always relevant to today.
function buildNotifications({ rec, focus, plans, root, onOpenMenu, now }) {
  const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const prefs = readPrefs()
  const list = []

  // 1. Today's training
  const focusTitle = asText(focus)
  const isRest = !focusTitle || /rest/i.test(focusTitle)
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]
  const hasScheduledWorkout = (plans ?? []).some((plan) =>
    plan.active !== false && plan.schedule?.[weekday]?.length,
  )
  const hasNoWorkoutScheduled = /nothing scheduled/i.test(focusTitle)
  list.push(isRest
    ? { id: `today-${day}`, icon: Moon, title: 'Rest day today', body: asNote(focus) || focus?.sub || 'Recover, stretch or take a light walk.', to: `${root}/workouts` }
    : hasScheduledWorkout
      ? { id: `today-${day}`, icon: Dumbbell, title: `Today: ${focusTitle}`, body: asNote(focus) || focus?.sub || 'Your scheduled session is ready when you are.', to: `${root}/workouts` }
      : hasNoWorkoutScheduled
        ? { id: `today-${day}`, icon: Moon, title: 'No workout scheduled today', body: asNote(focus) || focus?.sub || 'Your saved plans have no session scheduled today.', to: `${root}/workouts` }
        : { id: `today-${day}`, icon: Dumbbell, title: `Recommended today: ${focusTitle}`, body: focus?.sub || 'This is a suggestion, not a saved workout plan. Add it to your plans to schedule a session.', to: `${root}/workouts` })

  // 2. No plans yet
  if (!plans || plans.length === 0) {
    list.push({ id: 'no-plans', icon: Dumbbell, title: 'Create your workout plan', body: 'Add a plan and it shows up on your weekly calendar.', to: `${root}/workouts` })
  }

  // 3. Daily targets
  if (rec?.calories && rec?.protein) {
    list.push({ id: `targets-${day}`, icon: UtensilsCrossed, title: 'Your targets for today',
      body: `About ${Math.round(rec.calories).toLocaleString()} kcal and ${Math.round(rec.protein)} g of protein.`, to: `${root}/nutrition` })
  }

  // 4. Water
  if (rec?.weightKg) {
    list.push({ id: `water-${day}`, icon: Droplets, title: 'Stay hydrated',
      body: `Aim for about ${(rec.weightKg * 0.035).toFixed(1)} L of water today, spread through the day.` })
  }

  // 5. Weekly check-in on the first day of the user's week
  const firstDay = prefs.weekStart === 'sun' ? 0 : 1
  if (now.getDay() === firstDay) {
    list.push({ id: `checkin-${day}`, icon: TrendingUp, title: 'New week, new check-in', body: 'Log your weight and see how far you have come.', to: `${root}/progress` })
  }

  // 6. Reminders are off
  if (!prefs.reminders) {
    list.push({ id: 'reminders-off', icon: BellRing, title: 'Turn on workout and meal reminders', body: 'Get workout reminders 6 hours ahead and meal reminders 2 hours ahead. Set your workout time in Settings.', action: onOpenMenu })
  } else {
    for (const reminder of scheduledReminders({ now, plans, focus, prefs })) {
      if (reminder.remindAt > now && reminder.eventAt.toDateString() === now.toDateString()) {
        list.push({
          id: `scheduled-${reminder.id}`,
          icon: reminder.icon,
          title: reminder.title,
          body: `${reminder.body} Reminder at ${displayTime(reminder.remindAt)}.`,
          to: reminder.to.replace('/app', root),
        })
      }
    }
  }

  // 7. Coach
  if (rec?.goal) {
    list.push({ id: `coach-${day}`, icon: Bot, title: 'Ask AIVO', body: `Get tips for your goal: ${String(rec.goal).toLowerCase()}.`, to: `${root}/ai-coach` })
  }

  return list
}

/* ---------- component ---------- */
export default function NotificationsBell({ rec, focus, plans, root = '/app', onOpenMenu }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(load)
  const [now, setNow] = useState(() => new Date())
  const [pos, setPos] = useState({ top: 72, right: 12, width: 320, maxH: 480 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  const items = buildNotifications({ rec, focus, plans, root, onOpenMenu, now }).filter((n) => !state.dismissed.includes(n.id))
  const unread = items.filter((n) => !state.read.includes(n.id)).length

  const update = (fn) => setState((s) => { const next = fn(s); save(next); return next })
  const close = (returnFocus = true) => { setOpen(false); if (returnFocus) btnRef.current?.focus() }

  // Re-read storage each time the panel opens, in case settings changed in the menu
  const toggle = () => { if (!open) setState(load()); setOpen((o) => !o) }

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    const checkReminders = () => {
      if (!isLoggedIn() || !readPrefs().reminders || !('Notification' in window) || Notification.permission !== 'granted') return

      const current = new Date()
      const sent = readSentReminders()
      const events = scheduledReminders({ now: current, plans, focus, prefs: readPrefs() })
      const due = events.filter((event) => {
        const elapsed = current.getTime() - event.remindAt.getTime()
        return elapsed >= 0 && elapsed < 30 * 60 * 1000 && !sent.includes(event.id)
      })
      if (due.length === 0) return

      const updatedSent = [...sent]
      for (const event of due) {
        try {
          const notification = new Notification(event.kind === 'workout' ? 'Workout in 6 hours' : `${event.title}: in 2 hours`, {
            body: `${event.title}. ${event.body}`,
            tag: event.id,
          })
          notification.onclick = () => {
            window.focus()
            window.location.assign(event.to)
          }
          updatedSent.push(event.id)
        } catch {
          // Permission can be revoked while the app is open.
        }
      }
      try {
        localStorage.setItem(userKey(SENT_REMINDERS_KEY), JSON.stringify(updatedSent.slice(-80)))
      } catch {
        // A storage failure can allow a duplicate reminder on a later check.
      }
    }

    checkReminders()
    const timer = setInterval(checkReminders, 20_000)
    return () => clearInterval(timer)
  }, [plans, focus])

  // The panel is placed with real pixel values measured from the bell, so it always fits the screen.
  // Phones get a full-width card with a 12px margin, larger screens a 24rem card aligned to the page edge.
  useLayoutEffect(() => {
    if (!open) return undefined
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const margin = vw < 640 ? 12 : 24
      const top = Math.round(r.bottom + 8)
      setPos({ top, right: margin, width: Math.min(384, vw - margin * 2), maxH: Math.max(220, vh - top - margin) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') close() }
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      close(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [open])

  const markRead = (id) => update((s) => (s.read.includes(id) ? s : { ...s, read: [...s.read, id] }))
  const markAllRead = () => update((s) => ({ ...s, read: [...new Set([...s.read, ...items.map((n) => n.id)])] }))
  const dismiss = (id) => update((s) => ({ ...s, dismissed: [...s.dismissed, id] }))
  const clearAll = () => update((s) => ({ ...s, dismissed: [...new Set([...s.dismissed, ...items.map((n) => n.id)])] }))

  const select = (n) => {
    markRead(n.id)
    if (n.to) { close(false); navigate(n.to) }
    else if (n.action) { close(false); n.action() }
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-haspopup="dialog" aria-expanded={open} aria-controls="notifications-panel"
        className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/5" style={{ position: 'relative' }}>
        <Bell size={26} />
        {unread > 0 && (
          <span aria-hidden="true"
            style={{ position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9999, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: '18px', textAlign: 'center', boxShadow: '0 0 0 2px #161616' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <div ref={panelRef} id="notifications-panel" role="dialog" aria-label="Notifications"
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#121212] text-white shadow-2xl"
          style={{ position: 'fixed', top: pos.top, right: pos.right, width: pos.width, maxHeight: pos.maxH, zIndex: 900, display: 'flex', flexDirection: 'column' }}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-white/10 px-4 py-3" style={{ flexShrink: 0 }}>
            <h2 className="text-sm font-bold">Notifications</h2>
            {items.length > 0 && (
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button type="button" onClick={markAllRead} disabled={unread === 0}
                  className="inline-flex items-center gap-1 whitespace-nowrap text-gold transition hover:brightness-110 disabled:cursor-default disabled:text-white/30">
                  <CheckCheck size={14} /> Mark all read
                </button>
                <button type="button" onClick={clearAll} className="whitespace-nowrap text-white/60 transition hover:text-white">Clear all</button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold">You are all caught up</p>
              <p className="mt-1 text-xs text-white/50">New updates about your plans and targets will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5 overflow-y-auto" style={{ flex: '1 1 auto', minHeight: 0 }}>
              {items.map((n) => {
                const Icon = n.icon
                const isUnread = !state.read.includes(n.id)
                const clickable = Boolean(n.to || n.action)
                return (
                  <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${isUnread ? 'bg-gold/[0.06]' : ''}`}>
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#1b1b1b] text-gold"><Icon size={18} /></span>
                    <button type="button" onClick={() => (clickable ? select(n) : markRead(n.id))}
                      className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{n.title}</span>
                        {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-white/60">{n.body}</span>
                    </button>
                    <button type="button" onClick={() => dismiss(n.id)} aria-label={`Dismiss ${n.title}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"><X size={14} /></button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
