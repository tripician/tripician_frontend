import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landingpage from './pages/LandingPage/LandingPage'
import ProtectedRoute from './services/APIs/Auth/ProtectedRoute'
import GuestRoute from './services/APIs/Auth/GuestRoute'
import TermsPage from './pages/InfoPages/TermsPage';
import PrivacyPage from './pages/InfoPages/PrivacyPage';
import AboutPage from './pages/InfoPages/AboutPage';
import ForOperatorsPage from './pages/InfoPages/ForOperatorsPage';
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
const Profile = lazy(() => import('./pages/ProfilePage/Profile'))
const Community = lazy(() => import('./pages/CommunityPage/Community'))
const Crew = lazy(() => import('./pages/CrewPage/Crew'))
const OperatorPage = lazy(() => import('./operator/OperatorPage'))
const OrganizationsPage = lazy(() => import('./organization/OrganizationsPage'))
const OrganizationProfilePage = lazy(() => import('./organization/OrganizationProfilePage'))
const PricingPage = lazy(() => import('./pricing/PricingPage'))
const Templates = lazy(() => import('./pages/TemplatesPage/Templates'))
const TravelerProfile = lazy(() => import('./pages/ProfilePage/TravelerProfile'))
const Settings = lazy(() => import('./pages/SettingsPage/Settings'))
const RiskMonitor = lazy(() => import('./pages/RiskMonitorPage/RiskMonitor'))
const NaviaPage = lazy(() => import('./pages/NaviaPage/NaviaPage'))
const TripPlannerEntry = lazy(() => import('./pages/CreateTripPage/TripPlannerEntry.tsx'))
const TripPlannerRoute = lazy(() => import('./pages/CreateTripPage/TripPlannerRoute.tsx'))
const TripView = lazy(() => import('./pages/TripViewPage/TripView'))
const StoryEditPage = lazy(() => import('./afterstory/StoryEditPage'))
const StoryPage = lazy(() => import('./afterstory/StoryPage'))
const StoriesPage = lazy(() => import('./afterstory/StoriesPage'))
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
            {/* Trips merged into Profile, which already carried the same data
                from the same endpoint. Redirected rather than removed: the path
                is in people's history and muscle memory, and a 404 there would
                read as lost work. */}
            <Route path="/dashboard" element={<Navigate to="/profile?tab=trips" replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/navia" element={<NaviaPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/operator" element={<OperatorPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
          </Route>
          {/* Semi-public routes: full app layout but no auth gate - guests can browse, login prompted on action */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/community" element={<Community />} />
            {/* Semi-public like /community: a guest can browse, and signing in is
                prompted on the action rather than at the door. */}
            <Route path="/stories" element={<StoriesPage />} />
            {/* Lifted out of the Community tabs: finding a person and copying a
                starting point are lookups, not browsing, and both deserve a URL. */}
            <Route path="/crew" element={<Crew />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/traveler/:userId" element={<TravelerProfile />} />
            <Route path="/risk-monitor" element={<RiskMonitor />} />
          </Route>
          {/* Trip Planner entry: redirect /tripplanner -> /tripplanner/:generatedId (reusing last draft if available) */}
          <Route path="/tripplanner" element={<ProtectedRoute><TripPlannerEntry /></ProtectedRoute>} />
          <Route path="/tripplanner/:tripId" element={<ProtectedRoute><TripPlannerRoute /></ProtectedRoute>} />
          {/* Read-only trip view route (partially public: published/shared trips viewable without login) */}
          <Route path="/o/:slug" element={<OrganizationProfilePage />} />
          <Route path="/trip/:tripId" element={<TripView />} />
          {/* After Story editor. Protected and noindex: a draft is private by definition. */}
          <Route path="/story/:storyId/edit" element={<ProtectedRoute><StoryEditPage /></ProtectedRoute>} />
          {/* Public story. Registered AFTER /edit so the more specific pattern
              wins, and left ungated so a shared link works for a signed-out
              reader. The server decides what a draft looks like to a stranger. */}
          <Route path="/story/:slugOrId" element={<StoryPage />} />
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
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/for-operators" element={<ForOperatorsPage />} />
        
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
