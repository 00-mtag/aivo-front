import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import Button from '../components/Button'
import { errorsFrom, forgotPasswordRequest } from '../lib/api'

const COOLDOWN = 60

export default function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [wait, setWait] = useState(0)

  // Resend cooldown
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const request = async (isResend = false) => {
    const addr = email.trim()
    const next = {}
    if (!addr) next.email = 'Enter your email address.'
    else if (!/^\S+@\S+\.\S+$/.test(addr)) next.email = 'Enter a valid email address.'
    setErrors(next); setFormError(''); setNotice('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await forgotPasswordRequest({ email: addr })
      setSent(true)
      setWait(COOLDOWN)
      if (isResend) setNotice('Another code is on its way. Use the most recent one.')
    } catch (err) {
      const r = errorsFrom(err)
      setErrors(r.fields); setFormError(r.form)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => { e.preventDefault(); request(false) }

  if (sent) {
    return (
      <AuthLayout>
        <div className="rise">
          <p className="text-sm font-semibold text-gold">Check your inbox</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Verification code sent</h2>
          <p className="mt-1 text-xs text-ink/90">
            If an account exists for <span className="font-semibold break-all">{email.trim()}</span>, a six-digit code is on its way. It expires in 10 minutes.
          </p>
        </div>

        <div className="rise mt-6 space-y-5" style={{ animationDelay: '60ms' }}>
          <p className="text-sm text-ink/90">Check your spam folder if it isn’t in your inbox.</p>

          {formError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p>}
          {notice && <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{notice}</p>}

          <Button type="button" loading={busy} disabled={wait > 0 || busy} onClick={() => request(true)}>
            {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
          </Button>
        </div>

        <p className="rise mt-6 text-center text-sm" style={{ animationDelay: '120ms' }}>
          <Link to={`/reset-password?email=${encodeURIComponent(email.trim())}`} className="font-bold text-gold hover:underline">Enter verification code</Link>
          <span className="mx-2 text-ink/50">|</span>
          <button type="button" onClick={() => { setSent(false); setNotice(''); setFormError('') }} className="font-semibold hover:text-gold hover:underline">
            Use a different email
          </button>
          <span className="mx-2 text-ink/50">|</span>
          <Link to="/login" className="font-bold text-gold hover:underline">Back to sign in</Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="rise">
        <p className="text-sm font-semibold text-gold">Account recovery</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Forgot your <span className="text-gold">password?</span></h2>
        <p className="mt-1 text-xs text-ink/90">Enter the email you signed up with and we’ll send you a six-digit verification code.</p>
      </div>

      <form onSubmit={submit} noValidate className="rise mt-6 space-y-5" style={{ animationDelay: '60ms' }}>
        <TextField label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />

        {formError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p>}
        {notice && <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{notice}</p>}

        <Button type="submit" loading={busy}>Send verification code</Button>
      </form>

      <p className="mt-6 text-center text-sm">
        Remembered it? <Link to="/login" className="font-bold text-gold hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
