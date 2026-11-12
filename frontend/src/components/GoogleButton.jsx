import { useEffect, useRef, useState } from 'react'

let googleScriptPromise
let initializedGoogleClientId
let activeGoogleCallbacks
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        googleScriptPromise = undefined
        reject(new Error('Google Sign-In failed to load.'))
      }
      document.head.appendChild(script)
    })
  }
  return googleScriptPromise
}

export default function GoogleButton({ onCredential }) {
  const buttonRef = useRef(null)
  const onCredentialRef = useRef(onCredential)
  const [error, setError] = useState('')

  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let active = true
    const buttonElement = buttonRef.current
    const callbacks = {
      onCredential: (credential) => onCredentialRef.current(credential),
      onError: setError,
    }

    if (!googleClientId) {
      return () => { active = false }
    }

    loadGoogleIdentity()
      .then(() => {
        if (!active || !buttonElement) return

        activeGoogleCallbacks = callbacks
        if (initializedGoogleClientId !== googleClientId) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              if (response.credential) activeGoogleCallbacks?.onCredential(response.credential)
              else activeGoogleCallbacks?.onError('Google did not return a sign-in credential. Please try again.')
            },
          })
          initializedGoogleClientId = googleClientId
        }
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(400, Math.floor(buttonElement.getBoundingClientRect().width)),
        })
      })
      .catch(() => {
        if (active) setError('Could not load Google Sign-In. Check your connection and try again.')
      })

    return () => {
      active = false
      if (activeGoogleCallbacks === callbacks) activeGoogleCallbacks = undefined
      buttonElement?.replaceChildren()
    }
  }, [])

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="flex min-h-10 justify-center" />
      {(!googleClientId || error) && (
        <p role="alert" className="text-center text-xs text-danger">
          {googleClientId ? error : 'Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.'}
        </p>
      )}
    </div>
  )
}
