import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import Modal, { Field, fieldClass, ghostBtn, goldBtn } from '../workouts/Modal'
import { macrosFor } from '../../lib/nutrition'
import { uid } from '../../lib/workouts'

export function Stepper({ value, onChange, min = 0.5, max = 20, step = 0.5 }) {
  const btn = 'grid h-8 w-8 place-items-center rounded-full border border-white/20 transition hover:bg-white/10 disabled:opacity-30'
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Less" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className={btn}><Minus size={14} /></button>
      <span className="w-9 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="More" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} className={btn}><Plus size={14} /></button>
    </div>
  )
}

const perServing = (food) => `${food.serving_size} ${food.serving_unit} · ${Math.round(food.calories)} kcal · P ${food.protein} C ${food.carbohydrates} F ${food.fat}`

function CustomFood({ foods, onSave, onBack }) {
  const [f, setF] = useState({ name: '', serving_size: '1', serving_unit: 'serving', calories: '', protein: '', carbohydrates: '', fat: '' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dupe = foods.some((x) => x.name.toLowerCase() === f.name.trim().toLowerCase())
  const ok = f.name.trim() && f.calories !== '' && !dupe && !busy
  const submit = async (e) => {
    e.preventDefault()
    if (!ok) return
    const n = (v) => Math.max(0, Number(v) || 0)
    setBusy(true); setError('')
    try {
      await onSave({ food_id: `custom_${uid()}`, uploaded_by: 'me', name: f.name.trim(), description: '', calories: n(f.calories), protein: n(f.protein), carbohydrates: n(f.carbohydrates), fat: n(f.fat), serving_size: f.serving_size.trim() || '1', serving_unit: f.serving_unit.trim() || 'serving' })
    } catch (err) {
      setError(err.message || 'Could not save this food.')
      setBusy(false)
    }
  }
  const num = (k, label) => <Field label={label}><input type="number" min="0" step="0.1" value={f[k]} onChange={set(k)} className={fieldClass} /></Field>
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Food name"><input autoFocus value={f.name} onChange={set('name')} maxLength={50} placeholder="e.g. Chicken adobo" className={fieldClass} /></Field>
      {dupe && <p className="text-xs text-danger">A food with this name already exists.</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Serving size"><input value={f.serving_size} onChange={set('serving_size')} maxLength={10} className={fieldClass} /></Field>
        <Field label="Unit"><input value={f.serving_unit} onChange={set('serving_unit')} maxLength={15} placeholder="g, cup, piece" className={fieldClass} /></Field>
      </div>
      <p className="-mb-1 text-[11px] text-mute">Nutrition values for one serving:</p>
      <div className="grid grid-cols-2 gap-3">{num('calories', 'Calories (kcal)')}{num('protein', 'Protein (g)')}{num('carbohydrates', 'Carbs (g)')}{num('fat', 'Fat (g)')}</div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onBack} className={ghostBtn}>Back</button>
        <button type="submit" disabled={!ok} className={goldBtn}>{busy ? 'Saving...' : 'Save food'}</button>
      </div>
    </form>
  )
}

export default function AddFoodModal({ mealType, foods, onAdd, onCreate, onClose }) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState(null)
  const [qty, setQty] = useState(1)
  const [creating, setCreating] = useState(false)
  const list = foods.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase()))

  if (creating) {
    return (
      <Modal title="Create custom food" onClose={onClose}>
        <CustomFood foods={foods} onBack={() => setCreating(false)} onSave={async (food) => { const created = await onCreate(food); setPicked(created); setQty(1); setCreating(false) }} />
      </Modal>
    )
  }
  if (picked) {
    const m = macrosFor(picked, qty)
    return (
      <Modal title={`Add to ${mealType}`} onClose={onClose}>
        <p className="text-lg font-bold">{picked.name}</p>
        <p className="text-xs text-mute">Per serving: {perServing(picked)}</p>
        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4">
          <div><p className="text-xs text-mute">Servings</p><p className="text-[11px] text-mute">{qty} × {picked.serving_size} {picked.serving_unit}</p></div>
          <Stepper value={qty} onChange={setQty} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[['kcal', m.calories], ['Protein', m.protein], ['Carbs', m.carbohydrates], ['Fat', m.fat]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/10 bg-black/20 py-2"><p className="text-sm font-bold text-gold">{Math.round(v * 10) / 10}</p><p className="text-[10px] text-mute">{k}</p></div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setPicked(null)} className={ghostBtn}>Back</button>
          <button type="button" onClick={() => onAdd(picked, qty)} className={goldBtn}>Add to {mealType}</button>
        </div>
      </Modal>
    )
  }
  return (
    <Modal title={`Add food to ${mealType}`} onClose={onClose}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods..." className={fieldClass} />
      <ul className="mt-3 max-h-72 divide-y divide-white/10 overflow-y-auto rounded-xl border border-white/10">
        {list.map((food) => (
          <li key={food.food_id}>
            <button type="button" onClick={() => { setPicked(food); setQty(1) }} className="block w-full px-3 py-2.5 text-left transition hover:bg-white/5">
              <span className="block text-sm font-semibold">{food.name}</span>
              <span className="block text-[11px] text-mute">{perServing(food)}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="p-4 text-center text-sm text-mute">No food found.</li>}
      </ul>
      <button type="button" onClick={() => setCreating(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
        <Plus size={16} /> Create custom food
      </button>
      <p className="mt-2 text-[11px] text-mute">Values are typical estimates and can vary by brand and cooking method.</p>
    </Modal>
  )
}
