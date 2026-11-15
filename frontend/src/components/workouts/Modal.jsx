import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export const fieldClass = 'w-full rounded-xl border border-white/20 bg-black/30 px-3.5 py-3 text-base outline-none placeholder:text-mute/60 focus:border-gold sm:text-sm'
export const Field = ({ label, children }) => (
  <label className="block space-y-1.5"><span className="text-xs font-semibold">{label}</span>{children}</label>
)
export const goldBtn = 'rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-mute'
export const ghostBtn = 'rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/5'

// A bottom sheet on phones and a centered dialog on larger screens.
// `footer` stays pinned at the bottom while the content scrolls.
export default function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    const prev = document.body.style.overflow
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [])
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-card sm:rounded-2xl ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`} style={{ maxHeight: '92dvh' }}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-mute">{subtitle}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-ink"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-white/10 bg-card px-5 pt-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmModal({ title, text, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}
      footer={(
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className={danger ? 'rounded-full bg-danger px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50' : goldBtn}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      )}>
      <p className="text-sm text-ink/90">{text}</p>
    </Modal>
  )
}
