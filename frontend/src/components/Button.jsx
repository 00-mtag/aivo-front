import { Loader2 } from 'lucide-react'

export default function Button({ children, variant = 'primary', loading = false, icon: Icon, className = '', ...props }) {
  const look = variant === 'primary'
    ? 'bg-lime text-bg shadow-[0_0_32px_-8px_rgb(198_255_61/0.7)] hover:brightness-110'
    : 'border border-line bg-card text-ink hover:bg-line/60'
  return (
    <button
      type="button"
      {...props}
      disabled={loading || props.disabled}
      className={`flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-base font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-not-allowed disabled:opacity-60 ${look} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : Icon && <Icon size={20} />}
      {children}
    </button>
  )
}
