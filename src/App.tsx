import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { useAuth } from './lib/auth-context'
import { isSupabaseConfigured } from './lib/env'
import Setup from './routes/Setup'
import SignIn from './routes/SignIn'
import People from './routes/People'
import PersonPage from './routes/PersonPage'
import RecordSignal from './routes/RecordSignal'

function Gate() {
  const { session, loading } = useAuth()

  // Without keys there is nothing to sign in to, so the status board is the
  // only honest thing to show.
  if (!isSupabaseConfigured) return <Setup />

  // Render nothing rather than flashing the sign-in screen at someone who is
  // already signed in.
  if (loading) return null

  if (!session) return <SignIn />

  return (
    <Routes>
      <Route path="/" element={<People />} />
      <Route path="/person/:id" element={<PersonPage />} />
      <Route path="/person/:id/record" element={<RecordSignal />} />
      <Route path="/setup" element={<Setup />} />
      {/* Phase 2 adds /c/:token for the stranger view. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
