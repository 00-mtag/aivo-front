import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import PasswordStrength from '../components/PasswordStrength'
import Button from '../components/Button'
import { errorsFrom, resetPasswordRequest } from '../lib/api'

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const query = new URLSearchParams(location.search)
  const [form, setForm] = useState({
    email: query.get('email') ?? '',
    code: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!/^\d{6}$/.test(form.code)) next.code = 'Enter the six-digit code from your email.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    if (!form.password_confirmation) next.password_confirmation = 'Confirm your password.'
    else if (form.password_confirmation !== form.password) next.password_confirmation = 'Passwords do not match.'
    setErrors(next)
    setFormError('')
    if (!form.email) {
      setFormError('Enter the email address that received the verification code.')
      return
    }
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await resetPasswordRequest(form)
      setComplete(true)
    } catch (err) {
      const result = errorsFrom(err)
      setErrors(result.fields)
      setFormError(result.fields.code || result.form)
    } finally {
      setBusy(false)
    }
  }

  if (complete) {
    return (
      <AuthLayout>
        <div className="rise">
          <p className="text-sm font-semibold text-gold">Password updated</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">You’re all set</h2>
          <p className="mt-1 text-xs text-ink/90">Your password has been changed. Sign in with your new password.</p>
        </div>
        <Button type="button" className="mt-6" onClick={() => navigate('/login', { replace: true })}>Back to sign in</Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="rise">
        <p className="text-sm font-semibold text-gold">Account recovery</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose a new password</h2>
        <p className="mt-1 text-xs text-ink/90">Enter the six-digit code we emailed you, then choose a new password.</p>
      </div>

      <form onSubmit={submit} noValidate className="rise mt-6 space-y-5" style={{ animationDelay: '60ms' }}>
        <TextField label="Email" type="email" name="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Verification code" name="code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={form.code} onChange={set('code')} error={errors.code} />
        <div className="space-y-2.5">
          <TextField label="New password" type="password" name="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
          <PasswordStrength password={form.password} />
        </div>
        <TextField label="Confirm new password" type="password" name="password_confirmation" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} error={errors.password_confirmation} />

        {formError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p>}

        <Button type="submit" loading={busy}>Change password</Button>
      </form>

      <p className="mt-6 text-center text-sm">
        Need a new code? <Link to="/forgot-password" className="font-bold text-gold hover:underline">Request another</Link>
      </p>
    </AuthLayout>
  )
}
