import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import WheelPicker from '../components/onboarding/WheelPicker'
import logo from '../assets/logo.png'
import { api, errorsFrom } from '../lib/api'
import { calculateTdee, saveProfile } from '../lib/profile'

const GENDERS = ['Male', 'Female', 'Prefer not to say']
const GOALS = ['Lose weight', 'Build muscle', 'Improve endurance', 'Maintain fitness']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const ALLERGIES = ['Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Fish', 'Shellfish', 'Wheat', 'Soybeans', 'Sesame']
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

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 88 }, (_, i) => THIS_YEAR - 100 + i)   // oldest to youngest (13+)
const INCHES = Array.from({ length: 48 }, (_, i) => 48 + i)      // 4 ft 0 in to 7 ft 11 in
const CMS = Array.from({ length: 151 }, (_, i) => 100 + i)       // 100 to 250 cm
const KGS = Array.from({ length: 331 }, (_, i) => 20 + i)        // 20 to 350 kg
const LBS = Array.from({ length: 729 }, (_, i) => 44 + i)        // 44 to 772 lb
const LB_PER_KG = 2.20462
const ACTIVITY_LEVELS = ['Sedentary', 'Lightly active', 'Moderately active', 'Very active', 'Extra active']
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const pad = (n) => String(n).padStart(2, '0')
const fmtIn = (n) => `${Math.floor(n / 12)} ft ${n % 12} in`
const inputClass = 'w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-ink outline-none transition focus:border-gold'

function Option({ selected, onClick, children }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left text-sm transition ${selected ? 'border-gold bg-gold/15' : 'border-white/10 bg-card hover:border-white/30'}`}>
      {selected
        ? <span className="grid h-4 w-4 place-items-center rounded-full border border-gold text-gold"><Check size={10} strokeWidth={3} /></span>
        : <span className="h-4 w-4 rounded-full bg-mute/80" />}
      {children}
    </button>
  )
}

function MultiChoice({ label, options, selected, onToggle, otherSelected, onToggleOther, otherValue, onOtherChange }) {
  const choiceClass = (active) => `rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${active ? 'border-gold bg-gold/15 text-ink' : 'border-white/10 bg-card text-mute hover:border-white/30 hover:text-ink'}`

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label} <span className="font-normal text-mute">(optional, select all that apply)</span></legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button key={option} type="button" aria-pressed={selected.includes(option)} onClick={() => onToggle(option)}
            className={choiceClass(selected.includes(option))}>{option}</button>
        ))}
        <button type="button" aria-pressed={otherSelected} onClick={onToggleOther} className={choiceClass(otherSelected)}>Others</button>
      </div>
      {otherSelected && (
        <input value={otherValue} onChange={(event) => onOtherChange(event.target.value)} maxLength={255}
          aria-label={`Other ${label.toLowerCase()}`} placeholder={`Enter other ${label.toLowerCase()}`}
          className={`${inputClass} mt-2`} />
      )}
    </fieldset>
  )
}

function Toggle({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-full px-3 py-1.5 transition ${value === id ? 'bg-white/10 font-semibold text-ink' : 'text-mute hover:text-ink'}`}>{label}</button>
      ))}
    </div>
  )
}

