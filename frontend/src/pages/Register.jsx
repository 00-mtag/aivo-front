import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import PasswordStrength from '../components/PasswordStrength'
import Button from '../components/Button'
import GoogleButton from '../components/GoogleButton'
import { errorsFrom, registerRequest, saveSession } from '../lib/api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
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
      const { data } = await registerRequest({ ...form, username: form.username.trim(), email: form.email.trim() })
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
        <p className="text-sm font-semibold text-gold">Start your journey</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Create your account</h2>
        <p className="mt-1 text-xs text-ink/90">One step closer to your healthiest self.</p>
      </div>

      <div className="rise mt-6 space-y-5" style={{ animationDelay: '60ms' }}>
        <GoogleButton onClick={() => setNotice('Google sign-in is not set up yet. Please use email for now.')} />
        <div className="flex items-center gap-3 text-[11px] font-medium text-ink/90"><span className="h-px flex-1 bg-white/70" />or continue with email<span className="h-px flex-1 bg-white/70" /></div>
      </div>

      <form onSubmit={submit} noValidate className="rise mt-5 space-y-5" style={{ animationDelay: '120ms' }}>
        <TextField label="Username" name="username" autoComplete="username" value={form.username} onChange={set('username')} error={errors.username} />
        <TextField label="Email Address" type="email" name="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <div className="space-y-2.5">
          <TextField label="Password" type="password" name="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
          <PasswordStrength password={form.password} />
        </div>

        {formError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p>}
        {notice && <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{notice}</p>}

        <Button type="submit" loading={busy}>Create account</Button>
      </form>

      <p className="mt-6 text-center text-sm">
        Already have an account? <Link to="/login" className="font-bold text-gold hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
