import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Phone, Lock } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import PasswordStrength from '../components/PasswordStrength'
import Button from '../components/Button'
import GoogleButton from '../components/GoogleButton'
import { errorsFrom, registerRequest, saveSession } from '../lib/api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (form.username.trim().length < 3) next.username = 'Use at least 3 characters.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next); setFormError(''); setNotice('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const { data } = await registerRequest({ ...form, username: form.username.trim(), email: form.email.trim(), phone: form.phone.trim() })
      if (data?.token ?? data?.access_token) { saveSession(data); navigate('/app', { replace: true }) }
      else navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      const r = errorsFrom(err)
      setErrors({ ...r.fields, username: r.fields.username ?? r.fields.name }); setFormError(r.form)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="rise">
        <h2 className="font-display text-3xl font-bold">Create your account</h2>
        <p className="mt-1 text-mute">Takes about a minute.</p>
      </div>

      <form onSubmit={submit} noValidate className="rise mt-8 space-y-5" style={{ animationDelay: '80ms' }}>
        <TextField label="Username" icon={User} name="username" autoComplete="username" placeholder="Pick a username" value={form.username} onChange={set('username')} error={errors.username} />
        <TextField label="Email" icon={Mail} type="email" name="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Phone, for reminders (optional)" icon={Phone} type="tel" name="phone" autoComplete="tel" placeholder="09xx xxx xxxx" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <div className="space-y-2.5">
          <TextField label="Password" icon={Lock} type="password" name="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} error={errors.password} />
          <PasswordStrength password={form.password} />
        </div>

        {formError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p>}
        {notice && <p role="status" className="rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">{notice}</p>}

        <div className="space-y-3 pt-1">
          <Button type="submit" loading={busy}>Create account</Button>
          <div className="flex items-center gap-3 text-xs text-mute"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <GoogleButton onClick={() => setNotice('Google sign-in is not set up yet. Please use email for now.')} />
        </div>
      </form>

      <p className="rise mt-8 text-center text-sm text-mute" style={{ animationDelay: '160ms' }}>
        Have an account? <Link to="/login" className="font-semibold text-lime hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  )
}
