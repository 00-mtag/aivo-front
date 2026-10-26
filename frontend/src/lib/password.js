export const LEVELS = [
  { label: '', color: '#2a2a35' },
  { label: 'Weak', color: '#ff5c6c' },
  { label: 'Fair', color: '#ff9f1c' },
  { label: 'Good', color: '#ffd166' },
  { label: 'Strong', color: '#3ddc97' },
]

// 0 = empty. Under 8 characters is always Weak. From 8 up, each of
// uppercase letter, number and symbol raises the level by one (same rule as the mobile app).
export function checkPassword(p) {
  if (!p) return { level: 0, hint: '' }
  if (p.length < 8) return { level: 1, hint: 'Use at least 8 characters' }
  const missing = []
  if (!/[A-Z]/.test(p)) missing.push('Add an uppercase letter')
  if (!/[0-9]/.test(p)) missing.push('Add a number')
  if (!/[^A-Za-z0-9]/.test(p)) missing.push('Add a symbol like ! or @')
  return { level: 4 - missing.length, hint: missing[0] ?? 'Great, that is a strong password' }
}
