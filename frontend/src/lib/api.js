import axios from 'axios'

// In development "/api" is proxied to Laravel (see vite.config.js). For production set VITE_API_URL.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aivo_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Endpoints and field names: confirm them with whoever builds the Laravel side.
export const loginRequest = ({ email, password }) => api.post('/login', { email, password })
export const registerRequest = ({ username, email, phone, password }) =>
  api.post('/register', { username, email, ...(phone ? { phone } : {}), password, password_confirmation: password })

export const saveSession = (data) => {
  const token = data?.token ?? data?.access_token
  if (token) localStorage.setItem('aivo_token', token)
  if (data?.user) localStorage.setItem('aivo_user', JSON.stringify(data.user))
}
export const clearSession = () => { localStorage.removeItem('aivo_token'); localStorage.removeItem('aivo_user') }
export const isLoggedIn = () => !!localStorage.getItem('aivo_token')

// Turns a Laravel error response ({ message, errors: { field: [..] } }) into messages for the form.
export function errorsFrom(err) {
  if (!err.response) return { fields: {}, form: 'Could not reach the server. Is the backend running?' }
  const d = err.response.data ?? {}
  const fields = {}
  for (const [k, v] of Object.entries(d.errors ?? {})) fields[k] = Array.isArray(v) ? v[0] : v
  return { fields, form: Object.keys(fields).length ? '' : d.message ?? 'Something went wrong. Please try again.' }
}
