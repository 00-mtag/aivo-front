import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Check } from 'lucide-react'
import WheelPicker from '../components/onboarding/WheelPicker'
import { saveProfile } from '../lib/profile'

const GENDERS = ['Male', 'Female', 'Prefer not to say']
const GOALS = ['Lose weight', 'Build muscle', 'Improve endurance', 'Maintain fitness']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 88 }, (_, i) => THIS_YEAR - 100 + i)   // oldest to youngest (13+)
const INCHES = Array.from({ length: 48 }, (_, i) => 48 + i)      // 4 ft 0 in to 7 ft 11 in
const CMS = Array.from({ length: 151 }, (_, i) => 100 + i)       // 100 to 250 cm
const KGS = Array.from({ length: 331 }, (_, i) => 20 + i)        // 20 to 350 kg
const LBS = Array.from({ length: 729 }, (_, i) => 44 + i)        // 44 to 772 lb
const LB_PER_KG = 2.20462
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const pad = (n) => String(n).padStart(2, '0')
const fmtIn = (n) => `${Math.floor(n / 12)} ft ${n % 12} in`

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

  const finish = () => {
    saveProfile({
      gender, goal, experience: level,
      birthDate: `${birth.y}-${pad(birth.m + 1)}-${pad(birth.d)}`,
      heightCm, weightKg: Math.round(weightKg * 10) / 10,
      completedAt: new Date().toISOString(),
    })
    navigate('/app', { replace: true })
  }

  const colLabel = 'mb-1.5 text-center text-[10px] tracking-wider text-mute'

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-ink">
      <div className="mx-auto max-w-xl px-5 py-6">
        <header className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-lg font-bold"><Activity size={20} className="text-gold" />AIVO</p>
          {step === 1
            ? <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold">Profile setup</span>
            : <span className="text-[11px] tracking-wide text-mute">GETTING STARTED</span>}
        </header>

        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-gold' : 'bg-white/15'}`} />)}
        </div>
        <p className="mt-3 text-[10px] font-semibold tracking-wide text-gold">STEP {step + 1} OF 3</p>

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
            <Nav onBack={() => setStep(1)} onNext={finish} nextLabel="Finish setup" disabled={!goal} last />
          </section>
        )}
      </div>
    </div>
  )
}
