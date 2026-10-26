import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function TextField({ label, icon: Icon, type = 'text', error, ...props }) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-ink">{label}</label>
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-3.5 transition-colors focus-within:border-lime ${error ? 'border-danger' : 'border-transparent'}`}>
        {Icon && <Icon size={18} className="shrink-0 text-mute" />}
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-mute/70"
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="text-mute transition hover:text-ink">
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && <p id={`${id}-error`} className="text-xs text-danger">{error}</p>}
    </div>
  )
}
