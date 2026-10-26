import { LEVELS, checkPassword } from '../lib/password'

export default function PasswordStrength({ password }) {
  const { level, hint } = checkPassword(password)
  const lv = LEVELS[level]
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i <= level ? lv.color : LEVELS[0].color }} />
        ))}
      </div>
      {level > 0 && (
        <p className="text-xs">
          <span className="mr-2 font-bold" style={{ color: lv.color }}>{lv.label}</span>
          <span className="text-mute">{hint}</span>
        </p>
      )}
    </div>
  )
}
