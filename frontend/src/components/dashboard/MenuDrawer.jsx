import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity, Bell, Cake, Camera, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Download, Dumbbell, FileText, Flag, Info, LifeBuoy, LogOut,
  Phone, Ruler, Scale, ShieldCheck, SlidersHorizontal, Sparkles, Target, Trash2, TrendingDown, User, UserCog, X, Zap,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const APP_VERSION = '1.0.0'
const STORE = 'aivo'                       // every localStorage key that starts with this belongs to the app
const PREFS_KEY = `${STORE}:prefs`
const LAST_REMINDER_KEY = `${STORE}:lastReminder`
const PROFILE_KEY = `${STORE}:profile`
const DEFAULT_PREFS = { reminders: false, reminderTime: '18:00', units: 'metric', weekStart: 'mon', aiPersonalize: true, analytics: true }

const TITLES = {
  main: 'Menu', profile: 'My profile', settings: 'Settings', privacy: 'Privacy and data', help: 'Help center',
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
/* Profile                                                             */
/* ------------------------------------------------------------------ */
// Edit these lists so the values match what your onboarding saves.
const GOALS = [
  { value: 'Lose weight', icon: TrendingDown },
  { value: 'Build muscle', icon: Dumbbell },
  { value: 'Maintain weight', icon: Scale },
  { value: 'Improve fitness', icon: Zap },
]
const ACTIVITY = [
  { value: 'Sedentary', note: 'Desk job, little exercise' },
  { value: 'Lightly active', note: 'Exercise 1 to 3 days a week' },
  { value: 'Moderately active', note: 'Exercise 3 to 5 days a week' },
  { value: 'Very active', note: 'Hard exercise 6 to 7 days a week' },
  { value: 'Extra active', note: 'Very hard training or a physical job' },
]
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const SEXES = ['Male', 'Female', 'Other']
const KG_PER_LB = 0.45359237
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null && o[k] !== '') return o[k]; return undefined }
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN }
const r1 = (n) => Math.round(n * 10) / 10
const r2 = (n) => Math.round(n * 100) / 100
const r3 = (n) => Math.round(n * 1000) / 1000
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const matchOpt = (list, v) => {
  if (!v) return ''
  const hit = list.find((o) => String(o.value ?? o).toLowerCase() === String(v).toLowerCase())
  return hit ? (hit.value ?? hit) : String(v)
}
const readStoredProfile = () => { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') } catch { return {} } }

/* ---- dates and formatting ---- */
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate()   // m is 0 to 11
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const parseIso = (iso) => { const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return t ? { y: +t[1], m: +t[2] - 1, d: +t[3] } : null }
const ageFrom = (iso) => {
  const b = parseIso(iso)
  if (!b) return NaN
  const t = new Date()
  let a = t.getFullYear() - b.y
  if (t.getMonth() < b.m || (t.getMonth() === b.m && t.getDate() < b.d)) a -= 1
  return a
}
const fmtBirthday = (iso) => { const b = parseIso(iso); return b ? `${MONTHS[b.m]} ${b.d}, ${b.y}` : '' }
const fmtHeight = (cm, unit) => {
  if (!Number.isFinite(cm)) return ''
  if (unit === 'cm') return `${Math.round(cm)} cm`
  const t = Math.round(cm / 2.54)
  return `${Math.floor(t / 12)}'${t % 12}"`
}
const fmtWeight = (kg, unit) => (Number.isFinite(kg) ? (unit === 'kg' ? `${r1(kg)} kg` : `${r1(kg / KG_PER_LB)} lb`) : '')

/* ---- wheel data ---- */
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => ({ value: a + i, label: String(a + i) }))
const THIS_YEAR = new Date().getFullYear()
const MONTH_ITEMS = MONTHS.map((label, value) => ({ value, label }))
const YEAR_ITEMS = range(THIS_YEAR - 100, THIS_YEAR - 13)
const CM_ITEMS = range(100, 250)
const FT_ITEMS = range(3, 8)
const IN_ITEMS = range(0, 11)
const TENTH_ITEMS = Array.from({ length: 10 }, (_, i) => ({ value: i, label: `.${i}` }))
const KG_ITEMS = range(25, 350)
const LB_ITEMS = range(55, 770)

