import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Button from './components/Button'
import { clearSession, isLoggedIn } from './lib/api'

const Protected = ({ children }) => (isLoggedIn() ? children : <Navigate to="/login" replace />)
const Guest = ({ children }) => (isLoggedIn() ? <Navigate to="/app" replace /> : children)

// Placeholder until the dashboard is built.
function AppHome() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-card p-8 text-center">
        <p className="font-display text-3xl font-extrabold text-lime">AIVO</p>
        <p className="text-mute">You are logged in. The dashboard goes here.</p>
        <Button variant="secondary" onClick={() => { clearSession(); navigate('/login', { replace: true }) }}>Log out</Button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route path="/app" element={<Protected><AppHome /></Protected>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
