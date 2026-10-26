import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import Button from '../components/Button'
import GoogleButton from '../components/GoogleButton'
import { errorsFrom, loginRequest, saveSession } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState(location.state?.registered ? 'Account created. Log in to continue.' : '')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!form.password) next.password = 'Enter your password.'
    setErrors(next); setFormError(''); setNotice('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const { data } = await loginRequest({ email: form.email.trim(), password: form.password })
      saveSession(data)
      navigate('/app', { replace: true })
    } catch (err) {
      const r = errorsFrom(err)
      setErrors(r.fields); setFormError(r.form)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="rise">
        <h2 className="font-display text-3xl font-bold">Welcome back</h2>
        <p className="mt-1 text-mute">Log in to keep your streak going.</p>
      </div>

      <form onSubmit={submit} noValidate className="rise mt-8 space-y-5" style={{ animationDelay: '80ms' }}>
        <TextField label="Email" icon={Mail} type="email" name="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Password" icon={Lock} type="password" name="password" autoComplete="current-password" placeholder="Your password" value={form.password} onChange={set('password')} error={errors.password} />
        <div className="flex justify-end">
          <button type="button" onClick={() => setNotice('Password reset is not set up yet.')} className="text-sm font-semibold text-cyan hover:underline">Forgot password?</button>
        </div>

        {formError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p>}
        {notice && <p role="status" className="rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">{notice}</p>}

        <div className="space-y-3 pt-1">
          <Button type="submit" loading={busy}>Log in</Button>
          <div className="flex items-center gap-3 text-xs text-mute"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <GoogleButton onClick={() => setNotice('Google sign-in is not set up yet. Please use email for now.')} />
        </div>
      </form>

      <p className="rise mt-8 text-center text-sm text-mute" style={{ animationDelay: '160ms' }}>
        New here? <Link to="/register" className="font-semibold text-lime hover:underline">Create account</Link>
      </p>
    </AuthLayout>
  )
}
