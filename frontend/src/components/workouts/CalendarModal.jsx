import { useState } from 'react'
import { CalendarPlus, Download } from 'lucide-react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from './Modal'
import { DAYS, DAY_NAMES } from '../../lib/workouts'
import { downloadIcs, googleUrl } from '../../lib/calendar'

export default function CalendarModal({ plan, onClose }) {
  const trainingDays = DAYS.filter((d) => plan.schedule[d]?.length)
  const [days, setDays] = useState(trainingDays)
  const [time, setTime] = useState('07:00')
  const [remindMin, setRemindMin] = useState(30)
  const opts = { days: DAYS.filter((d) => days.includes(d)), time, remindMin }
  const ready = opts.days.length > 0 && /^\d\d:\d\d$/.test(time)
  const toggle = (d) => setDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))

  return (
    <Modal title="Add to calendar" onClose={onClose}>
      {trainingDays.length === 0 ? (
        <>
          <p className="text-sm text-ink/90">This plan has no exercises yet. Add exercises to at least one day, then come back to schedule it.</p>
          <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className={goldBtn}>Got it</button></div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink/90">Repeat <b>{plan.name}</b> every week and get a reminder from your calendar app.</p>
          <div>
            <p className="mb-1.5 text-xs font-semibold">Days</p>
            <div className="flex flex-wrap gap-2">
              {trainingDays.map((d) => (
                <button key={d} type="button" onClick={() => toggle(d)} aria-pressed={days.includes(d)} title={DAY_NAMES[d]}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${days.includes(d) ? 'border-gold bg-gold/15' : 'border-white/15 text-mute'}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} /></Field>
            <Field label="Remind me">
              <select value={remindMin} onChange={(e) => setRemindMin(Number(e.target.value))} className={fieldClass}>
                {[[10, '10 min before'], [30, '30 min before'], [60, '1 hour before'], [1440, '1 day before']].map(([v, l]) => <option key={v} value={v} className="bg-card">{l}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-[11px] text-mute">Each session lasts {plan.minutes} min. The downloaded file works with Google, Apple and Outlook calendars. The Google button uses your calendar's default reminder.</p>
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <button type="button" disabled={!ready} onClick={() => { downloadIcs(plan, opts); onClose() }} className={`${ghostBtn} flex items-center gap-2 disabled:opacity-40`}><Download size={15} /> Download .ics</button>
            <button type="button" disabled={!ready} onClick={() => { window.open(googleUrl(plan, opts), '_blank', 'noopener'); onClose() }} className={`${goldBtn} flex items-center gap-2`}><CalendarPlus size={15} /> Google Calendar</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
