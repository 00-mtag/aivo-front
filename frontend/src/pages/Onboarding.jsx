import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Armchair, ArrowRight, Bike, Camera, Check, ChevronLeft, Clock, Dumbbell, Flame, Footprints, HeartPulse, Loader2, MousePointerClick, Scale, ShieldCheck, Sprout, TrendingDown, Trophy, User, Zap } from 'lucide-react'
import WheelPicker from '../components/onboarding/WheelPicker'
import { BmiMeter, Chip, OptionCard, Screen, Segmented, bmiBand } from '../components/onboarding/parts'
import logo from '../assets/logo.png'
import { api, errorsFrom } from '../lib/api'
import { calculateTdee, saveProfile } from '../lib/profile'
import { recommend } from '../lib/recommend'
import { logWeight, setTargets } from '../lib/progress'

/* ---------- choices (values are sent to the backend, keep them as they are) ---------- */
const GENDERS = [
  { value: 'Male', glyph: '♂', desc: null },
  { value: 'Female', glyph: '♀', desc: null },
  { value: 'Prefer not to say', icon: User, desc: null },
]
const GOALS = [
  { value: 'Lose weight', icon: TrendingDown, desc: 'Burn fat with a small calorie deficit' },
  { value: 'Build muscle', icon: Dumbbell, desc: 'Get stronger and add lean mass' },
  { value: 'Improve endurance', icon: HeartPulse, desc: 'Train longer without getting tired' },
  { value: 'Maintain fitness', icon: Scale, desc: 'Stay active and keep your current shape' },
]
const LEVELS = [
  { value: 'Beginner', icon: Sprout, desc: 'New to training, or getting back into it' },
  { value: 'Intermediate', icon: Flame, desc: 'You train regularly and know the basics' },
  { value: 'Advanced', icon: Trophy, desc: 'Years of consistent, structured training' },
]
const ACTIVITY = [
  { value: 'Sedentary', icon: Armchair, desc: 'Desk job, little or no exercise' },
  { value: 'Lightly active', icon: Footprints, desc: 'Light exercise 1 to 3 days a week' },
  { value: 'Moderately active', icon: Bike, desc: 'Exercise 3 to 5 days a week' },
  { value: 'Very active', icon: Activity, desc: 'Hard exercise 6 to 7 days a week' },
  { value: 'Extra active', icon: Zap, desc: 'Physical job, or training twice a day' },
]
const ALLERGIES = ['Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Fish', 'Shellfish', 'Wheat', 'Soybeans', 'Sesame']
const DIETS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Keto', 'Low carb', 'Gluten-free', 'Dairy-free', 'High protein']
const HEALTH_CONDITIONS = [
  'High Blood Pressure (Hypertension)',
  'Poor Heart Blood Flow (Coronary Artery Disease)',
  'Irregular Heartbeat (Arrhythmia)',
  'Diabetes / Pre-Diabetes',
  'Low Iron (Anemia)',
  'Overactive Thyroid',
  'Chronic Asthma',
  'Joint Wear & Tear (Arthritis)',
]
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* ---------- picker ranges ---------- */
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const THIS_YEAR = new Date().getFullYear()
const YEARS = range(THIS_YEAR - 100, THIS_YEAR - 13)      // oldest to youngest (13+)
const INCHES = range(48, 95)                              // 4 ft 0 in to 7 ft 11 in
const CMS = range(100, 250)
const KG_MIN = 30, LB_MIN = 66
const KGS = range(KG_MIN, 250)
const LBS = range(LB_MIN, 551)
const LB_PER_KG = 2.20462
const TOTAL = 10   // number of question screens

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const pad = (n) => String(n).padStart(2, '0')
const fmtIn = (n) => `${Math.floor(n / 12)} ft ${n % 12} in`
const wIdx = (valueKg, unit) => (unit === 'kg'
  ? clamp(Math.round(valueKg) - KG_MIN, 0, KGS.length - 1)
  : clamp(Math.round(valueKg * LB_PER_KG) - LB_MIN, 0, LBS.length - 1))
const wFromIdx = (i, unit) => (unit === 'kg' ? KG_MIN + i : (LB_MIN + i) / LB_PER_KG)
const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
const inputClass = 'w-full rounded-xl border border-white/10 bg-card px-4 py-3.5 text-base text-ink outline-none transition focus:border-gold'

