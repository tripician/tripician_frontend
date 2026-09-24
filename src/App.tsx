import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import Landingpage from './pages/LandingPage/LandingPage'
import ProtectedRoute from './services/APIs/Auth/ProtectedRoute'
import GuestRoute from './services/APIs/Auth/GuestRoute'
import { AuthGateProvider } from './auth/AuthGate'
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
// Same chunk AuthenticatedLayout pulls in, so "/" costs no extra download.
const NavigationPannel = lazy(() => import('./pages/PageLayout/CommonLayouts/NavigationPanel'))
const SuccessOverlay = lazy(() => import('./components/CommonComponents/SuccessOverlay'))
const Profile = lazy(() => import('./pages/ProfilePage/Profile'))
const Board = lazy(() => import('./board/Board'))
const Crew = lazy(() => import('./pages/CrewPage/Crew'))
const OperatorPage = lazy(() => import('./operator/OperatorPage'))
const OrganizationsPage = lazy(() => import('./organization/OrganizationsPage'))
const OrganizationProfilePage = lazy(() => import('./organization/OrganizationProfilePage'))
const OrganizationWorkspace = lazy(() => import('./organization/OrganizationWorkspace'))
const JoinGroupPage = lazy(() => import('./organization/JoinGroupPage'))
const JoinTripPage = lazy(() => import('./seats/JoinTripPage'))
const PricingPage = lazy(() => import('./pricing/PricingPage'))
const Templates = lazy(() => import('./pages/TemplatesPage/Templates'))
const SearchPage = lazy(() => import('./pages/SearchPage/SearchPage'))
const PostsPage = lazy(() => import('./posts/PostsPage'))
const PostPage = lazy(() => import('./posts/PostPage'))
const TravelerProfile = lazy(() => import('./pages/ProfilePage/TravelerProfile'))
const Settings = lazy(() => import('./pages/SettingsPage/Settings'))
const UnsubscribePage = lazy(() => import('./pages/SettingsPage/UnsubscribePage'))
const MessagesPage = lazy(() => import('./messages/MessagesPage'))
const TripicianAIPage = lazy(() => import('./pages/TripicianAIPage/TripicianAIPage'))
const TripPlannerEntry = lazy(() => import('./pages/CreateTripPage/TripPlannerEntry.tsx'))
const TripPlannerRoute = lazy(() => import('./pages/CreateTripPage/TripPlannerRoute.tsx'))
const TripView = lazy(() => import('./pages/TripViewPage/TripView'))
const StoryEditPage = lazy(() => import('./afterstory/StoryEditPage'))
const StoryPage = lazy(() => import('./afterstory/StoryPage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage/BrowsePage'))
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
 * Smart root: the landing page for a guest, the board for everybody else.
 *
 * The single authority on what "/" shows. LandingPage used to run its own redirect
 * from the Auth0 SDK's `isAuthenticated`, which disagreed with this and produced the
 * production back-button loop; that effect is gone and must not come back.
 *
 * It RENDERS the board rather than redirecting to it. This IS the product's front
 * door now, not a hop to a page called Community that a traveller never typed.
 *
 * The shell is composed by hand here because AuthenticatedLayout is a layout route
 * that renders an Outlet, and "/" is not inside it. NavigationPannel takes children,
 * so this is the same shell the layout builds, minus the routing indirection. The
 * guest branch deliberately stays outside it: app chrome around a marketing page
 * would be worse than the redirect this replaces.
 *
 * Reads the same status enum as the two route guards. `expired` renders the landing
 * page rather than redirecting, which is right: someone whose session lapsed should
 * see the front door, not be thrown at a guard that sends them somewhere else.
 */
