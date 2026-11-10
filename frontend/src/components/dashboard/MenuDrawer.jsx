import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell, ChevronLeft, ChevronRight, CircleHelp, Download, FileText, Info, LifeBuoy, LogOut,
  Ruler, ShieldCheck, SlidersHorizontal, Trash2, UserCog, X,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const APP_VERSION = '1.0.0'
const STORE = 'aivo'                       // every localStorage key that starts with this belongs to the app
const PREFS_KEY = `${STORE}:prefs`
const LAST_REMINDER_KEY = `${STORE}:lastReminder`
const DEFAULT_PREFS = { reminders: false, reminderTime: '18:00', units: 'metric', weekStart: 'mon', aiPersonalize: true, analytics: true }

const TITLES = {
  main: 'Menu', settings: 'Settings', privacy: 'Privacy and data', help: 'Help center',
  contact: 'Contact support', terms: 'Terms and privacy policy', about: 'About AIVO',
}

const FAQ = [
  { q: 'How are my daily calories worked out?', a: 'AIVO estimates your daily energy needs from your age, height, weight, activity level and goal, then adjusts for losing, maintaining or gaining weight. It is an estimate, so use it as a starting point and adjust as you see results.' },
  { q: 'How much protein do I need?', a: 'Your protein target is based on your body weight and goal. Spread it across your meals for the best results. You can see the number on your profile card at the top of this menu.' },
  { q: 'What does my BMI tell me?', a: 'BMI compares your weight with your height. It is a quick screening number, not a diagnosis, and it does not account for muscle mass. Treat it as one signal alongside your progress.' },
  { q: 'How do I change my goal or weight?', a: 'Tap Edit on your profile card, or Update my profile under Account. Your calories, protein and recommended plans refresh after you save.' },
  { q: 'How do I add a workout to my plan?', a: 'Open Workouts, pick a plan, and choose Add to my plans. It then shows up on your weekly fitness calendar.' },
  { q: 'What can the AI Coach help with?', a: 'Ask it about exercises, form, meals, and how to stay on track. It gives general fitness guidance and does not replace a doctor or a registered dietitian.' },
  { q: 'Are my plans and progress saved when I log out?', a: 'Yes. Logging out only ends this session. Sign in again and your plans and progress are still there.' },
  { q: 'I did not get a workout reminder.', a: 'Reminders need browser notifications to be allowed, and AIVO has to be open in a tab at the reminder time. Check Settings, allow notifications, then use Send a test notification.' },
]

const TERMS = {
  terms: [
    ['Using AIVO', 'AIVO provides fitness and nutrition guidance, including workout plans, meal plans and an AI coach. You agree to use it lawfully and to give accurate information about yourself.'],
    ['Not medical advice', 'Everything in AIVO is general information. It is not medical advice. Talk to a doctor before starting a new exercise or diet programme, especially if you have a health condition.'],
    ['Your account', 'You are responsible for keeping your login details safe and for activity under your account. You can delete your account at any time from Privacy and data.'],
    ['Changes', 'We may update these terms as AIVO changes. If the changes are significant we will tell you in the app.'],
  ],
  privacy: [
    ['What we collect', 'The details you enter (such as age, height, weight, goal and activity level), your plans and progress, and the messages you send to the AI Coach.'],
    ['How we use it', 'To calculate your targets, build your plans, show your progress and personalise coaching. You can turn off personalisation in Privacy and data.'],
    ['Your control', 'You can export a copy of your data, clear the data stored on this device, or delete your account from Privacy and data.'],
    ['Contact', 'Questions about your data? Use Contact support in the menu.'],
  ],
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const NO_BORDER = { borderColor: 'transparent' }   // plain CSS so rows never show an outline
const pad = (n) => String(n).padStart(2, '0')
const field = 'w-full rounded-xl border border-white/10 bg-[#1b1b1b] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold/60 focus:outline-none'
const rowClass = 'flex w-full items-center gap-3 px-3 py-3 text-left text-white transition hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none'
const primaryBtn = 'rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40'
const ghostBtn = 'rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40'

const readPrefs = () => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } } catch { return DEFAULT_PREFS }
}

const storedKeys = () => {
  try { return Object.keys(localStorage).filter((k) => k.startsWith(STORE)) } catch { return [] }
}

