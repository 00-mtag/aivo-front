import { useState } from 'react'
import { CalendarPlus, Download, Minus, Plus } from 'lucide-react'
import Modal, { ghostBtn, goldBtn } from './Modal'
import { Chip, Label } from './controls'
import { DAYS, DAY_NAMES } from '../../lib/workouts'
import { downloadIcs, googleUrl } from '../../lib/calendar'

const TIMES = ['05:30', '06:00', '07:00', '08:00', '12:00', '17:00', '18:00', '19:00', '20:00']
const REMINDERS = [[10, '10 min before'], [30, '30 min before'], [60, '1 hour before'], [1440, '1 day before']]

const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const fromMinutes = (total) => { const t = ((total % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
const label12 = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }

// Days, time and reminder are all taps (no dropdowns, so nothing can run off the screen).
export default function CalendarModal({ plan, onClose }) {
  const trainingDays = DAYS.filter((d) => plan.schedule[d]?.length)
  const [days, setDays] = useState(trainingDays)
  const [time, setTime] = useState('07:00')
  const [remindMin, setRemindMin] = useState(30)
  const opts = { days: DAYS.filter((d) => days.includes(d)), time, remindMin }
  const ready = opts.days.length > 0 && /^\d\d:\d\d$/.test(time)
  const toggle = (d) => setDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))
  const round = 'grid h-12 w-12 place-items-center rounded-full border border-white/20 transition hover:bg-white/10 active:scale-95'

  if (trainingDays.length === 0) {
    return (
      <Modal title="Add to calendar" onClose={onClose} footer={<div className="flex justify-end"><button type="button" onClick={onClose} className={goldBtn}>Got it</button></div>}>
        <p className="text-sm text-ink/90">This plan has no exercises yet. Add exercises to at least one day, then come back to schedule it.</p>
      </Modal>
    )
  }

  return (
    <Modal title="Add to calendar" subtitle={`Repeat ${plan.name} every week with a reminder.`} onClose={onClose}
      footer={(
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={!ready} onClick={() => { downloadIcs(plan, opts); onClose() }} className={`${ghostBtn} flex items-center gap-2 disabled:opacity-40`}><Download size={15} /> Download .ics</button>
          <button type="button" disabled={!ready} onClick={() => { window.open(googleUrl(plan, opts), '_blank', 'noopener'); onClose() }} className={`${goldBtn} flex items-center gap-2`}><CalendarPlus size={15} /> Google Calendar</button>
        </div>
      )}>
      <Label hint="Tap to turn days on or off">Days</Label>
      <div className="flex flex-wrap gap-2">
        {trainingDays.map((d) => <Chip key={d} active={days.includes(d)} onClick={() => toggle(d)} className="!px-4">{d}</Chip>)}
      </div>

      <Label>Start time</Label>
      <div className="flex items-center justify-between gap-3" role="group" aria-label="Start time">
        <button type="button" aria-label="15 minutes earlier" onClick={() => setTime(fromMinutes(toMinutes(time) - 15))} className={round}><Minus size={18} /></button>
        <p className="min-w-[8rem] text-center text-3xl font-bold tabular-nums text-gold" aria-live="polite">{label12(time)}</p>
        <button type="button" aria-label="15 minutes later" onClick={() => setTime(fromMinutes(toMinutes(time) + 15))} className={round}><Plus size={18} /></button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {TIMES.map((t) => <Chip key={t} active={time === t} onClick={() => setTime(t)} className="!min-h-[2.25rem] !px-3 !text-xs">{label12(t)}</Chip>)}
      </div>

      <Label>Remind me</Label>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Reminder">
        {REMINDERS.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={remindMin === v} onClick={() => setRemindMin(v)}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-95 ${remindMin === v ? 'border-gold bg-gold/10' : 'border-white/10 bg-black/20 text-mute hover:border-white/30'}`}>{l}</button>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-mute">Each session lasts {plan.minutes} min. The downloaded file works with Google, Apple and Outlook calendars. The Google button uses your calendar's default reminder.</p>
    </Modal>
  )
}
