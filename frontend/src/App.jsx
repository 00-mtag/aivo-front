import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import Workouts from './pages/Workouts'
import Nutrition from './pages/Nutrition'
import AiCoach from './pages/AiCoach'
import { isLoggedIn } from './lib/api'
import { hasProfile } from './lib/profile'
import Progress from './pages/Progress'

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
      <Route path="/app/workouts" element={<Protected><Workouts /></Protected>} />
      <Route path="/app/nutrition" element={<Protected><Nutrition /></Protected>} />
      <Route path="/app/ai-coach" element={<Protected><AiCoach /></Protected>} />
      <Route path="/app/progress" element={<Protected><Progress /></Protected>}/>
      {/* Dev-only previews: no login needed. Not included in production builds. */}
      {import.meta.env.DEV && <Route path="/preview" element={<Dashboard />} />}
      {import.meta.env.DEV && <Route path="/preview/workouts" element={<Workouts />} />}
      {import.meta.env.DEV && <Route path="/preview/nutrition" element={<Nutrition />} />}
      {import.meta.env.DEV && <Route path="/preview/ai-coach" element={<AiCoach />} />}
      {import.meta.env.DEV && <Route path="/preview/onboarding" element={<Onboarding />} />}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
