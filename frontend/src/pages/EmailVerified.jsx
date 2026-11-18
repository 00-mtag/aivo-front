import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { api, isLoggedIn, saveSession } from '../lib/api'
import { refreshProfileFromServer } from '../lib/profile'

export default function EmailVerified() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')
  const verifiedUserId = searchParams.get('user_id')
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    if (status !== 'success' || !verifiedUserId || !isLoggedIn()) return undefined

    let active = true
    api.get('/user')
      .then(async ({ data }) => {
        if (!active) return
        if (String(data.user_id) === verifiedUserId) {
          saveSession({ user: data })
          await refreshProfileFromServer()
        } else {
          setSyncMessage('The verified address belongs to a different account. Sign in to that account to refresh its status.')
        }
      })
      .catch(() => {
        if (active) setSyncMessage('Your email is verified, but AIVO could not refresh your profile. Reload or sign in again.')
      })

    return () => { active = false }
  }, [status, verifiedUserId])

  const verified = status === 'success'

  return (
    <AuthLayout>
      <div className="rise text-center">
        <p className="text-sm font-semibold text-gold">AIVO account</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">
          {verified ? 'Email verified' : 'Verification link invalid'}
        </h2>
        <p className="mt-3 text-sm text-ink/80">
          {verified
            ? 'Your email address has been verified.'
            : 'This verification link is invalid or has expired. Request a new link from My Profile.'}
        </p>
        {syncMessage && <p role="status" className="mt-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold">{syncMessage}</p>}
        <Link
          to={isLoggedIn() ? '/app' : '/login'}
          className="mt-6 inline-flex rounded-full bg-gold px-5 py-3 text-sm font-bold text-black transition hover:brightness-110"
        >
          {isLoggedIn() ? 'Continue to AIVO' : 'Sign in'}
        </Link>
      </div>
    </AuthLayout>
  )
}