const ANIMATION_CSS = `
@keyframes ob-fwd { from { opacity: 0; transform: translateX(28px) } to { opacity: 1; transform: none } }
@keyframes ob-back { from { opacity: 0; transform: translateX(-28px) } to { opacity: 1; transform: none } }
.ob-fwd { animation: ob-fwd .28s ease both }
.ob-back { animation: ob-back .28s ease both }
@media (prefers-reduced-motion: reduce) { .ob-fwd, .ob-back { animation: none } }`

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)   // 0 = welcome, 1..10 = questions
  const dir = useRef(1)
  const timer = useRef(null)
  const scroller = useRef(null)
  const fileRef = useRef(null)

  const [gender, setGender] = useState('')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('Beginner')
  const [activityLevel, setActivityLevel] = useState('')
  const [birth, setBirth] = useState({ m: 5, d: 15, y: 2004 })
  const [heightCm, setHeightCm] = useState(170)
  const [heightUnit, setHeightUnit] = useState('ftin')
  const [weightKg, setWeightKg] = useState(70)
  const [weightUnit, setWeightUnit] = useState('kg')
  const [targetWeightKg, setTargetWeightKg] = useState('')   // '' = not set
  const [allergies, setAllergies] = useState([])
  const [otherAllergy, setOtherAllergy] = useState('')
  const [allergyOther, setAllergyOther] = useState(false)
  const [diets, setDiets] = useState([])
  const [healthConditions, setHealthConditions] = useState([])
  const [otherCondition, setOtherCondition] = useState('')
  const [conditionOther, setConditionOther] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [pictureError, setPictureError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  /* ---------- navigation ---------- */
  const go = (n) => { dir.current = n > step ? 1 : -1; setStep(n) }
  // Single-choice screens move on by themselves a moment after you tap.
  const advanceFrom = (from) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { dir.current = 1; setStep((s) => (s === from ? from + 1 : s)) }, 320)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { scroller.current?.scrollTo?.({ top: 0 }) }, [step])
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  /* ---------- derived values ---------- */
  const daysInMonth = new Date(birth.y, birth.m + 1, 0).getDate()
  const days = range(1, daysInMonth)
  const setPart = (part) => (i) => setBirth((b) => {
    const next = { ...b, [part]: part === 'm' ? i : part === 'd' ? i + 1 : YEARS[i] }
    next.d = Math.min(next.d, new Date(next.y, next.m + 1, 0).getDate())
    return next
  })
  const birthDate = `${birth.y}-${pad(birth.m + 1)}-${pad(birth.d)}`
  const age = new Date().getFullYear() - birth.y - (new Date() < new Date(birth.y, birth.m, birth.d) ? 1 : 0)

  const cm = heightUnit === 'cm'
  const heightIdx = cm ? clamp(heightCm - 100, 0, CMS.length - 1) : clamp(Math.round(heightCm / 2.54) - 48, 0, INCHES.length - 1)
  const setHeightIdx = (i) => setHeightCm(cm ? 100 + i : Math.round((48 + i) * 2.54))

  const kg = weightUnit === 'kg'
  const weightList = kg ? KGS : LBS
  const bmi = weightKg / (heightCm / 100) ** 2
  const tdee = calculateTdee({ gender, age, heightCm, weightKg, activityLevel })

  const target = targetWeightKg === '' ? null : Number(targetWeightKg)
  const diffKg = target == null ? 0 : target - weightKg
  const diffShown = Math.round((kg ? Math.abs(diffKg) : Math.abs(diffKg) * LB_PER_KG) * 10) / 10
  const weeks = Math.ceil(Math.abs(diffKg) / 0.5)
  const targetBmi = target == null ? null : target / (heightCm / 100) ** 2
  const quick = kg ? [-10, -5, 5, 10] : [-20, -10, 10, 20]
  const setTargetBy = (delta) => setTargetWeightKg(clamp((weightKg + (kg ? delta : delta / LB_PER_KG)), KG_MIN, 250))

  /* ---------- profile photo ---------- */
  const setPicture = (event) => {
    const file = event.target.files?.[0] ?? null
    setPictureError('')
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setPictureError('Choose a JPG, PNG, or WebP image up to 5 MB.')
      event.target.value = ''
      setProfilePicture(null)
      setPhotoUrl('')
      return
    }
    setProfilePicture(file)
    setPhotoUrl(file ? URL.createObjectURL(file) : '')
  }
  const removePicture = () => { setProfilePicture(null); setPhotoUrl(''); setPictureError(''); if (fileRef.current) fileRef.current.value = '' }

  /* ---------- save ---------- */
  const finish = async () => {
    setSaving(true)
    setSaveError('')
    const profile = {
      gender,
      goal,
      experience: level,
      birthDate,
      heightCm,
      weightKg: Math.round(weightKg * 10) / 10,
      phoneNumber: phoneNumber.trim(),
      activityLevel,
      tdee,
      targetWeightKg: target == null ? null : Math.round(target * 10) / 10,
      allergies: [...allergies, ...(allergyOther && otherAllergy.trim() ? [otherAllergy.trim()] : [])],
      healthConditions: [...healthConditions, ...(conditionOther && otherCondition.trim() ? [otherCondition.trim()] : [])],
      dietaryPreferences: diets.join(', '),
      completedAt: new Date().toISOString(),
    }
    const form = new FormData()
    Object.entries({
      age,
      gender,
      phone_number: profile.phoneNumber,
      birth_date: birthDate,
      height: heightCm,
      weight: profile.weightKg,
      activity_level: activityLevel,
      fitness_goal: goal,
      experience_level: level,
      target_weight: profile.targetWeightKg ?? '',
      dietary_preferences: profile.dietaryPreferences,
    }).forEach(([key, value]) => form.append(key, String(value)))
    form.append('allergies_present', '1')
    form.append('health_conditions_present', '1')
    profile.allergies.forEach((value) => form.append('allergies[]', value))
    profile.healthConditions.forEach((value) => form.append('health_conditions[]', value))
    if (profilePicture) form.append('profile_picture', profilePicture)
    form.append('_method', 'PUT')

    try {
      const { data } = await api.post('/profile', form)
      const saved = { ...profile, tdee: Number(data.profile.tdee) }
      saveProfile(saved)
      try {
        // Progress: starting weight and daily targets. Never block finishing setup.
        const rec = recommend(saved)
        setTargets({ calories: rec?.calories, protein: rec?.protein })
        logWeight(saved.weightKg)
      } catch { /* progress is optional */ }
      navigate('/app', { replace: true })
    } catch (error) {
      const { fields, form: message } = errorsFrom(error)
      setSaveError(Object.values(fields)[0] || message)
    } finally {
      setSaving(false)
    }
  }

  /* ---------- footer button ---------- */
  const optionalEmpty = (step === 7 && target == null)
    || (step === 8 && !allergies.length && !allergyOther && !diets.length)
    || (step === 9 && !healthConditions.length && !conditionOther)
  const canNext = (step !== 1 || gender) && (step !== 2 || goal) && (step !== 4 || activityLevel)
  const last = step === TOTAL
  const next = () => { if (last) finish(); else go(step + 1) }
  const label = step === 0 ? 'Get started' : last ? (saving ? 'Saving...' : 'Finish setup') : optionalEmpty ? 'Skip for now' : 'Continue'
  const disabled = !canNext || saving || (last && (!activityLevel || Boolean(pictureError)))

  const wheelCol = 'mb-2 flex h-8 items-center justify-between'
  const picked = 'mt-3 text-center text-sm text-mute'

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-ink sm:flex sm:items-center sm:justify-center sm:p-6">
      <style>{ANIMATION_CSS}</style>
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden sm:h-[50rem] sm:min-h-0 sm:rounded-[2rem] sm:border sm:border-white/10 sm:bg-[#121212] sm:shadow-2xl" style={{ maxHeight: '100dvh' }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56" style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(245,184,46,.10), transparent)' }} />

        {/* top bar */}
        {step > 0 && (
          <header className="relative flex items-center gap-4 px-5 pt-5">
            <button type="button" onClick={() => go(step - 1)} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 transition hover:bg-white/10"><ChevronLeft size={22} /></button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label="Setup progress">
              <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${(step / TOTAL) * 100}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold text-mute">{step}/{TOTAL}</span>
          </header>
        )}

        {/* screen */}
        <div ref={scroller} className="relative flex-1 overflow-y-auto px-5 pb-6 pt-6">
          <div key={step} className={dir.current === 1 ? 'ob-fwd' : 'ob-back'}>

            {step === 0 && (
              <div className="flex min-h-[60vh] flex-col justify-center sm:min-h-[34rem]">
                <p className="flex items-center gap-2 text-lg font-bold"><img src={logo} alt="" className="h-9 w-auto" />AIVO</p>
                <Screen title="Let's build your plan." subtitle="Answer a few quick questions and AIVO will set up workouts and meals made for you.">
                  <ul className="space-y-4">
                    {[
                      [Clock, 'About 2 minutes', 'Ten quick screens, one question each.'],
                      [MousePointerClick, 'Just tap to choose', 'Almost no typing. Scroll or tap your answers.'],
                      [ShieldCheck, 'Private and flexible', 'You can change any answer later.'],
                    ].map(([Icon, title, text]) => (
                      <li key={title} className="flex items-center gap-4">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Icon size={22} /></span>
                        <span><span className="block text-[15px] font-semibold">{title}</span><span className="block text-xs text-mute">{text}</span></span>
                      </li>
                    ))}
                  </ul>
                </Screen>
              </div>
            )}

            {step === 1 && (
              <Screen title="What's your gender?" subtitle="We use this to estimate how many calories you need.">
                <div role="radiogroup" aria-label="Gender" className="space-y-3">
                  {GENDERS.map((g) => <OptionCard key={g.value} glyph={g.glyph} icon={g.icon} title={g.value} selected={gender === g.value}
                    onClick={() => { setGender(g.value); advanceFrom(1) }} />)}
                </div>
              </Screen>
            )}

            {step === 2 && (
              <Screen title="What's your main goal?" subtitle="Pick the one that matters most right now.">
                <div role="radiogroup" aria-label="Goal" className="space-y-3">
                  {GOALS.map((g) => <OptionCard key={g.value} icon={g.icon} title={g.value} desc={g.desc} selected={goal === g.value}
                    onClick={() => { setGoal(g.value); advanceFrom(2) }} />)}
                </div>
              </Screen>
            )}

            {step === 3 && (
              <Screen title="How experienced are you?" subtitle="This decides how hard your first workouts will be.">
                <div role="radiogroup" aria-label="Experience" className="space-y-3">
                  {LEVELS.map((l) => <OptionCard key={l.value} icon={l.icon} title={l.value} desc={l.desc} selected={level === l.value} onClick={() => setLevel(l.value)} />)}
                </div>
              </Screen>
            )}

            {step === 4 && (
              <Screen title="How active are you day to day?" subtitle="Think about a normal week, not just your workouts.">
                <div role="radiogroup" aria-label="Activity level" className="space-y-3">
                  {ACTIVITY.map((a) => <OptionCard key={a.value} icon={a.icon} title={a.value} desc={a.desc} selected={activityLevel === a.value} onClick={() => setActivityLevel(a.value)} />)}
                </div>
              </Screen>
            )}

            {step === 5 && (
              <Screen title="When were you born?" subtitle="Scroll or tap to choose.">
                <div className="grid grid-cols-[1.5fr_1fr_1.1fr] gap-3">
                  <div><p className="mb-2 text-center text-[11px] font-semibold tracking-wider text-mute">MONTH</p><WheelPicker label="Month" options={MONTHS} index={birth.m} onChange={setPart('m')} /></div>
                  <div><p className="mb-2 text-center text-[11px] font-semibold tracking-wider text-mute">DAY</p><WheelPicker label="Day" options={days} index={birth.d - 1} onChange={setPart('d')} /></div>
                  <div><p className="mb-2 text-center text-[11px] font-semibold tracking-wider text-mute">YEAR</p><WheelPicker label="Year" options={YEARS} index={YEARS.indexOf(birth.y)} onChange={setPart('y')} /></div>
                </div>
                <p className={picked}>{MONTHS[birth.m]} {birth.d}, {birth.y} <span className="text-gold">· {age} years old</span></p>
              </Screen>
            )}

            {step === 6 && (
              <Screen title="Your height and weight" subtitle="Scroll or tap a number. You can switch units anytime.">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className={wheelCol}><h2 className="text-sm font-bold">Height</h2><Segmented label="Height unit" options={[['ftin', 'ft/in'], ['cm', 'cm']]} value={heightUnit} onChange={setHeightUnit} /></div>
                    <WheelPicker label="Height" options={cm ? CMS : INCHES} index={heightIdx} onChange={setHeightIdx} format={(n) => (cm ? `${n} cm` : fmtIn(n))} />
                  </div>
                  <div>
                    <div className={wheelCol}><h2 className="text-sm font-bold">Weight</h2><Segmented label="Weight unit" options={[['kg', 'kg'], ['lb', 'lb']]} value={weightUnit} onChange={setWeightUnit} /></div>
                    <WheelPicker label="Weight" options={weightList} index={wIdx(weightKg, weightUnit)} onChange={(i) => setWeightKg(wFromIdx(i, weightUnit))}
                      format={(n) => `${n} ${weightUnit}`}
                      renderSelected={(n) => <><span>{n}</span><span className="text-xs font-semibold text-gold">{weightUnit}</span></>} />
                  </div>
                </div>
                <div className="mt-5"><BmiMeter bmi={bmi} /></div>
              </Screen>
            )}

            {step === 7 && (
              <Screen title="Do you have a target weight?" subtitle="Optional. Tap a quick pick, scroll to a number, or skip.">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-mute">Now: <span className="font-semibold text-ink">{kg ? `${Math.round(weightKg)} kg` : `${Math.round(weightKg * LB_PER_KG)} lb`}</span></p>
                  <Segmented label="Weight unit" options={[['kg', 'kg'], ['lb', 'lb']]} value={weightUnit} onChange={setWeightUnit} />
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {quick.map((d) => (
                    <Chip key={d} active={target != null && Math.abs(diffKg - (kg ? d : d / LB_PER_KG)) < 0.3} onClick={() => setTargetBy(d)}>{d > 0 ? `+${d}` : d} {weightUnit}</Chip>
                  ))}
                  <Chip active={target != null && Math.abs(diffKg) < 0.3} onClick={() => setTargetWeightKg(weightKg)}>Stay the same</Chip>
                </div>
                <WheelPicker big label="Target weight" options={weightList} index={wIdx(target ?? weightKg, weightUnit)} onChange={(i) => setTargetWeightKg(wFromIdx(i, weightUnit))}
                  format={(n) => `${n} ${weightUnit}`}
                  renderSelected={(n) => <><span>{n}</span><span className="text-xs font-semibold text-gold">{weightUnit}</span></>} />
                <div className="mt-4 min-h-[3.5rem] text-center text-sm" aria-live="polite">
                  {target == null && <p className="text-mute">No target yet. You can set one later.</p>}
                  {target != null && Math.abs(diffKg) < 0.5 && <p className="text-ink/90">You'll aim to stay at your current weight.</p>}
                  {target != null && Math.abs(diffKg) >= 0.5 && (
                    <p className="text-ink/90"><span className="font-semibold text-gold">{diffShown} {weightUnit}</span> to {diffKg < 0 ? 'lose' : 'gain'}. About {weeks} weeks at a steady, healthy pace.</p>
                  )}
                  {targetBmi != null && targetBmi < 18.5 && <p className="mt-1 text-xs text-amber-400">This target is below a healthy BMI. A higher number is safer.</p>}
                  {target != null && goal === 'Lose weight' && diffKg > 0.5 && <p className="mt-1 text-xs text-amber-400">Your goal is to lose weight, but this target is higher than now.</p>}
                </div>
              </Screen>
            )}

            {step === 8 && (
              <Screen title="Any food allergies or diet?" subtitle="Optional. Tap everything that applies, or skip.">
                <h2 className="mb-2.5 text-sm font-bold">Food allergies</h2>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIES.map((a) => <Chip key={a} active={allergies.includes(a)} onClick={() => setAllergies((l) => toggleIn(l, a))}>{a}</Chip>)}
                  <Chip active={allergyOther} onClick={() => setAllergyOther((v) => !v)}>Other</Chip>
                </div>
                {allergyOther && <input value={otherAllergy} onChange={(e) => setOtherAllergy(e.target.value)} maxLength={255} aria-label="Other allergy" placeholder="Type your allergy" className={`${inputClass} mt-3`} />}
                <h2 className="mb-2.5 mt-7 text-sm font-bold">Eating style</h2>
                <div className="flex flex-wrap gap-2">
                  {DIETS.map((d) => <Chip key={d} active={diets.includes(d)} onClick={() => setDiets((l) => toggleIn(l, d))}>{d}</Chip>)}
                </div>
              </Screen>
            )}

            {step === 9 && (
              <Screen title="Any health conditions?" subtitle="Optional. This helps keep your plan safe. Tap all that apply, or skip.">
                <div role="group" aria-label="Health conditions" className="space-y-2.5">
                  {HEALTH_CONDITIONS.map((c) => <OptionCard key={c} multi title={c} selected={healthConditions.includes(c)} onClick={() => setHealthConditions((l) => toggleIn(l, c))} />)}
                  <OptionCard multi title="Other" selected={conditionOther} onClick={() => setConditionOther((v) => !v)} />
                </div>
                {conditionOther && <input value={otherCondition} onChange={(e) => setOtherCondition(e.target.value)} maxLength={255} aria-label="Other health condition" placeholder="Type your condition" className={`${inputClass} mt-3`} />}
                <p className="mt-4 text-xs text-mute">AIVO gives general guidance, not medical advice. Check with your doctor before starting a new program.</p>
              </Screen>
            )}

            {step === 10 && (
              <Screen title="Almost done!" subtitle="Add a photo and phone number if you like. Both are optional.">
                <div className="flex flex-col items-center">
                  <button type="button" onClick={() => fileRef.current?.click()} aria-label={photoUrl ? 'Change profile photo' : 'Add profile photo'}
                    className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border-2 border-dashed border-gold/50 bg-card transition hover:border-gold">
                    {photoUrl ? <img src={photoUrl} alt="Your profile" className="h-full w-full object-cover" /> : <User size={44} className="text-mute" />}
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1.5 text-[11px] font-semibold text-gold"><Camera size={12} />{photoUrl ? 'Change' : 'Add photo'}</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={setPicture} className="hidden" aria-label="Profile picture" />
                  {photoUrl && <button type="button" onClick={removePicture} className="mt-2 text-xs text-mute underline hover:text-ink">Remove photo</button>}
                  {pictureError && <p role="alert" className="mt-2 text-xs text-danger">{pictureError}</p>}
                </div>

                <label className="mt-6 block space-y-1.5 text-sm font-semibold">
                  Phone number <span className="font-normal text-mute">(optional)</span>
                  <input type="tel" inputMode="tel" autoComplete="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} maxLength={255} className={inputClass} />
                </label>

                <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-4">
                  <p className="text-sm font-bold text-gold">Your starting point</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    {[
                      ['Goal', goal],
                      ['Experience', level],
                      ['Activity', activityLevel],
                      ['Weight', `${kg ? `${Math.round(weightKg)} kg` : `${Math.round(weightKg * LB_PER_KG)} lb`}${target != null ? ` to ${kg ? `${Math.round(target)} kg` : `${Math.round(target * LB_PER_KG)} lb`}` : ''}`],
                      ['Body type (BMI)', `${bmi.toFixed(1)} · ${bmiBand(bmi).label}`],
                      ['Daily energy needs', tdee == null ? '--' : `${tdee.toLocaleString()} kcal`],
                    ].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-mute">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
                  </dl>
                </div>
                {saveError && <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{saveError}</p>}
              </Screen>
            )}
          </div>
        </div>

        {/* bottom action bar */}
        <footer className="relative border-t border-white/10 bg-[#0f0f0f]/90 px-5 pt-4 backdrop-blur" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={next} disabled={disabled}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-mute ${optionalEmpty ? 'border border-white/20 bg-transparent text-ink hover:bg-white/5' : 'bg-gold text-black hover:brightness-110'}`}>
            {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            {label}
            {!saving && (last ? <Check size={18} /> : <ArrowRight size={18} />)}
          </button>
        </footer>
      </div>
    </div>
  )
}
