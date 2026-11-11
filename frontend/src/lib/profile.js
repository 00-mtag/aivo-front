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
const EXERCISE_COUNTS_BY_ACTIVITY = {
  Sedentary: { min: 1, max: 3, target: 2 },
  'Lightly active': { min: 3, max: 5, target: 4 },
  'Moderately active': { min: 5, max: 7, target: 6 },
  'Very active': { min: 7, max: 8, target: 8 },
  'Extra active': { min: 8, max: 12, target: 10 },
}

export function exerciseCountForActivity(activityLevel) {
  const resolvedActivity = Object.prototype.hasOwnProperty.call(EXERCISE_COUNTS_BY_ACTIVITY, activityLevel)
    ? activityLevel
    : 'Sedentary'
  return { activityLevel: resolvedActivity, ...EXERCISE_COUNTS_BY_ACTIVITY[resolvedActivity] }
}

export function calculateTdee({ gender, age, heightCm, weightKg, activityLevel }) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel]
  if (!multiplier || !Number.isFinite(age) || !Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null

  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age
  const genderAdjustment = gender === 'Male' ? 5 : gender === 'Female' ? -161 : -78
  return Math.round((baseBmr + genderAdjustment) * multiplier)
}

export function calculateProfileTdee(profile) {
  const birthDate = profile?.birthDate ?? profile?.birthday ?? profile?.birthdate ?? profile?.birth_date ?? profile?.dob
  if (!birthDate) return null

  const date = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const now = new Date()
  const age = now.getFullYear() - date.getFullYear()
    - (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate()) ? 1 : 0)

  return calculateTdee({
    gender: profile.gender ?? profile.sex,
    age,
    heightCm: Number(profile.heightCm ?? profile.height_cm ?? profile.height),
    weightKg: Number(profile.weightKg ?? profile.weight_kg ?? profile.weight),
    activityLevel: profile.activityLevel ?? profile.activity_level ?? profile.activity,
  })
}

export function recommendedDailyCalories(profile) {
  const tdee = calculateProfileTdee(profile)
  if (tdee === null) return null

  const goal = profile.goal ?? profile.fitnessGoal
  const adjustment = { 'Lose weight': -500, 'Build muscle': 300, 'Improve endurance': 100, 'Maintain fitness': 0 }[goal] ?? 0
  return Math.max(1200, Math.round((tdee + adjustment) / 10) * 10)
}
