import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function TextField({ label, type = 'text', error, ...props }) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}</label>
      <div className={`flex items-center gap-3 rounded-xl border bg-card px-4 transition-colors focus-within:border-gold ${error ? 'border-danger' : 'border-white/80'}`}>
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-mute/60"
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
