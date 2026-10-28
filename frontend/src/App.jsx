import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import { isLoggedIn } from './lib/api'
import { hasProfile } from './lib/profile'

// Logged in but no profile yet -> onboarding comes first; once done, go to the dashboard.
const Protected = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return hasProfile() ? children : <Navigate to="/onboarding" replace />
}
const Onboard = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return hasProfile() ? <Navigate to="/app" replace /> : children
}
const Guest = ({ children }) => (isLoggedIn() ? <Navigate to="/app" replace /> : children)

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route path="/onboarding" element={<Onboard><Onboarding /></Onboard>} />
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
