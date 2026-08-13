import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landingpage from './pages/LandingPage/LandingPage'
import ProtectedRoute from './services/APIs/Auth/ProtectedRoute'
import GuestRoute from './services/APIs/Auth/GuestRoute'
import TermsPage from './pages/InfoPages/TermsPage';
import PrivacyPage from './pages/InfoPages/PrivacyPage';
import AboutPage from './pages/InfoPages/AboutPage';
import BlogsList from './pages/BlogsPage/BlogsList';
import BlogPost from './pages/BlogsPage/BlogPost';
import { useAuthToken } from './hooks/useAuth0Token';
import { ActivityHeartbeat } from './hooks/useActivityHeartbeat';

const Signin = lazy(() => import('./pages/AuthPage/Signin'))
const Signup = lazy(() => import('./pages/AuthPage/Signup'))
const ForgotPassword = lazy(() => import('./pages/AuthPage/ForgotPassword'))
const Callback = lazy(() => import('./pages/AuthPage/Callback'))
const AuthenticatedLayout = lazy(() => import('./pages/PageLayout/AuthenticatedLayout'))
const SuccessOverlay = lazy(() => import('./components/CommonComponents/SuccessOverlay'))
const Dashboard = lazy(() => import('./pages/DashboardPage/Dashboard'))
const Profile = lazy(() => import('./pages/ProfilePage/Profile'))
const Community = lazy(() => import('./pages/CommunityPage/Community'))
const TravelerProfile = lazy(() => import('./pages/ProfilePage/TravelerProfile'))
const Settings = lazy(() => import('./pages/SettingsPage/Settings'))
const RiskMonitor = lazy(() => import('./pages/RiskMonitorPage/RiskMonitor'))
const NaviaPage = lazy(() => import('./pages/NaviaPage/NaviaPage'))
const TripPlannerEntry = lazy(() => import('./pages/CreateTripPage/TripPlannerEntry.tsx'))
const TripPlannerRoute = lazy(() => import('./pages/CreateTripPage/TripPlannerRoute.tsx'))
const TripView = lazy(() => import('./pages/TripViewPage/TripView'))
const HelpPage = lazy(() => import('./pages/InfoPages/HelpPage'))
const ContactPage = lazy(() => import('./pages/InfoPages/ContactPage'))
const NotFound404 = lazy(() => import('./pages/ErrorPages/ErrorPages').then((m) => ({ default: m.NotFound404 })))
const InternalError500 = lazy(() => import('./pages/ErrorPages/ErrorPages').then((m) => ({ default: m.InternalError500 })))
const UnauthorizedAccess = lazy(() => import('./pages/ErrorPages/ErrorPages').then((m) => ({ default: m.UnauthorizedAccess })))
const UnderConstruction = lazy(() => import('./pages/ErrorPages/ErrorPages').then((m) => ({ default: m.UnderConstruction })))
const SomethingWentWrong = lazy(() => import('./pages/ErrorPages/ErrorPages').then((m) => ({ default: m.SomethingWentWrong })))
const DynamicErrorPage = lazy(() => import('./pages/ErrorPages/ErrorPages').then((m) => ({ default: m.DynamicErrorPage })))

// Import debug utilities for development builds only (tree-shaken from production)
if (import.meta.env.DEV) {
  import('./utils/authDebug');
}

/**
 * Smart root: signed-in users skip the landing page and go straight to community.
 *
 * The single authority on what "/" shows. LandingPage used to run its own redirect
 * from the Auth0 SDK's `isAuthenticated`, which disagreed with this and produced the
 * production back-button loop; that effect is gone and must not come back.
 *
 * Reads the same status enum as the two route guards. `expired` renders the landing
 * page rather than redirecting, which is right: someone whose session lapsed should
 * see the front door, not be thrown at a guard that sends them somewhere else.
 */
function RootRedirect() {
  const { status } = useAuthToken();
  if (status === 'refreshing') return <div style={{ minHeight: '100vh' }} />;
  return status === 'valid' ? <Navigate to="/community" replace /> : <Landingpage />;
}

function App() {
  return (
    <div className="App">
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <Routes>
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
          <Route path="/signin" element={<GuestRoute><Signin /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/" element={<RootRedirect />} />
        
          {/* Protected Routes grouped under persistent layout */}
          <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
            <Route path="/home" element={<Navigate to="/community" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/navia" element={<NaviaPage />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Semi-public routes: full app layout but no auth gate - guests can browse, login prompted on action */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/community" element={<Community />} />
            <Route path="/traveler/:userId" element={<TravelerProfile />} />
            <Route path="/risk-monitor" element={<RiskMonitor />} />
          </Route>
          {/* Trip Planner entry: redirect /tripplanner -> /tripplanner/:generatedId (reusing last draft if available) */}
          <Route path="/tripplanner" element={<ProtectedRoute><TripPlannerEntry /></ProtectedRoute>} />
          <Route path="/tripplanner/:tripId" element={<ProtectedRoute><TripPlannerRoute /></ProtectedRoute>} />
          {/* Read-only trip view route (partially public: published/shared trips viewable without login) */}
          <Route path="/trip/:tripId" element={<TripView />} />
          {/* Legacy path redirect */}
          <Route path="/create-trip" element={<Navigate to="/error/404" replace />} />
          {/* Error & status pages */}
          <Route path="/error/404" element={<NotFound404 />} />
          <Route path="/error/500" element={<InternalError500 />} />
          <Route path="/error/unauthorized" element={<UnauthorizedAccess />} />
          <Route path="/under-construction" element={<UnderConstruction />} />
          <Route path="/error" element={<SomethingWentWrong />} />
          <Route path="/error/:code" element={<DynamicErrorPage />} />
        
          {/* Info pages */}
          <Route path="/terms-and-conditions" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/get-help" element={<HelpPage />} />
          <Route path="/contact-us" element={<ContactPage />} />
          <Route path="/about-us" element={<AboutPage />} />
        
          {/* Blog routes - public, no auth required (SEO) */}
          <Route path="/blog" element={<BlogsList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          {/* /discover rendered a second copy of the published-trips feed under a
              different name, with its own H1 and its own SEO - so the community
              had two front doors and no single name. It now redirects to the one
              that keeps it. `replace` so Back does not bounce the user. */}
          <Route path="/discover" element={<Navigate to="/community" replace />} />
        
          {/* Final catch-all -> 404 page */}
          <Route path="*" element={<NotFound404 />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <SuccessOverlay />
      </Suspense>
      <ActivityHeartbeat />
    </div>
  )
}

export default App