/* ---- profile <-> form ---- */
// Saved profile (metric) -> what the form edits. Numbers stay metric, the pickers convert for display.
function toForm(profile, name, rec) {
  const p = profile || {}
  const cm = num(pick(p, ['heightCm', 'height_cm', 'height']) ?? rec?.heightCm)
  const kg = num(pick(p, ['weightKg', 'weight_kg', 'weight']) ?? rec?.weightKg)
  const tkg = num(pick(p, ['targetWeightKg', 'target_weight_kg', 'targetWeight']))
  const bd = String(pick(p, ['birthday', 'birthdate', 'dob']) || '')
  const age = num(p.age)
  return {
    avatar: pick(p, ['avatar', 'photo', 'picture']) || '',
    name: String(pick(p, ['name']) || (name && name !== 'there' ? name : '')),
    phone: String(pick(p, ['phone', 'phoneNumber', 'mobile']) || ''),
    birthday: parseIso(bd) ? bd : '',
    age: Number.isFinite(age) ? Math.round(age) : null,        // only used until a birthday is chosen
    gender: matchOpt(SEXES, pick(p, ['gender', 'sex'])),
    heightCm: Number.isFinite(cm) ? r1(cm) : null,
    weightKg: Number.isFinite(kg) ? r3(kg) : null,
    targetKg: Number.isFinite(tkg) ? r3(tkg) : null,
    goal: matchOpt(GOALS, pick(p, ['goal', 'fitnessGoal']) || rec?.goal),
    activity: matchOpt(ACTIVITY, pick(p, ['activity', 'activityLevel'])),
    level: matchOpt(LEVELS, pick(p, ['level', 'experience', 'experienceLevel']) || rec?.level),
    days: Number(pick(p, ['daysPerWeek', 'workoutDays'])) || 0,
  }
}

const effectiveAge = (f) => (f.birthday ? ageFrom(f.birthday) : f.age ?? NaN)

function validate(f) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Enter your name.'
  const phone = f.phone.trim()
  if (phone) {
    const digits = phone.replace(/\D/g, '')
    if (!/^[+\d][\d\s().-]*$/.test(phone) || digits.length < 7 || digits.length > 15) e.phone = 'Enter a valid phone number.'
  }
  const age = effectiveAge(f)
  if (!Number.isFinite(age)) e.birthday = 'Select your birthday.'
  else if (age < 13 || age > 100) e.birthday = 'Choose a birthday that makes you 13 to 100.'
  if (!(f.heightCm >= 100 && f.heightCm <= 250)) e.height = 'Select your height.'
  if (!(f.weightKg >= 25 && f.weightKg <= 350)) e.weight = 'Select your weight.'
  if (f.targetKg != null && !(f.targetKg >= 25 && f.targetKg <= 350)) e.target = 'Select a valid target weight.'
  return e
}

// Keys match lib/profile.js (gender, activityLevel, heightCm, weightKg). Goal and level reuse whichever key the saved profile already has.
function buildValues(f, base) {
  const keyOf = (keys, fallback) => keys.find((k) => base && k in base) ?? fallback
  return {
    avatar: f.avatar || '',
    name: f.name.trim(),
    phone: f.phone.trim(),
    birthday: f.birthday || null,
    age: effectiveAge(f),
    gender: f.gender,
    heightCm: r1(f.heightCm),
    weightKg: r2(f.weightKg),
    targetWeightKg: f.targetKg != null ? r2(f.targetKg) : null,
    activityLevel: f.activity,
    [keyOf(['goal', 'fitnessGoal'], 'goal')]: f.goal,
    [keyOf(['level', 'experience', 'experienceLevel'], 'level')]: f.level,
    daysPerWeek: f.days || null,
  }
}

function completeness(f) {
  const steps = [
    [f.avatar, 'Add a profile photo'], [f.name.trim(), 'Add your name'], [f.phone.trim(), 'Add a phone number'],
    [f.birthday || f.age, 'Select your birthday'], [f.gender, 'Select your gender'], [f.heightCm, 'Select your height'],
    [f.weightKg, 'Select your weight'], [f.targetKg, 'Set a target weight'], [f.goal, 'Choose a goal'],
    [f.activity, 'Choose your activity level'], [f.level, 'Pick your experience level'], [f.days, 'Pick your training days'],
  ]
  const done = steps.filter(([v]) => Boolean(v)).length
  return { pct: Math.round((done / steps.length) * 100), next: steps.find(([v]) => !v)?.[1] || '' }
}

// Readable "before -> after" rows for the confirmation
function describeChanges(a, b, hUnit, wUnit) {
  const rows = []
  const add = (label, x, y) => { if (x !== y) rows.push([label, x || 'Not set', y || 'Not set']) }
  if (a.avatar !== b.avatar) rows.push(['Photo', a.avatar ? 'Current photo' : 'None', b.avatar ? 'New photo' : 'Removed'])
  add('Name', a.name, b.name.trim())
  add('Phone', a.phone, b.phone.trim())
  add('Birthday', fmtBirthday(a.birthday), fmtBirthday(b.birthday))
  add('Gender', a.gender, b.gender)
  add('Height', fmtHeight(a.heightCm, hUnit), fmtHeight(b.heightCm, hUnit))
  add('Weight', fmtWeight(a.weightKg, wUnit), fmtWeight(b.weightKg, wUnit))
  add('Target weight', fmtWeight(a.targetKg, wUnit), fmtWeight(b.targetKg, wUnit))
  add('Goal', a.goal, b.goal)
  add('Experience', a.level, b.level)
  add('Daily activity', a.activity, b.activity)
  add('Training days', a.days ? `${a.days} a week` : '', b.days ? `${b.days} a week` : '')
  return rows
}

