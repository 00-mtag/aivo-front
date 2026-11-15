import { Check, HelpCircle, X } from 'lucide-react'
import { goldBtn } from './Modal'

// A short checklist for new users. It ticks itself off and goes away when all steps are done.
export default function GettingStarted({ steps, onHide, onShowGuide }) {
  const doneCount = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)
  return (
    <section aria-label="Getting started" className="rounded-2xl border border-gold/40 bg-gold/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Get started in 3 steps</h2>
          <p className="mt-0.5 text-xs text-mute">{doneCount} of {steps.length} done</p>
        </div>
        <button type="button" onClick={onHide} aria-label="Hide getting started" className="grid h-8 w-8 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-ink"><X size={16} /></button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
        <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-2.5">
        {steps.map((s, n) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${s.done ? 'border-gold bg-gold text-black' : 'border-white/25 text-mute'}`}>{s.done ? <Check size={14} strokeWidth={3} /> : n + 1}</span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${s.done ? 'text-mute line-through' : ''}`}>{s.label}</span>
              {!s.done && <span className="block text-[11px] text-mute">{s.hint}</span>}
            </span>
            {s === next && <button type="button" onClick={s.action} className={`${goldBtn} shrink-0 !px-4 !py-2 text-xs`}>{s.actionLabel}</button>}
          </li>
        ))}
      </ol>
      <button type="button" onClick={onShowGuide} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"><HelpCircle size={14} /> Show me how it works</button>
    </section>
  )
}
