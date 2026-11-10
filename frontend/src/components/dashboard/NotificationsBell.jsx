import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, Bot, CheckCheck, Droplets, Dumbbell, Moon, TrendingUp, UtensilsCrossed, X } from 'lucide-react'

const KEY = 'aivo:notifications'   // starts with "aivo" so "Clear data on this device" also resets it
const PREFS_KEY = 'aivo:prefs'

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

/* ---------- what to show ---------- */
// Everything here comes from data the dashboard already has, so the list is always relevant to today.
function buildNotifications({ rec, focus, plans, root, onOpenMenu }) {
  const now = new Date()
  const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const prefs = readPrefs()
  const list = []

  // 1. Today's training
  const focusTitle = asText(focus)
  const isRest = !focusTitle || /rest/i.test(focusTitle)
  list.push(isRest
    ? { id: `today-${day}`, icon: Moon, title: 'Rest day today', body: asNote(focus) || 'Recover, stretch or take a light walk.', to: `${root}/workouts` }
    : { id: `today-${day}`, icon: Dumbbell, title: `Today: ${focusTitle}`, body: asNote(focus) || 'Your session is ready when you are.', to: `${root}/workouts` })

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
    list.push({ id: 'reminders-off', icon: BellRing, title: 'Turn on workout reminders', body: 'Get a nudge at your training time. You can set it in Settings.', action: onOpenMenu })
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
  const [pos, setPos] = useState({ top: 72, right: 12, width: 320, maxH: 480 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  const items = buildNotifications({ rec, focus, plans, root, onOpenMenu }).filter((n) => !state.dismissed.includes(n.id))
  const unread = items.filter((n) => !state.read.includes(n.id)).length

  const update = (fn) => setState((s) => { const next = fn(s); save(next); return next })
  const close = (returnFocus = true) => { setOpen(false); if (returnFocus) btnRef.current?.focus() }

  // Re-read storage each time the panel opens, in case settings changed in the menu
  const toggle = () => { if (!open) setState(load()); setOpen((o) => !o) }

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