// Crops to a centred square and shrinks to 256px so it stays small enough to store
const readAvatar = (file) => new Promise((resolve, reject) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    const s = Math.min(img.width, img.height)
    const c = document.createElement('canvas')
    c.width = 256; c.height = 256
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256)
    URL.revokeObjectURL(url)
    resolve(c.toDataURL('image/jpeg', 0.85))
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')) }
  img.src = url
})

const Avatar = ({ src, name, size = 48, ring = false }) => {
  const cls = `shrink-0 rounded-full ${ring ? 'ring-2 ring-gold/70 ring-offset-2 ring-offset-[#121212]' : ''}`
  return src
    ? <img src={src} alt="" className={`${cls} object-cover`} style={{ width: size, height: size }} />
    : <span aria-hidden="true" className={`${cls} grid place-items-center bg-gold font-extrabold text-black`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
        {String(name || '').trim().charAt(0).toUpperCase() || 'A'}
      </span>
}

/* ---- wheel picker ---- */
const ITEM_H = 40

function Wheel({ items, value, onChange, label, width = 72 }) {
  const ref = useRef(null)
  const idx = Math.max(0, items.findIndex((i) => i.value === value))
  const [active, setActive] = useState(idx)
  const scrolling = useRef(false)   // true while the user is moving the wheel, so we never fight them
  const timer = useRef(null)
  const drag = useRef(null)
  const indexAt = () => clamp(Math.round(ref.current.scrollTop / ITEM_H), 0, items.length - 1)
  const go = (i) => ref.current?.scrollTo({ top: clamp(i, 0, items.length - 1) * ITEM_H, behavior: 'smooth' })

  // Keep the wheel on the right row when the value or the list changes from outside
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || scrolling.current) return
    if (Math.abs(el.scrollTop - idx * ITEM_H) > 1) el.scrollTop = idx * ITEM_H
    setActive(idx)
  }, [idx, items.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), [])

  const onScroll = () => {
    scrolling.current = true
    const i = indexAt()
    setActive((a) => (a === i ? a : i))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      scrolling.current = false
      const j = indexAt()
      setActive(j)
      if (items[j] && items[j].value !== value) onChange(items[j].value)
    }, 110)
  }

  const onKeyDown = (e) => {
    const step = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key]
    if (step) { e.preventDefault(); go(active + step) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(items.length - 1) }
  }

  // Mouse users can drag the wheel like a touch screen. Touch scrolls natively.
  const down = (e) => {
    if (e.pointerType !== 'mouse') return
    drag.current = { y: e.clientY, top: ref.current.scrollTop, moved: false }
    ref.current.style.scrollSnapType = 'none'
    ref.current.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    if (Math.abs(e.clientY - d.y) > 3) d.moved = true
    ref.current.scrollTop = d.top - (e.clientY - d.y)
  }
  const up = (e) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    ref.current.style.scrollSnapType = 'y mandatory'
    if (d.moved) go(indexAt())
    else {   // a plain click picks the row that was clicked
      const y = e.clientY - ref.current.getBoundingClientRect().top + ref.current.scrollTop
      go(Math.floor((y - ITEM_H * 2) / ITEM_H))
    }
  }

  const fade = 'linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)'
  return (
    <div className="flex flex-col items-center" style={{ width }}>
      <div ref={ref} role="spinbutton" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={items.length - 1} aria-valuenow={active} aria-valuetext={items[active]?.label}
        onScroll={onScroll} onKeyDown={onKeyDown} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="w-full cursor-grab overflow-y-auto rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 [&::-webkit-scrollbar]:hidden"
        style={{ height: ITEM_H * 5, scrollSnapType: 'y mandatory', scrollbarWidth: 'none', overscrollBehavior: 'contain', touchAction: 'pan-y', userSelect: 'none', maskImage: fade, WebkitMaskImage: fade }}>
        <div style={{ paddingBlock: ITEM_H * 2 }}>
          {items.map((it, i) => {
            const d = Math.abs(i - active)
            return (
              <button key={it.value} type="button" tabIndex={-1} aria-hidden="true" onClick={() => go(i)}
                className="block w-full text-center text-white"
                style={{ height: ITEM_H, scrollSnapAlign: 'center', opacity: d === 0 ? 1 : d === 1 ? 0.55 : 0.25, fontSize: d === 0 ? 18 : 15, fontWeight: d === 0 ? 700 : 500, transition: 'opacity 120ms' }}>
                {it.label}
              </button>
            )
          })}
        </div>
      </div>
      {label && <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</span>}
    </div>
  )
}

// Wheels side by side with one highlight band across them
const WheelGroup = ({ children }) => (
  <div className="relative flex justify-center gap-1.5">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 rounded-xl border border-gold/30 bg-gold/10" style={{ top: ITEM_H * 2, height: ITEM_H }} />
    {children}
  </div>
)

