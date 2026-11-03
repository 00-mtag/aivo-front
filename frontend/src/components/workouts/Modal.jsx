import { useEffect } from 'react'
import { X } from 'lucide-react'

export const fieldClass = 'w-full rounded-xl border border-white/20 bg-black/30 px-3.5 py-3 text-sm outline-none placeholder:text-mute/60 focus:border-gold'
export const Field = ({ label, children }) => (
  <label className="block space-y-1.5"><span className="text-xs font-semibold">{label}</span>{children}</label>
)
export const goldBtn = 'rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-mute'
export const ghostBtn = 'rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/5'

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-mute transition hover:text-ink"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
