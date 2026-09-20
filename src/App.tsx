import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { useAuth } from './lib/auth-context'
import { isSupabaseConfigured } from './lib/env'
import Setup from './routes/Setup'
import SignIn from './routes/SignIn'
import People from './routes/People'
import PersonPage from './routes/PersonPage'
import RecordSignal from './routes/RecordSignal'
import SharePage from './routes/SharePage'
import Inbox from './routes/Inbox'
import StrangerView from './routes/StrangerView'

/**
 * The family's side. Everything here needs an account.
 */
function FamilyRoutes() {
  const { session, loading } = useAuth()

  // Render nothing rather than flashing the sign-in screen at someone who is
  // already signed in.
  if (loading) return null
  if (!session) return <SignIn />

  return (
    <Routes>
      <Route path="/" element={<People />} />
      <Route path="/person/:id" element={<PersonPage />} />
      <Route path="/person/:id/record" element={<RecordSignal />} />
      <Route path="/person/:id/share" element={<SharePage />} />
      <Route path="/person/:id/inbox" element={<Inbox />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  // Without keys there is nothing to sign in to, so the status board is the
  // only honest thing to show.
  if (!isSupabaseConfigured) return <Setup />

  return (
    <AuthProvider>
      <Routes>
        {/*
          The stranger's route sits outside the family gate: an ER nurse holding
          a code must never meet a sign-in screen. It signs itself in
          anonymously.
        */}
        <Route path="/c/:token" element={<StrangerView />} />
        <Route path="*" element={<FamilyRoutes />} />
      </Routes>
    </AuthProvider>
  )
}
