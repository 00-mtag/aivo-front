import { Loader2 } from 'lucide-react'

export default function Button({ children, variant = 'primary', loading = false, icon: Icon, className = '', ...props }) {
  const look = variant === 'primary'
    ? 'bg-gold text-black hover:brightness-110'
    : 'border-2 border-gold bg-transparent text-ink hover:bg-gold/10'
  return (
    <button
      type="button"
      {...props}
      disabled={loading || props.disabled}
      className={`flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60 ${look} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : Icon && <Icon size={18} />}
      {children}
    </button>
  )
}