const downloadJson = (filename, data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const diagnostics = () => [
  `AIVO ${APP_VERSION}`,
  `Browser: ${navigator.userAgent}`,
  `Screen: ${window.innerWidth}x${window.innerHeight}`,
  `Language: ${navigator.language}`,
  `Time: ${new Date().toISOString()}`,
].join('\n')

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */
const Chip = ({ children }) => <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">{children}</span>

const Section = ({ title, children }) => (
  <section>
    {title && <p className="mb-2 px-1 text-xs font-semibold text-white/50">{title}</p>}
    <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">{children}</div>
  </section>
)

const RowIcon = ({ icon: Icon }) => <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#1b1b1b] text-gold"><Icon size={18} /></span>

const RowText = ({ label, note }) => (
  <span className="min-w-0 flex-1">
    <span className="block text-sm font-semibold">{label}</span>
    {note && <span className="block truncate text-xs text-white/50">{note}</span>}
  </span>
)

const Chevron = () => <ChevronRight size={16} className="shrink-0 text-white/30" />

const LinkRow = ({ to, icon, label, note, onClick }) => (
  <Link to={to} onClick={onClick} style={NO_BORDER} className={rowClass}>
    <RowIcon icon={icon} /><RowText label={label} note={note} /><Chevron />
  </Link>
)

const ButtonRow = ({ icon, label, note, onClick }) => (
  <button type="button" onClick={onClick} className={rowClass}>
    <RowIcon icon={icon} /><RowText label={label} note={note} /><Chevron />
  </button>
)

const ToggleRow = ({ icon, label, note, checked, onChange }) => (
  <div className="flex items-center gap-3 px-3 py-3">
    {icon && <RowIcon icon={icon} />}
    <RowText label={label} note={note} />
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-gold' : 'bg-white/15'}`}>
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  </div>
)

const SegmentRow = ({ icon, label, note, value, options, onChange }) => (
  <div className="flex items-center gap-3 px-3 py-3">
    {icon && <RowIcon icon={icon} />}
    <RowText label={label} note={note} />
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-full bg-white/10 p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${value === o.value ? 'bg-gold text-black' : 'text-white/70 hover:text-white'}`}>{o.label}</button>
      ))}
    </div>
  </div>
)

const Note = ({ tone = 'info', children }) => (
  <p role="status" className={`rounded-xl px-3 py-2 text-xs ${tone === 'error' ? 'bg-red-500/10 text-red-300' : tone === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-white/60'}`}>{children}</p>
)

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */
function SettingsView({ prefs, setPref, perm, setReminders, onChangePassword, toast }) {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const submitPw = async (e) => {
    e.preventDefault()
    if (pw.next.length < 8) return setPwMsg({ tone: 'error', text: 'Use at least 8 characters for your new password.' })
    if (pw.next !== pw.confirm) return setPwMsg({ tone: 'error', text: 'The new passwords do not match.' })
    if (pw.next === pw.current) return setPwMsg({ tone: 'error', text: 'Choose a password you have not used here.' })
    setBusy(true); setPwMsg(null)
    try {
      await onChangePassword({ currentPassword: pw.current, newPassword: pw.next })
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ tone: 'ok', text: 'Password updated.' })
    } catch (err) {
      setPwMsg({ tone: 'error', text: err?.message || 'Could not update your password. Check your current password and try again.' })
    } finally { setBusy(false) }
  }

  const testNotification = () => {
    try { new Notification('AIVO', { body: 'Notifications are working. See you at your next session.' }); toast('Test notification sent') }
    catch { toast('Could not send a notification') }
  }

  return (
    <div className="space-y-6">
      <Section title="Reminders">
        <ToggleRow icon={Bell} label="Workout reminders" note="A notification at your chosen time" checked={prefs.reminders} onChange={setReminders} />
        {prefs.reminders && (
          <div className="flex items-center gap-3 px-3 py-3">
            <RowText label="Remind me at" note="Sent daily while AIVO is open" />
            <input type="time" value={prefs.reminderTime} onChange={(e) => e.target.value && setPref('reminderTime', e.target.value)}
              aria-label="Reminder time" className="rounded-lg border border-white/10 bg-[#1b1b1b] px-2 py-1.5 text-sm text-white focus:border-gold/60 focus:outline-none" style={{ colorScheme: 'dark' }} />
          </div>
        )}
      </Section>
      {perm === 'unsupported' && <Note>This browser does not support notifications.</Note>}
      {perm === 'denied' && <Note tone="error">Notifications are blocked for this site. Allow them in your browser's site settings, then turn reminders on again.</Note>}
      {perm === 'granted' && prefs.reminders && (
        <button type="button" onClick={testNotification} className={`${ghostBtn} w-full`}>Send a test notification</button>
      )}

      <Section title="Display">
        <SegmentRow icon={Ruler} label="Units" note="Weight and height" value={prefs.units} onChange={(v) => setPref('units', v)}
          options={[{ value: 'metric', label: 'kg' }, { value: 'imperial', label: 'lb' }]} />
        <SegmentRow label="Week starts on" value={prefs.weekStart} onChange={(v) => setPref('weekStart', v)}
          options={[{ value: 'mon', label: 'Mon' }, { value: 'sun', label: 'Sun' }]} />
      </Section>

      {onChangePassword && (
        <form onSubmit={submitPw} className="space-y-2.5">
          <p className="px-1 text-xs font-semibold text-white/50">Change password</p>
          <input type="password" autoComplete="current-password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={field} required />
          <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={field} required />
          <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={field} required />
          {pwMsg && <Note tone={pwMsg.tone}>{pwMsg.text}</Note>}
          <button type="submit" disabled={busy || !pw.current || !pw.next || !pw.confirm} className={`${primaryBtn} w-full`}>{busy ? 'Saving' : 'Update password'}</button>
        </form>
      )}
    </div>
  )
}

function PrivacyView({ prefs, setPref, name, rec, exportExtra, onDeleteAccount, onAfterClear, onClose, toast }) {
  const [clearing, setClearing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const exportData = async () => {
    try {
      const local = {}
      storedKeys().forEach((k) => { try { local[k] = JSON.parse(localStorage.getItem(k)) } catch { local[k] = localStorage.getItem(k) } })
      const extra = exportExtra ? await exportExtra() : {}
      downloadJson(`aivo-data-${new Date().toISOString().slice(0, 10)}.json`, { exportedAt: new Date().toISOString(), profile: { name, ...(rec || {}) }, preferences: prefs, storedOnThisDevice: local, ...extra })
      toast('Your data was downloaded')
    } catch { toast('Could not export your data') }
  }

  const clearLocal = () => {
    storedKeys().forEach((k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } })
    setClearing(false)
    onAfterClear()
    toast('Data on this device cleared')
  }

  const deleteAccount = async () => {
    setBusy(true); setErr('')
    try { await onDeleteAccount(); storedKeys().forEach((k) => localStorage.removeItem(k)); onClose() }
    catch (e) { setErr(e?.message || 'Could not delete your account. Try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <Section title="Personalisation">
        <ToggleRow label="Use my data to personalise coaching" note="Lets the AI Coach use your goal, level and progress" checked={prefs.aiPersonalize} onChange={(v) => setPref('aiPersonalize', v)} />
        <ToggleRow label="Share anonymous usage data" note="Helps us find bugs and improve AIVO" checked={prefs.analytics} onChange={(v) => setPref('analytics', v)} />
      </Section>

      <Section title="Your data">
        <ButtonRow icon={Download} label="Download my data" note="A JSON copy of your profile and settings" onClick={exportData} />
        <ButtonRow icon={Trash2} label="Clear data on this device" note="Removes saved settings and cached plans here" onClick={() => setClearing(true)} />
      </Section>

      {clearing && (
        <div role="alertdialog" aria-label="Confirm clear data" className="space-y-3 rounded-2xl border border-white/10 bg-black p-4">
          <p className="text-sm font-semibold">Clear data on this device?</p>
          <p className="text-xs text-white/50">This removes AIVO data saved in this browser. Anything stored in your account is not affected.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setClearing(false)} className={`${ghostBtn} flex-1`}>Cancel</button>
            <button type="button" onClick={clearLocal} className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition hover:brightness-110">Clear</button>
          </div>
        </div>
      )}

      {onDeleteAccount && (
        <section className="space-y-3 rounded-2xl border border-red-500/30 p-4">
          <p className="text-sm font-semibold text-red-300">Delete account</p>
          <p className="text-xs text-white/50">This permanently removes your account, plans and progress. It cannot be undone.</p>
          {!deleting ? (
            <button type="button" onClick={() => setDeleting(true)} className="w-full rounded-full border border-red-500/40 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10">Delete my account</button>
          ) : (
            <>
              <label className="block text-xs text-white/60">Type <span className="font-bold text-white">DELETE</span> to confirm
                <input value={typed} onChange={(e) => setTyped(e.target.value)} className={`${field} mt-1.5`} autoComplete="off" />
              </label>
              {err && <Note tone="error">{err}</Note>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setDeleting(false); setTyped(''); setErr('') }} className={`${ghostBtn} flex-1`}>Cancel</button>
                <button type="button" disabled={typed !== 'DELETE' || busy} onClick={deleteAccount}
                  className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Deleting' : 'Delete forever'}</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

function HelpView({ goContact }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = q ? FAQ.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q)) : FAQ
  return (
    <div className="space-y-4">
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" aria-label="Search help" className={field} />
      {list.length ? (
        <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {list.map((f) => (
            <details key={f.q} className="group px-3 py-3" open={!!q && list.length === 1}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}<ChevronRight size={16} className="shrink-0 text-white/30 transition group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-white/60">{f.a}</p>
            </details>
          ))}
        </div>
      ) : <Note>No answers match "{query}".</Note>}
      <div className="rounded-2xl border border-white/10 p-4 text-center">
        <p className="text-sm font-semibold">Still stuck?</p>
        <p className="mt-0.5 text-xs text-white/50">Tell us what happened and we will help.</p>
        <button type="button" onClick={goContact} className={`${primaryBtn} mt-3`}>Contact support</button>
      </div>
    </div>
  )
}

function ContactView({ name, supportEmail, onSendFeedback, toast, back }) {
  const [category, setCategory] = useState('Problem')
  const [message, setMessage] = useState('')
  const [withInfo, setWithInfo] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ready = message.trim().length >= 10

  const send = async (e) => {
    e.preventDefault()
    if (!ready) return
    const body = `${message.trim()}\n\n${withInfo ? `---\nFrom: ${name}\n${diagnostics()}` : ''}`
    const subject = `AIVO ${category.toLowerCase()}`
    setBusy(true); setErr('')
    try {
      if (onSendFeedback) { await onSendFeedback({ category, message: message.trim(), diagnostics: withInfo ? diagnostics() : null }); toast('Message sent. Thank you!'); back() }
      else { window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; toast('Opening your email app') }
    } catch (e2) { setErr(e2?.message || 'Could not send your message. Try again.') }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <div role="radiogroup" aria-label="Topic" className="flex flex-wrap gap-2">
        {['Problem', 'Idea', 'Account', 'Other'].map((c) => (
          <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${category === c ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/70 hover:bg-white/5'}`}>{c}</button>
        ))}
      </div>
      <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, or what would you like to see?" aria-label="Message" className={`${field} resize-none`} />
      <label className="flex items-start gap-2.5 text-xs text-white/60">
        <input type="checkbox" checked={withInfo} onChange={(e) => setWithInfo(e.target.checked)} className="mt-0.5 accent-[#d4af37]" />
        Include app version and browser details to help us fix things faster
      </label>
      {err && <Note tone="error">{err}</Note>}
      <button type="submit" disabled={!ready || busy} className={`${primaryBtn} w-full`}>{busy ? 'Sending' : onSendFeedback ? 'Send message' : 'Open email to send'}</button>
      {!ready && message.length > 0 && <p className="text-center text-[11px] text-white/40">Add a little more detail (10+ characters).</p>}
    </form>
  )
}

function TermsView() {
  const [tab, setTab] = useState('terms')
  return (
    <div className="space-y-4">
      <div role="tablist" className="grid grid-cols-2 rounded-full bg-white/10 p-0.5">
        {[['terms', 'Terms of use'], ['privacy', 'Privacy policy']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full py-2 text-xs font-semibold transition ${tab === k ? 'bg-gold text-black' : 'text-white/70 hover:text-white'}`}>{l}</button>
        ))}
      </div>
      <div className="space-y-4">
        {TERMS[tab].map(([h, p]) => (
          <article key={h}>
            <h3 className="text-sm font-bold">{h}</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{p}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function AboutView({ toast }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(diagnostics()); toast('Details copied') } catch { toast('Could not copy') }
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black p-5 text-center">
        <p className="text-2xl font-extrabold text-gold">AIVO</p>
        <p className="mt-1 text-xs text-white/50">Your AI fitness and nutrition coach</p>
        <p className="mt-3 text-sm font-semibold">Version {APP_VERSION}</p>
      </div>
      <Section>
        <ButtonRow icon={Info} label="Copy app details" note="Version and browser info for support" onClick={copy} />
        <ButtonRow icon={SlidersHorizontal} label="Reload app" note="Fetch the latest version" onClick={() => window.location.reload()} />
      </Section>
      <p className="px-1 text-center text-[11px] text-white/40">AIVO gives general fitness information. It is not medical advice.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */
/**
 * Optional props that connect the menu to your backend (each hides or falls back safely if omitted):
 *  onChangePassword({ currentPassword, newPassword })  -> Promise, throw an Error to show a message
 *  onDeleteAccount()                                   -> Promise, throw an Error to show a message
 *  onSendFeedback({ category, message, diagnostics })  -> Promise, falls back to an email draft
 *  exportExtra()                                       -> Promise<object> merged into the data download
 *  onPrefsChange(prefs)                                -> called whenever a preference changes
 */
export default function MenuDrawer({
  open, onClose, name = 'there', rec, onLogout,
  onChangePassword, onDeleteAccount, onSendFeedback, exportExtra, onPrefsChange,
  supportEmail = 'support@aivo.app',
}) {
  const root = useLocation().pathname.startsWith('/preview') ? '/preview' : '/app'   // kept for any future in-app links
  void root
  const closeRef = useRef(null)
  const bodyRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [confirming, setConfirming] = useState(false)
  const [shown, setShown] = useState(false)
  const [view, setView] = useState('main')
  const viewRef = useRef('main')
  viewRef.current = view
  const [prefs, setPrefs] = useState(readPrefs)
  const [perm, setPerm] = useState(() => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'))
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef(null)

  const toast = (msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const setPref = (key, value) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value }
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      onPrefsChange?.(next)
      return next
    })
  }

  const setReminders = async (on) => {
    if (!on) return setPref('reminders', false)
    if (perm === 'unsupported') return toast('This browser does not support notifications')
    let p = perm
    if (p === 'default') { try { p = await Notification.requestPermission() } catch { p = 'denied' } setPerm(p) }
    if (p === 'granted') { setPref('reminders', true); toast('Reminders on') }
    else toast('Allow notifications to get reminders')
  }

  // Fires the reminder while the app is open in a tab. Runs even when the drawer is closed.
  useEffect(() => {
    if (!prefs.reminders || perm !== 'granted') return undefined
    const tick = () => {
      const d = new Date()
      const now = `${pad(d.getHours())}:${pad(d.getMinutes())}`
      let last = null
      try { last = localStorage.getItem(LAST_REMINDER_KEY) } catch { /* ignore */ }
      if (now === prefs.reminderTime && last !== d.toDateString()) {
        try { localStorage.setItem(LAST_REMINDER_KEY, d.toDateString()) } catch { /* ignore */ }
        try { new Notification('Time to train', { body: 'Your AIVO session is waiting.' }) } catch { /* ignore */ }
      }
    }
    tick()
    const id = setInterval(tick, 20000)
    return () => clearInterval(id)
  }, [prefs.reminders, prefs.reminderTime, perm])

  useEffect(() => {
    if (!open) { setConfirming(false); setShown(false); setView('main'); return undefined }
    const raf = requestAnimationFrame(() => setShown(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Escape goes back one level first, then closes
    const onKey = (e) => { if (e.key === 'Escape') { if (viewRef.current !== 'main') setView('main'); else onCloseRef.current() } }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  useEffect(() => { bodyRef.current?.scrollTo?.({ top: 0 }); setConfirming(false) }, [view])

  if (!open) return null

  const back = () => setView('main')
  const imperial = prefs.units === 'imperial'

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 1000 }}>
      <button type="button" tabIndex={-1} aria-label="Close menu" onClick={onClose}
        className="absolute inset-0 bg-black/70" style={{ opacity: shown ? 1 : 0, transition: 'opacity 300ms ease' }} />

      <aside id="app-menu" role="dialog" aria-modal="true" aria-label={TITLES[view]}
        style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 300ms ease' }}
        className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-l border-white/10 bg-[#121212] shadow-2xl">
        <header className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          {view !== 'main' && (
            <button type="button" onClick={back} aria-label="Back to menu"
              className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"><ChevronLeft size={20} /></button>
          )}
          <h2 className="flex-1 text-lg font-bold">{TITLES[view]}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </header>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-5">
          {view === 'main' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gold/40 bg-black p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-lg font-extrabold text-black" aria-hidden="true">
                    {String(name).trim().charAt(0).toUpperCase() || 'A'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{name}</p>
                    <p className="text-xs text-white/50">Signed in</p>
                  </div>
                  <Link to="/onboarding" onClick={onClose} style={NO_BORDER}
                    className="shrink-0 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10">Edit</Link>
                </div>
                {rec && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {rec.goal && <Chip>{rec.goal}</Chip>}
                      {rec.level && <Chip>{rec.level}</Chip>}
                      {rec.weightKg && <Chip>{imperial ? `${Math.round(rec.weightKg * 2.20462)} lb` : `${Math.round(rec.weightKg)} kg`}</Chip>}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-white/5 py-2.5">
                        <p className="text-base font-bold text-gold">{Math.round(rec.calories).toLocaleString()}</p>
                        <p className="text-[11px] text-white/50">kcal a day</p>
                      </div>
                      <div className="rounded-xl bg-white/5 py-2.5">
                        <p className="text-base font-bold text-gold">{Math.round(rec.protein)} g</p>
                        <p className="text-[11px] text-white/50">protein a day</p>
                      </div>
                    </div>
                  </>
                )}
              </section>

              <Section title="Account">
                <LinkRow to="/onboarding" icon={UserCog} label="Update my profile" note="Change weight, goal or activity" onClick={onClose} />
                <ButtonRow icon={SlidersHorizontal} label="Settings" note="Reminders, units, password" onClick={() => setView('settings')} />
                <ButtonRow icon={ShieldCheck} label="Privacy and data" note="Download or delete your data" onClick={() => setView('privacy')} />
              </Section>

              <Section title="Support">
                <ButtonRow icon={CircleHelp} label="Help center" note="Answers to common questions" onClick={() => setView('help')} />
                <ButtonRow icon={LifeBuoy} label="Contact support" note="Report a problem or share an idea" onClick={() => setView('contact')} />
                <ButtonRow icon={FileText} label="Terms and privacy policy" onClick={() => setView('terms')} />
                <ButtonRow icon={Info} label="About AIVO" note={`Version ${APP_VERSION}`} onClick={() => setView('about')} />
              </Section>
            </div>
          )}

          {view === 'settings' && <SettingsView prefs={prefs} setPref={setPref} perm={perm} setReminders={setReminders} onChangePassword={onChangePassword} toast={toast} />}
          {view === 'privacy' && (
            <PrivacyView prefs={prefs} setPref={setPref} name={name} rec={rec} exportExtra={exportExtra} onDeleteAccount={onDeleteAccount}
              onAfterClear={() => { setPrefs(DEFAULT_PREFS); onPrefsChange?.(DEFAULT_PREFS) }} onClose={onClose} toast={toast} />
          )}
          {view === 'help' && <HelpView goContact={() => setView('contact')} />}
          {view === 'contact' && <ContactView name={name} supportEmail={supportEmail} onSendFeedback={onSendFeedback} toast={toast} back={back} />}
          {view === 'terms' && <TermsView />}
          {view === 'about' && <AboutView toast={toast} />}
        </div>

        {toastMsg && (
          <div role="status" className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-5">
            <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg">{toastMsg}</span>
          </div>
        )}

        {/* Log out is last and needs a second tap, so it is never pressed by accident */}
        <footer className="border-t border-white/10 p-5">
          {confirming ? (
            <div role="alertdialog" aria-label="Confirm log out">
              <p className="text-sm font-semibold">Log out of AIVO?</p>
              <p className="mt-0.5 text-xs text-white/50">Your plans and progress stay saved.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="flex-1 rounded-full border border-white/20 py-2.5 text-sm font-semibold transition hover:bg-white/5">Stay</button>
                <button type="button" onClick={onLogout} className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition hover:brightness-110">Log out</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-red-500/40 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10">
              <LogOut size={16} /> Log out
            </button>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
