import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Landingpage from './pages/LandingPage/LandingPage'
import ProtectedRoute from './services/APIs/Auth/ProtectedRoute'
import GuestRoute from './services/APIs/Auth/GuestRoute'
import TermsPage from './pages/InfoPages/TermsPage';
import PrivacyPage from './pages/InfoPages/PrivacyPage';
import AboutPage from './pages/InfoPages/AboutPage';
import BlogsList from './pages/BlogsPage/BlogsList';
import BlogPost from './pages/BlogsPage/BlogPost';

const Signin = lazy(() => import('./pages/AuthPage/Signin'))
const Signup = lazy(() => import('./pages/AuthPage/Signup'))
const ForgotPassword = lazy(() => import('./pages/AuthPage/ForgotPassword'))
const Callback = lazy(() => import('./pages/AuthPage/Callback'))
const AuthenticatedLayout = lazy(() => import('./pages/PageLayout/AuthenticatedLayout'))
const SuccessOverlay = lazy(() => import('./components/CommonComponents/SuccessOverlay'))
const Home = lazy(() => import('./pages/HomePage/Home'))
const Dashboard = lazy(() => import('./pages/DashboardPage/Dashboard'))
const Profile = lazy(() => import('./pages/ProfilePage/Profile'))
const Community = lazy(() => import('./pages/CommunityPage/Community'))
const Settings = lazy(() => import('./pages/SettingsPage/Settings'))
const RiskMonitor = lazy(() => import('./pages/RiskMonitorPage/RiskMonitor'))
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

// Import debug utilities for development
if (import.meta.env.DEV) {
  import('./utils/authDebug');
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
          <Route path="/" element={<Landingpage />} />
        
          {/* Protected Routes grouped under persistent layout */}
          <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/community" element={<Community />} />
            <Route path="/risk-monitor" element={<RiskMonitor />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Trip Planner entry: redirect /tripplanner -> /tripplanner/:generatedId (reusing last draft if available) */}
          <Route path="/tripplanner" element={<ProtectedRoute><TripPlannerEntry /></ProtectedRoute>} />
          <Route path="/tripplanner/:tripId" element={<ProtectedRoute><TripPlannerRoute /></ProtectedRoute>} />
          {/* Read-only trip view route */}
          <Route path="/trip/:tripId" element={<ProtectedRoute><TripView /></ProtectedRoute>} />
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
        
          {/* Blog routes — public, no auth required (SEO) */}
          <Route path="/blog" element={<BlogsList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        
          {/* Final catch-all -> 404 page */}
          <Route path="*" element={<NotFound404 />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <SuccessOverlay />
      </Suspense>
    </div>
  )
}

export default App