const UnitToggle = ({ value, options, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="mb-3 flex rounded-full bg-white/10 p-0.5">
    {options.map(([v, l]) => (
      <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
        className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${value === v ? 'bg-gold text-black' : 'text-white/70 hover:text-white'}`}>{l}</button>
    ))}
  </div>
)

const PickerActions = ({ onCancel, onDone, onClear }) => (
  <div className="mt-3 flex gap-2">
    <button type="button" onClick={onCancel} className={`${ghostBtn} flex-1 !py-2`}>Cancel</button>
    {onClear && <button type="button" onClick={onClear} className={`${ghostBtn} flex-1 !py-2`}>Clear</button>}
    <button type="button" onClick={onDone} className={`${primaryBtn} flex-[1.4] !py-2`}>Done</button>
  </div>
)

function BirthdayPicker({ value, fallbackAge, onDone, onCancel }) {
  const start = parseIso(value) ?? { y: clamp(THIS_YEAR - (fallbackAge || 25), THIS_YEAR - 100, THIS_YEAR - 13), m: 0, d: 1 }
  const [y, setY] = useState(start.y)
  const [m, setM] = useState(start.m)
  const [d, setD] = useState(start.d)
  const maxD = daysIn(y, m)
  const day = Math.min(d, maxD)
  const dayItems = useMemo(() => range(1, maxD), [maxD])
  return (
    <>
      <WheelGroup>
        <Wheel label="Month" items={MONTH_ITEMS} value={m} onChange={setM} width={84} />
        <Wheel label="Day" items={dayItems} value={day} onChange={setD} width={64} />
        <Wheel label="Year" items={YEAR_ITEMS} value={y} onChange={setY} width={84} />
      </WheelGroup>
      <PickerActions onCancel={onCancel} onDone={() => onDone(isoOf(y, m, day))} />
    </>
  )
}

function HeightPicker({ cm, unit, setUnit, onDone, onCancel }) {
  const [v, setV] = useState(Number.isFinite(cm) ? cm : 170)
  const total = Math.round(v / 2.54)
  const ft = Math.floor(total / 12)
  const inch = total % 12
  const setFtIn = (f, i) => setV(clamp(r1((f * 12 + i) * 2.54), 100, 250))
  return (
    <>
      <UnitToggle label="Height unit" value={unit} onChange={setUnit} options={[['cm', 'Centimetres'], ['ft', 'Feet and inches']]} />
      <WheelGroup>
        {unit === 'cm'
          ? <Wheel label="cm" items={CM_ITEMS} value={Math.round(v)} onChange={setV} width={96} />
          : (<>
              <Wheel label="ft" items={FT_ITEMS} value={ft} onChange={(f) => setFtIn(f, inch)} width={72} />
              <Wheel label="in" items={IN_ITEMS} value={inch} onChange={(i) => setFtIn(ft, i)} width={72} />
            </>)}
      </WheelGroup>
      <PickerActions onCancel={onCancel} onDone={() => onDone(v)} />
    </>
  )
}

function WeightPicker({ kg, fallbackKg, unit, setUnit, onDone, onCancel, onClear }) {
  const [v, setV] = useState(Number.isFinite(kg) ? kg : fallbackKg)
  const disp = unit === 'kg' ? v : v / KG_PER_LB
  const tenths = Math.round(disp * 10)
  const whole = Math.floor(tenths / 10)
  const tenth = tenths % 10
  const set = (w, t) => { const x = w + t / 10; setV(r3(unit === 'kg' ? x : x * KG_PER_LB)) }
  return (
    <>
      <UnitToggle label="Weight unit" value={unit} onChange={setUnit} options={[['kg', 'Kilograms'], ['lb', 'Pounds']]} />
      <WheelGroup>
        <Wheel label={unit} items={unit === 'kg' ? KG_ITEMS : LB_ITEMS} value={whole} onChange={(w) => set(w, tenth)} width={88} />
        <Wheel label="decimal" items={TENTH_ITEMS} value={tenth} onChange={(t) => set(whole, t)} width={64} />
      </WheelGroup>
      <PickerActions onCancel={onCancel} onDone={() => onDone(v)} onClear={onClear} />
    </>
  )
}

/* ---- layout pieces ---- */
const Field = ({ id, label, optional, error, hint, children }) => (
  <div className="min-w-0">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-white/70">{label}</label>
      {optional && <span className="text-[11px] text-white/35">Optional</span>}
    </div>
    {children}
    {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : hint ? <p className="mt-1 text-[11px] text-white/40">{hint}</p> : null}
  </div>
)

// A collapsible card. The summary line shows the current answers while it is closed.
function Card({ id, icon: Icon, title, summary, open, onToggle, alert, children }) {
  return (
    <section className={`overflow-hidden rounded-2xl border bg-white/[0.02] transition-colors ${open ? 'border-gold/30' : alert ? 'border-red-500/40' : 'border-white/10'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`pf-${id}`}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#1b1b1b] text-gold"><Icon size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className={`block truncate text-xs ${alert ? 'text-red-300' : 'text-white/50'}`}>{alert ? 'Needs your attention' : summary}</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-white/40 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={`pf-${id}`} style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 300ms ease' }}>
        <div className="min-h-0 overflow-hidden" style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? '0s' : '300ms'}` }}>
          <div className="space-y-3 px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </section>
  )
}

// A tappable row that shows the current answer and opens a picker underneath
function PickerRow({ icon: Icon, label, value, placeholder, open, onToggle, error, optional, children }) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${open ? 'border-gold/50 bg-gold/[0.06]' : error ? 'border-red-500/50' : 'border-white/10 hover:bg-white/5'}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#1b1b1b] text-gold"><Icon size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-white/50">{label}{optional && <span className="font-normal text-white/30"> (optional)</span>}</span>
          <span className={`block truncate text-sm font-semibold ${value ? 'text-white' : 'text-white/35'}`}>{value || placeholder}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {error && !open && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
      {open && <div className="mt-2 rounded-xl border border-white/10 bg-black/40 p-3">{children}</div>}
    </div>
  )
}

const choice = (on) => `border transition ${on ? 'border-gold bg-gold/10 text-white' : 'border-white/10 text-white/70 hover:bg-white/5'}`

function ConfirmUpdate({ rows, busy, onCancel, onConfirm }) {
  const yesRef = useRef(null)
  useEffect(() => {
    yesRef.current?.focus()
    // Escape closes only this dialog, not the menu behind it
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="fixed inset-0 grid place-items-center bg-black/75 px-5" style={{ zIndex: 1100 }}>
      <div role="alertdialog" aria-modal="true" aria-label="Confirm profile update" className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border border-white/10 bg-[#181818] p-5 shadow-2xl">
        <p className="text-base font-bold">Update your profile?</p>
        <p className="mt-1 text-xs text-white/50">Your calories, protein and plans will be recalculated from these details.</p>
        <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {rows.length ? rows.map(([label, from, to]) => (
            <li key={label} className="rounded-xl bg-white/5 px-3 py-2">
              <p className="text-[11px] font-semibold text-white/50">{label}</p>
              <p className="text-sm"><span className="text-white/40 line-through">{from}</span><span className="mx-1.5 text-white/30">to</span><span className="font-semibold text-gold">{to}</span></p>
            </li>
          )) : <li className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/60">Only small adjustments were made.</li>}
        </ul>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={`${ghostBtn} flex-1`}>Review</button>
          <button ref={yesRef} type="button" onClick={onConfirm} disabled={busy} className={`${primaryBtn} flex-[1.4]`}>{busy ? 'Updating' : 'Yes, update'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ProfileView({ initial, base, imperial, onSave, onDirty }) {
  const [f, setF] = useState(initial)
  const [cards, setCards] = useState({ about: false, body: false, goal: false, training: false })   // all start collapsed
  const [picker, setPicker] = useState(null)   // 'birthday' | 'height' | 'weight' | 'target' | null
  const [hUnit, setHUnit] = useState(imperial ? 'ft' : 'cm')
  const [wUnit, setWUnit] = useState(imperial ? 'lb' : 'kg')
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [photoErr, setPhotoErr] = useState('')
  const fileRef = useRef(null)

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const toggleCard = (k) => { setCards((c) => ({ ...c, [k]: !c[k] })); setPicker(null) }
  const togglePicker = (k) => setPicker((p) => (p === k ? null : k))
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  useEffect(() => { onDirty(dirty) }, [dirty])          // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onDirty(false), [])             // eslint-disable-line react-hooks/exhaustive-deps

  const errors = validate(f)
  const shown = (k) => (submitted || touched[k] ? errors[k] : undefined)
  const { pct, next } = completeness(f)
  const age = effectiveAge(f)
  const aboutBad = submitted && (errors.name || errors.phone || errors.birthday)
  const bodyBad = submitted && (errors.height || errors.weight || errors.target)

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoErr('')
    if (!file.type.startsWith('image/')) return setPhotoErr('Choose an image file.')
    if (file.size > 10 * 1024 * 1024) return setPhotoErr('Choose a photo under 10 MB.')
    try { set('avatar', await readAvatar(file)) } catch (e2) { setPhotoErr(e2.message) }
  }

  const requestSave = () => {
    setSubmitted(true)
    const keys = Object.keys(errors)
    if (keys.length) {
      setCards((c) => ({
        ...c,
        about: c.about || keys.some((k) => ['name', 'phone', 'birthday'].includes(k)),
        body: c.body || keys.some((k) => ['height', 'weight', 'target'].includes(k)),
      }))
      setErr('Please fix the items marked in red.')
      return
    }
    setErr('')
    setConfirm(true)
  }

  const doSave = async () => {
    setBusy(true)
    try { await onSave(buildValues(f, base)) }
    catch (e2) { setConfirm(false); setErr(e2?.message || 'Could not save your profile. Try again.') }
    finally { setBusy(false) }
  }

  const aboutSummary = [f.name.trim(), Number.isFinite(age) ? `${age} yrs` : '', f.gender].filter(Boolean).join(' · ') || 'Add your details'
  const bodySummary = [fmtHeight(f.heightCm, hUnit), fmtWeight(f.weightKg, wUnit)].filter(Boolean).join(' · ') || 'Add your height and weight'
  const trainSummary = [f.level, f.days ? `${f.days} day${f.days > 1 ? 's' : ''} a week` : ''].filter(Boolean).join(' · ') || 'Set up your training'

  return (
    <div className="space-y-4">
      {/* Photo and completeness */}
      <section className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-4 text-center">
        <div className="relative mx-auto h-24 w-24">
          <Avatar src={f.avatar} name={f.name} size={96} ring />
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={f.avatar ? 'Change photo' : 'Add photo'}
            className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-[#121212] bg-gold text-black shadow transition hover:brightness-110"><Camera size={16} /></button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>
        <p className="mt-3 truncate text-base font-bold">{f.name.trim() || 'Your name'}</p>
        {f.avatar
          ? <button type="button" onClick={() => set('avatar', '')} className="mt-0.5 text-xs text-white/50 underline-offset-2 transition hover:text-white hover:underline">Remove photo</button>
          : <p className="mt-0.5 text-xs text-white/50">Add a photo so AIVO feels like yours (optional)</p>}
        {photoErr && <div className="mt-2"><Note tone="error">{photoErr}</Note></div>}
        <div className="mt-4 text-left">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-white/60">Profile {pct}% complete</span>
            {pct === 100 && <span className="inline-flex items-center gap-1 text-emerald-300"><Sparkles size={12} /> All set</span>}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          {next && <p className="mt-2 text-[11px] text-white/50">Next: {next}</p>}
        </div>
      </section>

      <Card id="about" icon={User} title="About you" summary={aboutSummary} open={cards.about} onToggle={() => toggleCard('about')} alert={Boolean(aboutBad) && !cards.about}>
        <Field id="pf-name" label="Name" error={shown('name')}>
          <input id="pf-name" value={f.name} onChange={(e) => set('name', e.target.value)} onBlur={blur('name')} autoComplete="name" placeholder="Your name"
            aria-invalid={Boolean(shown('name'))} className={`${field} ${shown('name') ? 'border-red-500/60' : ''}`} />
        </Field>
        <Field id="pf-phone" label="Phone number" optional error={shown('phone')}>
          <div className="relative">
            <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input id="pf-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} onBlur={blur('phone')}
              placeholder="+63 912 345 6789" aria-invalid={Boolean(shown('phone'))} className={`${field} pl-9 ${shown('phone') ? 'border-red-500/60' : ''}`} />
          </div>
        </Field>
        <PickerRow icon={Cake} label="Birthday" placeholder="Tap to select" error={shown('birthday')} open={picker === 'birthday'} onToggle={() => togglePicker('birthday')}
          value={f.birthday ? `${fmtBirthday(f.birthday)} · ${age} yrs` : Number.isFinite(age) ? `Age ${age} (add your birthday)` : ''}>
          <BirthdayPicker value={f.birthday} fallbackAge={f.age} onCancel={() => setPicker(null)} onDone={(iso) => { set('birthday', iso); setPicker(null) }} />
        </PickerRow>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/70">Gender</p>
          <div role="radiogroup" aria-label="Gender" className="grid grid-cols-3 gap-1.5">
            {SEXES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={f.gender === s} onClick={() => set('gender', s)}
                className={`rounded-xl py-2.5 text-xs font-semibold ${choice(f.gender === s)}`}>{s}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card id="body" icon={Ruler} title="Your body" summary={bodySummary} open={cards.body} onToggle={() => toggleCard('body')} alert={Boolean(bodyBad) && !cards.body}>
        <PickerRow icon={Ruler} label="Height" placeholder="Tap to select" error={shown('height')} open={picker === 'height'} onToggle={() => togglePicker('height')}
          value={fmtHeight(f.heightCm, hUnit)}>
          <HeightPicker cm={f.heightCm} unit={hUnit} setUnit={setHUnit} onCancel={() => setPicker(null)} onDone={(cm) => { set('heightCm', r1(cm)); setPicker(null) }} />
        </PickerRow>
        <PickerRow icon={Scale} label="Weight" placeholder="Tap to select" error={shown('weight')} open={picker === 'weight'} onToggle={() => togglePicker('weight')}
          value={fmtWeight(f.weightKg, wUnit)}>
          <WeightPicker kg={f.weightKg} fallbackKg={70} unit={wUnit} setUnit={setWUnit} onCancel={() => setPicker(null)} onDone={(kg) => { set('weightKg', r3(kg)); setPicker(null) }} />
        </PickerRow>
        <PickerRow icon={Flag} label="Target weight" optional placeholder="Tap to set a target" error={shown('target')} open={picker === 'target'} onToggle={() => togglePicker('target')}
          value={fmtWeight(f.targetKg, wUnit)}>
          <WeightPicker kg={f.targetKg} fallbackKg={f.weightKg ?? 70} unit={wUnit} setUnit={setWUnit} onCancel={() => setPicker(null)}
            onDone={(kg) => { set('targetKg', r3(kg)); setPicker(null) }} onClear={f.targetKg != null ? () => { set('targetKg', null); setPicker(null) } : undefined} />
        </PickerRow>
      </Card>

      <Card id="goal" icon={Target} title="Your goal" summary={f.goal || 'Choose your goal'} open={cards.goal} onToggle={() => toggleCard('goal')}>
        <div role="radiogroup" aria-label="Goal" className="grid grid-cols-2 gap-2">
          {GOALS.map(({ value, icon: Icon }) => (
            <button key={value} type="button" role="radio" aria-checked={f.goal === value} onClick={() => set('goal', value)}
              className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-xs font-semibold ${choice(f.goal === value)}`}>
              <Icon size={16} className={f.goal === value ? 'text-gold' : 'text-white/40'} />{value}
            </button>
          ))}
        </div>
      </Card>

      <Card id="training" icon={Activity} title="Training" summary={trainSummary} open={cards.training} onToggle={() => toggleCard('training')}>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/70">Experience</p>
          <div role="radiogroup" aria-label="Experience level" className="grid grid-cols-3 gap-1.5 rounded-full bg-white/10 p-0.5">
            {LEVELS.map((l) => (
              <button key={l} type="button" role="radio" aria-checked={f.level === l} onClick={() => set('level', l)}
                className={`rounded-full py-2 text-xs font-semibold transition ${f.level === l ? 'bg-gold text-black' : 'text-white/70 hover:text-white'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/70">Daily activity</p>
          <div role="radiogroup" aria-label="Activity level" className="space-y-1.5">
            {ACTIVITY.map(({ value, note }) => (
              <button key={value} type="button" role="radio" aria-checked={f.activity === value} onClick={() => set('activity', value)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${choice(f.activity === value)}`}>
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${f.activity === value ? 'border-gold' : 'border-white/30'}`}>
                  {f.activity === value && <span className="h-2 w-2 rounded-full bg-gold" />}
                </span>
                <span className="min-w-0"><span className="block text-xs font-semibold">{value}</span><span className="block text-[11px] text-white/50">{note}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/70">Training days per week</p>
          <div role="radiogroup" aria-label="Training days per week" className="flex justify-between gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button key={d} type="button" role="radio" aria-checked={f.days === d} onClick={() => set('days', d)}
                className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${f.days === d ? 'border border-gold bg-gold text-black' : 'border border-white/10 text-white/70 hover:bg-white/5'}`}>{d}</button>
            ))}
          </div>
        </div>
      </Card>

      {(dirty || err) && (
        <div className="sticky bottom-0 -mx-5 -mb-5 space-y-2 border-t border-white/10 bg-[#121212]/95 px-5 py-3 backdrop-blur">
          {err && <Note tone="error">{err}</Note>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setF(initial); setTouched({}); setSubmitted(false); setErr(''); setPicker(null) }} className={`${ghostBtn} flex-1`}>Discard</button>
            <button type="button" onClick={requestSave} className={`${primaryBtn} flex-[2]`}>Save changes</button>
          </div>
        </div>
      )}

      {confirm && <ConfirmUpdate rows={describeChanges(initial, f, hUnit, wUnit)} busy={busy} onCancel={() => setConfirm(false)} onConfirm={doSave} />}
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
 *  profile                                             -> your saved profile (getProfile()), used to fill the profile form
 *  onSaveProfile(values)                               -> save the profile (may throw an Error to show a message). values:
 *                                                         { avatar, name, phone, birthday, age, gender, heightCm, weightKg,
 *                                                           targetWeightKg, activityLevel, goal, level, daysPerWeek } (metric units)
 *                                                         Without it the values are kept in localStorage under "aivo:profile".
 */
