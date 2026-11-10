export function Card({ className = '', children, ...rest }) {
  return <section className={`rounded-2xl border border-white/10 bg-card p-4 sm:p-5 ${className}`} {...rest}>{children}</section>
}

export function CardTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        {Icon && <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#1f1f1f] text-gold"><Icon size={16} /></span>}
        {children}
      </h2>
      {action}
    </div>
  )
}

export function ProgressBar({ value, goal, color = 'bg-gold' }) {
  const p = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${p}%` }} />
    </div>
  )
}

export function Ring({ value, goal, size = 64, stroke = 7, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = goal > 0 ? Math.min(1, value / goal) : 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5b82e" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function StatTile({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card p-3 sm:p-4">
      <Icon size={18} className="text-gold" />
      <p className="mt-3 text-xs text-white/50">{label}</p>
      <p className="text-lg font-bold text-white sm:text-xl">{value}</p>
      <p className="text-xs text-white/40">{note}</p>
    </div>
  )
}

export const fmt = n => Math.round(n).toLocaleString()