const Nav = ({ onBack, onNext, nextLabel = 'Continue', disabled, last }) => (
  <div className="mt-8 flex gap-3">
    {onBack && <button type="button" onClick={onBack} className="flex-1 rounded-full border border-white/20 py-3 text-sm font-semibold transition hover:bg-white/5">Back</button>}
    <button type="button" onClick={onNext} disabled={disabled} className="flex flex-[1.4] items-center justify-center gap-2 rounded-full bg-gold py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-mute">
      {nextLabel}{!last && <ArrowRight size={15} />}
    </button>
  </div>
)

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState('')
  const [birth, setBirth] = useState({ m: 5, d: 15, y: 2004 })
  const [heightCm, setHeightCm] = useState(170)
  const [heightUnit, setHeightUnit] = useState('ftin')
  const [weightKg, setWeightKg] = useState(70)
  const [weightUnit, setWeightUnit] = useState('kg')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('Beginner')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [targetWeightKg, setTargetWeightKg] = useState('')
  const [allergies, setAllergies] = useState([])
  const [otherAllergy, setOtherAllergy] = useState('')
  const [allergyOtherSelected, setAllergyOtherSelected] = useState(false)
  const [healthConditions, setHealthConditions] = useState([])
  const [otherCondition, setOtherCondition] = useState('')
  const [conditionOtherSelected, setConditionOtherSelected] = useState(false)
  const [dietaryPreferences, setDietaryPreferences] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [pictureError, setPictureError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const daysInMonth = new Date(birth.y, birth.m + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const setPart = (part) => (i) => setBirth((b) => {
    const next = { ...b, [part]: part === 'm' ? i : part === 'd' ? i + 1 : YEARS[i] }
    next.d = Math.min(next.d, new Date(next.y, next.m + 1, 0).getDate())
    return next
  })

  const cm = heightUnit === 'cm'
  const heightIdx = cm ? clamp(heightCm - 100, 0, 150) : clamp(Math.round(heightCm / 2.54) - 48, 0, 47)
  const setHeightIdx = (i) => setHeightCm(cm ? 100 + i : Math.round((48 + i) * 2.54))

  const kg = weightUnit === 'kg'
  const weightList = kg ? KGS : LBS
  const weightIdx = clamp(kg ? Math.round(weightKg) - 20 : Math.round(weightKg * LB_PER_KG) - 44, 0, weightList.length - 1)
  const setWeightIdx = (i) => {
    const c = clamp(i, 0, weightList.length - 1)
    setWeightKg(kg ? 20 + c : (44 + c) / LB_PER_KG)
  }
  const bmi = weightKg / (heightCm / 100) ** 2
  const toggleSelection = (setter) => (value) => setter((current) =>
    current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  )

  const birthDate = `${birth.y}-${pad(birth.m + 1)}-${pad(birth.d)}`
  const age = new Date().getFullYear() - birth.y
    - (new Date() < new Date(birth.y, birth.m, birth.d) ? 1 : 0)
  const tdee = calculateTdee({ gender, age, heightCm, weightKg, activityLevel })
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
      targetWeightKg: targetWeightKg === '' ? null : Math.round(Number(targetWeightKg) * 10) / 10,
      allergies: [...allergies, ...(allergyOtherSelected && otherAllergy.trim() ? [otherAllergy.trim()] : [])],
      healthConditions: [...healthConditions, ...(conditionOtherSelected && otherCondition.trim() ? [otherCondition.trim()] : [])],
      dietaryPreferences: dietaryPreferences.trim(),
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
      saveProfile({ ...profile, tdee: Number(data.profile.tdee) })
      navigate('/app', { replace: true })
    } catch (error) {
      const { fields, form: message } = errorsFrom(error)
      setSaveError(Object.values(fields)[0] || message)
    } finally {
      setSaving(false)
    }
  }

  const colLabel = 'mb-1.5 text-center text-[10px] tracking-wider text-mute'
  const setPicture = (event) => {
    const file = event.target.files?.[0] ?? null
    setPictureError('')
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setPictureError('Choose a JPG, PNG, or WebP image up to 5 MB.')
      event.target.value = ''
      setProfilePicture(null)
      return
    }
    setProfilePicture(file)
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-ink">
      <div className="mx-auto max-w-xl px-5 py-6">
        <header className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-lg font-bold"><img src={logo} alt="" className="h-7 w-auto" />AIVO</p>
          {step === 1
            ? <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold">Profile setup</span>
            : <span className="text-[11px] tracking-wide text-mute">GETTING STARTED</span>}
        </header>

        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-gold' : 'bg-white/15'}`} />)}
        </div>
        <p className="mt-3 text-[10px] font-semibold tracking-wide text-gold">STEP {step + 1} OF 4</p>

        {step === 0 && (
          <section>
            <h1 className="mt-3 text-3xl font-bold">Let's get to know you.</h1>
            <p className="mt-3 text-sm text-ink/80">First, let's start with some basic information about you.</p>
            <p className="mt-6 text-sm font-bold">What is your gender?</p>
            <div role="radiogroup" className="mt-3 space-y-3">
              {GENDERS.map((g) => <Option key={g} selected={gender === g} onClick={() => setGender(g)}>{g}</Option>)}
            </div>
            <Nav onNext={() => setStep(1)} disabled={!gender} />
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="mt-3 text-3xl font-bold">Let's get to know you.</h1>
            <p className="mt-2 text-sm text-ink/80">Scroll to select your details.</p>
            <hr className="my-5 border-white/10" />

            <h2 className="text-sm font-bold">Birthday</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div><p className={colLabel}>MONTH</p><WheelPicker label="Month" options={MONTHS} index={birth.m} onChange={setPart('m')} /></div>
              <div><p className={colLabel}>DAY</p><WheelPicker label="Day" options={days} index={birth.d - 1} onChange={setPart('d')} /></div>
              <div><p className={colLabel}>YEAR</p><WheelPicker label="Year" options={YEARS} index={YEARS.indexOf(birth.y)} onChange={setPart('y')} /></div>
            </div>
            <p className="mt-2 text-[11px] text-mute">Selected: {MONTHS[birth.m]} {birth.d}, {birth.y}</p>

            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-sm font-bold">Height</h2>
              <Toggle options={[['ftin', 'Feet / Inches'], ['cm', 'CM']]} value={heightUnit} onChange={setHeightUnit} />
            </div>
            <div className="mt-3">
              <WheelPicker big rows={5} label="Height" options={cm ? CMS : INCHES} index={heightIdx} onChange={setHeightIdx} format={(n) => (cm ? `${n} cm` : fmtIn(n))} />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-sm font-bold">Current weight</h2>
              <Toggle options={[['kg', 'kg'], ['lb', 'lb']]} value={weightUnit} onChange={setWeightUnit} />
            </div>
            <div className="mt-3">
              <WheelPicker big rows={5} label="Weight" options={weightList} index={weightIdx} onChange={setWeightIdx}
                format={(n) => `${n} ${weightUnit}`}
                renderSelected={(n) => <><span>{n}</span><span className="text-xs font-semibold text-gold">{weightUnit}</span></>} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-mute">Range: {weightList[0]}–{weightList[weightList.length - 1]} {weightUnit}</p>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setWeightIdx(weightIdx - 5)} className="rounded-full border border-white/20 px-4 py-1.5 hover:bg-white/5">− 5</button>
                <button type="button" onClick={() => setWeightIdx(weightIdx + 5)} className="rounded-full border border-white/20 px-4 py-1.5 hover:bg-white/5">+ 5</button>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-sm text-gold">Your estimated BMI</p>
              <p className="mt-1 text-2xl font-bold">{bmi.toFixed(1)}</p>
              <p className="mt-1 text-[11px] text-ink/80">Calculated using your selected height and weight in metric units.</p>
            </div>
            <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="mt-3 text-3xl font-bold">What is your goal?</h1>
            <p className="mt-3 text-sm text-ink/80">We'll use your preferences to personalize your plan.</p>
            <div role="radiogroup" className="mt-5 space-y-3">
              {GOALS.map((g) => <Option key={g} selected={goal === g} onClick={() => setGoal(g)}>{g}</Option>)}
            </div>
            <h2 className="mt-6 text-sm font-bold">Your fitness experience</h2>
            <div role="radiogroup" className="mt-3 grid grid-cols-3 gap-3">
              {LEVELS.map((l) => (
                <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)}
                  className={`rounded-xl border py-3 text-xs font-semibold transition ${level === l ? 'border-gold bg-gold/15' : 'border-white/10 bg-card hover:border-white/30'}`}>{l}</button>
              ))}
            </div>
            <label className="mt-6 block space-y-1.5 text-sm font-semibold">
              Activity level
              <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className={inputClass}>
                <option value="">Select your typical activity</option>
                {ACTIVITY_LEVELS.map((item) => <option key={item} value={item} className="bg-card">{item}</option>)}
              </select>
            </label>
            {tdee !== null && (
              <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-4">
                <p className="text-sm text-gold">Estimated daily energy needs (TDEE)</p>
                <p className="mt-1 text-2xl font-bold">{tdee.toLocaleString()} kcal/day</p>
                <p className="mt-1 text-[11px] text-ink/80">
                  Estimated using the Mifflin-St Jeor equation and your selected activity level.
                  {gender === 'Prefer not to say' && ' For gender-neutral estimation, the midpoint of the two BMR adjustments is used.'}
                </p>
              </div>
            )}
            <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!goal} />
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="mt-3 text-3xl font-bold">A few more details.</h1>
            <p className="mt-3 text-sm text-ink/80">These optional details help personalize your profile and recommendations. Your address is not collected.</p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5 text-sm font-semibold">
                Phone number <span className="font-normal text-mute">(optional)</span>
                <input type="tel" autoComplete="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} maxLength={255} className={inputClass} />
              </label>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="target-weight" className="text-sm font-semibold">Target weight <span className="font-normal text-mute">(optional)</span></label>
                  <Toggle options={[['kg', 'kg'], ['lb', 'lb']]} value={weightUnit} onChange={setWeightUnit} />
                </div>
                <input id="target-weight" type="number" min={kg ? 20 : 44} max={kg ? 350 : 772} step="0.1"
                  value={targetWeightKg === '' ? '' : kg ? targetWeightKg : Math.round(targetWeightKg * LB_PER_KG * 10) / 10}
                  onChange={(e) => setTargetWeightKg(e.target.value === '' ? '' : kg ? e.target.value : String(Number(e.target.value) / LB_PER_KG))}
                  className={inputClass} />
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-picture" className="block text-sm font-semibold">Profile picture <span className="font-normal text-mute">(optional, JPG/PNG/WebP up to 5 MB)</span></label>
                <input id="profile-picture" type="file" accept="image/jpeg,image/png,image/webp" onChange={setPicture}
                  className="block w-full text-sm text-mute file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink hover:file:bg-white/20" />
                {pictureError && <p role="alert" className="text-xs text-danger">{pictureError}</p>}
                {profilePicture && <p className="text-xs text-mute">Selected: {profilePicture.name}</p>}
              </div>

              <MultiChoice label="Food allergies" options={ALLERGIES} selected={allergies}
                onToggle={toggleSelection(setAllergies)} otherSelected={allergyOtherSelected}
                onToggleOther={() => setAllergyOtherSelected((selected) => !selected)}
                otherValue={otherAllergy} onOtherChange={setOtherAllergy} />
              <MultiChoice label="Health conditions" options={HEALTH_CONDITIONS} selected={healthConditions}
                onToggle={toggleSelection(setHealthConditions)} otherSelected={conditionOtherSelected}
                onToggleOther={() => setConditionOtherSelected((selected) => !selected)}
                otherValue={otherCondition} onOtherChange={setOtherCondition} />
              <label className="block space-y-1.5 text-sm font-semibold">
                Dietary preferences <span className="font-normal text-mute">(optional)</span>
                <textarea value={dietaryPreferences} onChange={(e) => setDietaryPreferences(e.target.value)} rows={2} className={inputClass} />
              </label>
            </div>

            {saveError && <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{saveError}</p>}
            <Nav onBack={() => setStep(2)} onNext={finish} nextLabel={saving ? 'Saving...' : 'Finish setup'} disabled={!activityLevel || saving || Boolean(pictureError)} last />
          </section>
        )}
      </div>
    </div>
  )
}