// Organisations became groups; old links keep working, query string and all.
function OrganizationRedirect() {
  const { orgId } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/groups${orgId ? `/${orgId}` : ''}${search}`} replace />;
}

function RootRedirect() {
  const { status } = useAuthToken();
  if (status === 'refreshing') return <div style={{ minHeight: '100vh' }} />;
  if (status !== 'valid') return <Landingpage />;
  return (
    <NavigationPannel>
      <Board />
    </NavigationPannel>
  );
}

function App() {
  return (
    <div className="App">
      {/* Above the routes on purpose: the sign-in prompt has to reach the public
          pages that render outside AuthenticatedLayout, which is most of them. */}
      <AuthGateProvider>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <Routes>
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
          <Route path="/signin" element={<GuestRoute><Signin /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/" element={<RootRedirect />} />
        
          {/* Protected Routes grouped under persistent layout */}
          <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
            {/* The post-auth landing for every password sign-in without a ?next=
                and every social sign-in, via nextDestination's FALLBACK. It used
                to point at /community; pointing it anywhere that does not resolve
                404s sign-in itself, which is why the fallback stays /home and
                only its destination moves. */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            {/* Trips merged into Profile, which already carried the same data
                from the same endpoint. Redirected rather than removed: the path
                is in people's history and muscle memory, and a 404 there would
                read as lost work. */}
            <Route path="/dashboard" element={<Navigate to="/profile?tab=trips" replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/tripicianai" element={<TripicianAIPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/operator" element={<OperatorPage />} />
            <Route path="/groups" element={<OrganizationsPage />} />
            <Route path="/groups/:orgId" element={<OrganizationWorkspace />} />
            <Route path="/organizations" element={<OrganizationRedirect />} />
            <Route path="/organizations/:orgId" element={<OrganizationRedirect />} />
          </Route>
          {/* Semi-public routes: full app layout but no auth gate - guests can browse, login prompted on action */}
          <Route element={<AuthenticatedLayout />}>
            {/* Semi-public: a guest can browse, and signing in is prompted on the
                action rather than at the door. */}
            <Route path="/stories" element={<BrowsePage />} />
            {/* Instagram-style search: people, places, plans, stories, groups, tags. noindex. */}
            <Route path="/search" element={<SearchPage />} />
            {/* Finding a person and copying a starting point are lookups, not
                browsing, and both deserve a URL. */}
            <Route path="/crew" element={<Crew />} />
            <Route path="/templates" element={<Templates />} />
            {/* One library, filtered. /trips is in links and history, so it lands there. */}
            <Route path="/trips" element={<Navigate to="/stories?kind=plans" replace />} />
            {/* Short notes from travellers. Semi-public: browsing needs no account, posting does. */}
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/post/:postId" element={<PostPage />} />
            <Route path="/traveler/:userId" element={<TravelerProfile />} />
            {/* A group's public page, inside the shell so browsing groups never drops the nav. */}
            <Route path="/o/:slug" element={<OrganizationProfilePage />} />
            {/* Where an invite link lands. A guest sees the group first and signs in to join. */}
            <Route path="/join/group/:token" element={<JoinGroupPage />} />
            <Route path="/join/trip/:token" element={<JoinTripPage />} />
          </Route>
          {/* Trip Planner entry: redirect /tripplanner -> /tripplanner/:generatedId (reusing last draft if available) */}
          <Route path="/tripplanner" element={<ProtectedRoute><TripPlannerEntry /></ProtectedRoute>} />
          <Route path="/tripplanner/:tripId" element={<ProtectedRoute><TripPlannerRoute /></ProtectedRoute>} />
          {/* Read-only trip view route (partially public: published/shared trips viewable without login) */}
          <Route path="/trip/:tripId" element={<TripView />} />
          {/* After Story editor. Protected and noindex: a draft is private by definition. */}
          <Route path="/story/:storyId/edit" element={<ProtectedRoute><StoryEditPage /></ProtectedRoute>} />
          {/* Public story. Registered AFTER /edit so the more specific pattern
              wins, and left ungated so a shared link works for a signed-out
              reader. The server decides what a draft looks like to a stranger. */}
          <Route path="/story/:slugOrId" element={<StoryPage />} />
          {/* Legacy path redirect */}
          <Route path="/create-trip" element={<Navigate to="/error/404" replace />} />
          {/* Where an email footer lands. Ungated on purpose: the reader is in a
              mail client and may have no session, so the signed link is the only
              authority. Behind the gate it would demand a login to stop emails,
              which is the opposite of withdrawal being as easy as consent. */}
          <Route path="/unsubscribe" element={<UnsubscribePage />} />

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
          {/* Retired feed URLs. Browse is the content they indexed and it is public, so a guest is not bounced to the landing page. */}
          {/* vercel.json sends the same two as real 301s in production; these cover dev and any path that skips the CDN. */}
          <Route path="/discover" element={<Navigate to="/stories" replace />} />
          <Route path="/community" element={<Navigate to="/stories" replace />} />
        
          {/* Final catch-all -> 404 page */}
          <Route path="*" element={<NotFound404 />} />
        </Routes>
      </Suspense>
      </AuthGateProvider>
      <Suspense fallback={null}>
        <SuccessOverlay />
      </Suspense>
      <ActivityHeartbeat />
    </div>
  )
}

export default App
