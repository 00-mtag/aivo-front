import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import Button from '../components/Button'
import GoogleButton from '../components/GoogleButton'
import { errorsFrom, googleLoginRequest, loginRequest, saveSession } from '../lib/api'
import LoadingScreen from '../components/LoadingScreen'
import { markPanelLoaded } from '../lib/usePanelLoader'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState(location.state?.registered ? 'Account created. Sign in to continue.' : '')
  const [busy, setBusy] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const signInWithGoogle = async (credential) => {
    setBusy(true)
    setFormError('')
    setNotice('')
    try {
      const { data } = await googleLoginRequest(credential)
      saveSession(data)
      markPanelLoaded('dashboard')
      setSignedIn(true)
    } catch (err) {
      setFormError(errorsFrom(err).form)
    } finally {
      setBusy(false)
    }
  }

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
      markPanelLoaded('dashboard') // this screen already loaded it
      setSignedIn(true)
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
        <p className="text-sm font-semibold">Welcome Back</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Sign in to <span className="text-gold">AIVO</span></h2>
        <p className="mt-1 text-xs text-ink/90">Continue building a stronger, healthier you.</p>
      </div>

      <div className="rise mt-6 space-y-5" style={{ animationDelay: '60ms' }}>
        <GoogleButton onCredential={signInWithGoogle} />
        <div className="flex items-center gap-3 text-[11px] font-medium text-ink/90"><span className="h-px flex-1 bg-white/70" />or continue with email<span className="h-px flex-1 bg-white/70" /></div>
      </div>

      <form onSubmit={submit} noValidate className="rise mt-5 space-y-5" style={{ animationDelay: '120ms' }}>
        <TextField label="Email" type="email" name="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Password" type="password" name="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />

        <div className="flex items-center justify-between text-xs">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-gold" />
            Remember me
          </label>
          <Link to="/forgot-password" state={{ email: form.email.trim() }} className="font-semibold hover:text-gold hover:underline">Forgot Password?</Link>
        </div>

        {formError && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p>}
        {notice && <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{notice}</p>}

        <Button type="submit" loading={busy}>Sign in</Button>
      </form>

      <p className="mt-6 text-center text-sm">
        New to AIVO? <Link to="/register" className="font-bold text-gold hover:underline">Create an account</Link>
      </p>
      {signedIn && <LoadingScreen message="Signing you in" onDone={() => navigate('/app', { replace: true })} />}
    </AuthLayout>
  )
}
