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
