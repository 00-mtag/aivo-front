// Onboarding answers are kept per user in localStorage until the Laravel side can store them.
// TODO: POST the profile to the backend in Onboarding.jsx and read it back after login.
export const userKey = (prefix) => {
  try {
    const u = JSON.parse(localStorage.getItem('aivo_user') ?? 'null')
    return `${prefix}_${u?.id ?? u?.email ?? 'guest'}`
  } catch { return `${prefix}_guest` }
}
export const getProfile = () => {
  try { return JSON.parse(localStorage.getItem(userKey('aivo_profile')) ?? 'null') } catch { return null }
}
export const saveProfile = (p) => localStorage.setItem(userKey('aivo_profile'), JSON.stringify(p))
export const hasProfile = () => !!getProfile()

const ACTIVITY_MULTIPLIERS = {
  Sedentary: 1.2,
  'Lightly active': 1.375,
  'Moderately active': 1.55,
  'Very active': 1.725,
  'Extra active': 1.9,
}

export function calculateTdee({ gender, age, heightCm, weightKg, activityLevel }) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel]
  if (!multiplier || !Number.isFinite(age) || !Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null

  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age
  const genderAdjustment = gender === 'Male' ? 5 : gender === 'Female' ? -161 : -78
  return Math.round((baseBmr + genderAdjustment) * multiplier)
}