export default function MenuDrawer({
  open, onClose, name = 'there', rec, onLogout,
  onChangePassword, onDeleteAccount, onSendFeedback, exportExtra, onPrefsChange, profile, onSaveProfile,
  supportEmail = 'support@aivo.app',
}) {
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
  const [savedProfile, setSavedProfile] = useState(() => ({ ...(profile || {}), ...(onSaveProfile ? {} : readStoredProfile()) }))
  const [discard, setDiscard] = useState(false)
  const dirtyRef = useRef(false)
  const pendingRef = useRef(null)
  const guardRef = useRef(null)
  // Anything that would leave the profile form with unsaved edits asks first
  guardRef.current = (fn) => {
    if (viewRef.current === 'profile' && dirtyRef.current) { pendingRef.current = fn; setDiscard(true) } else fn()
  }
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
    if (!open) { setConfirming(false); setShown(false); setView('main'); setDiscard(false); dirtyRef.current = false; return undefined }
    const raf = requestAnimationFrame(() => setShown(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Escape goes back one level first, then closes
    const onKey = (e) => { if (e.key === 'Escape') { if (viewRef.current !== 'main') guardRef.current(() => setView('main')); else onCloseRef.current() } }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  useEffect(() => { bodyRef.current?.scrollTo?.({ top: 0 }); setConfirming(false) }, [view])

  if (!open) return null

  const back = () => setView('main')
  const imperial = prefs.units === 'imperial'
  const displayName = String(pick(savedProfile, ['name']) || name)
  const formInitial = toForm(savedProfile, displayName, rec)
  const completion = completeness(formInitial)
  const chipWeight = num(pick(savedProfile, ['weightKg', 'weight_kg', 'weight'])) || rec?.weightKg
  const chipGoal = pick(savedProfile, ['goal']) || rec?.goal
  const chipLevel = pick(savedProfile, ['level']) || rec?.level

  const saveProfile = async (values) => {
    if (onSaveProfile) await onSaveProfile(values)
    else {
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(values)) }
      catch { throw new Error('Could not save on this device. Check your browser storage settings.') }
    }
    setSavedProfile((p) => ({ ...p, ...values }))
    dirtyRef.current = false
    toast('Profile updated')
    setView('main')
  }

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 1000 }}>
      <button type="button" tabIndex={-1} aria-label="Close menu" onClick={() => guardRef.current(onClose)}
        className="absolute inset-0 bg-black/70" style={{ opacity: shown ? 1 : 0, transition: 'opacity 300ms ease' }} />

      <aside id="app-menu" role="dialog" aria-modal="true" aria-label={TITLES[view]}
        style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 300ms ease' }}
        className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-l border-white/10 bg-[#121212] shadow-2xl">
        <header className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          {view !== 'main' && (
            <button type="button" onClick={() => guardRef.current(back)} aria-label="Back to menu"
              className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"><ChevronLeft size={20} /></button>
          )}
          <h2 className="flex-1 text-lg font-bold">{TITLES[view]}</h2>
          <button ref={closeRef} type="button" onClick={() => guardRef.current(onClose)} aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </header>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-5">
          {view === 'main' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gold/40 bg-black p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={formInitial.avatar} name={displayName} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{displayName}</p>
                    <p className="text-xs text-white/50">Signed in</p>
                  </div>
                  <button type="button" onClick={() => setView('profile')}
                    className="shrink-0 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10">Edit</button>
                </div>
                {rec && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chipGoal && <Chip>{chipGoal}</Chip>}
                      {chipLevel && <Chip>{chipLevel}</Chip>}
                      {chipWeight && <Chip>{imperial ? `${Math.round(chipWeight * 2.20462)} lb` : `${Math.round(chipWeight)} kg`}</Chip>}
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
                <ButtonRow icon={UserCog} label="Update my profile" note={completion.pct < 100 ? `${completion.pct}% complete` : 'Photo, body details and goal'} onClick={() => setView('profile')} />
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

          {view === 'profile' && <ProfileView initial={formInitial} base={savedProfile} imperial={imperial} onSave={saveProfile} onDirty={(d) => { dirtyRef.current = d }} />}
          {view === 'settings' && <SettingsView prefs={prefs} setPref={setPref} perm={perm} setReminders={setReminders} onChangePassword={onChangePassword} toast={toast} />}
          {view === 'privacy' && (
            <PrivacyView prefs={prefs} setPref={setPref} name={displayName} rec={rec} exportExtra={exportExtra} onDeleteAccount={onDeleteAccount}
              onAfterClear={() => { setPrefs(DEFAULT_PREFS); onPrefsChange?.(DEFAULT_PREFS) }} onClose={onClose} toast={toast} />
          )}
          {view === 'help' && <HelpView goContact={() => setView('contact')} />}
          {view === 'contact' && <ContactView name={displayName} supportEmail={supportEmail} onSendFeedback={onSendFeedback} toast={toast} back={back} />}
          {view === 'terms' && <TermsView />}
          {view === 'about' && <AboutView toast={toast} />}
        </div>

        {toastMsg && (
          <div role="status" className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-5">
            <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg">{toastMsg}</span>
          </div>
        )}

        {discard && (
          <div role="alertdialog" aria-label="Discard changes" className="absolute inset-0 z-10 grid place-items-center bg-black/70 px-6">
            <div className="w-full rounded-2xl border border-white/10 bg-[#181818] p-5 text-center shadow-2xl">
              <p className="text-sm font-bold">Discard your changes?</p>
              <p className="mt-1 text-xs text-white/50">You have edits that are not saved yet.</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => { pendingRef.current = null; setDiscard(false) }} className={`${ghostBtn} flex-1`}>Keep editing</button>
                <button type="button" onClick={() => { dirtyRef.current = false; setDiscard(false); const fn = pendingRef.current; pendingRef.current = null; fn?.() }}
                  className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition hover:brightness-110">Discard</button>
              </div>
            </div>
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
