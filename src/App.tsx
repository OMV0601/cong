import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { useAuth } from './lib/auth-context'
import { isSupabaseConfigured } from './lib/env'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineNotice } from './components/OfflineNotice'
import Landing from './routes/Landing'
import NotConfigured from './routes/NotConfigured'
import NotFound from './routes/NotFound'
import SignIn from './routes/SignIn'
import StrangerView from './routes/StrangerView'

/*
 * The family's screens load on demand; the landing page, sign-in and the
 * stranger's view do not.
 *
 * This is not a general performance nicety — it is about one user. A nurse
 * opening /c/:token is on hospital wifi, on a device she does not own, with a
 * patient in front of her. She has no business downloading the recording
 * studio, the QR generator or a modal library to look at a grid of clips. The
 * family, by contrast, is usually at home and can afford a second chunk.
 */
const People = lazy(() => import('./routes/People'))
const PersonPage = lazy(() => import('./routes/PersonPage'))
const ActivityPage = lazy(() => import('./routes/ActivityPage'))
const RecordSignal = lazy(() => import('./routes/RecordSignal'))
const SharePage = lazy(() => import('./routes/SharePage'))
const Inbox = lazy(() => import('./routes/Inbox'))
const Setup = lazy(() => import('./routes/Setup'))

/**
 * Nothing, deliberately.
 *
 * A chunk over a fast connection arrives in well under the time a spinner
 * takes to stop looking like a glitch, and these routes render their own
 * skeletons the moment they mount.
 */
function RouteFallback() {
  return null
}

/**
 * Anything behind here needs an account.
 *
 * Sends an unauthenticated visitor to /signin and remembers where they were
 * going, so a bookmarked person page survives a session expiring.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Render nothing rather than flashing the sign-in screen at someone who is
  // already signed in.
  if (loading) return null
  if (!session)
    return <Navigate to="/signin" replace state={{ from: location }} />
  return <>{children}</>
}

/** Signed-in visitors have no use for the pitch; send them to their people. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  // Without keys there is nothing to sign in to. A first-time visitor gets a
  // plain explanation; the checklist that names the missing piece lives at
  // /debug, where only whoever is deploying this will look for it.
  if (!isSupabaseConfigured) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/debug" element={<Setup />} />
          <Route path="*" element={<NotConfigured />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <AuthProvider>
      <OfflineNotice />
      <Routes>
        {/*
          The stranger's route sits outside the family gate: an ER nurse holding
          a code must never meet a sign-in screen. It signs itself in
          anonymously. It gets its own error boundary so a crash in the family
          side can never take it down with it.
        */}
        <Route
          path="/c/:token"
          element={
            <ErrorBoundary area="stranger view">
              <StrangerView />
            </ErrorBoundary>
          }
        />

        <Route
          path="*"
          element={
            <ErrorBoundary area="family side">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <PublicOnly>
                        <Landing />
                      </PublicOnly>
                    }
                  />
                  <Route
                    path="/signin"
                    element={
                      <PublicOnly>
                        <SignIn />
                      </PublicOnly>
                    }
                  />
                  <Route
                    path="/app"
                    element={
                      <RequireAuth>
                        <People />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/person/:id"
                    element={
                      <RequireAuth>
                        <PersonPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/person/:id/record"
                    element={
                      <RequireAuth>
                        <RecordSignal />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/person/:id/share"
                    element={
                      <RequireAuth>
                        <SharePage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/person/:id/inbox"
                    element={
                      <RequireAuth>
                        <Inbox />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/person/:id/activity"
                    element={
                      <RequireAuth>
                        <ActivityPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="/debug" element={<Setup />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
