// Onboarding answers are kept per user in localStorage until the Laravel side can store them.
// TODO: POST the profile to the backend in Onboarding.jsx and read it back after login.
const key = () => {
  try {
    const u = JSON.parse(localStorage.getItem('aivo_user') ?? 'null')
    return `aivo_profile_${u?.id ?? u?.email ?? 'guest'}`
  } catch { return 'aivo_profile_guest' }
}
export const getProfile = () => {
  try { return JSON.parse(localStorage.getItem(key()) ?? 'null') } catch { return null }
}
export const saveProfile = (p) => localStorage.setItem(key(), JSON.stringify(p))
export const hasProfile = () => !!getProfile()
