import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Signin from './pages/AuthPage/Signin'
import Signup from './pages/AuthPage/Signup'
import ForgotPassword from './pages/AuthPage/ForgotPassword'
import Landingpage from './pages/LandingPage/LandingPage'
import Dashboard from './pages/DashboardPage/Dashboard'
import Profile from './pages/ProfilePage/Profile'
import Home from './pages/HomePage/Home'
import Community from './pages/CommunityPage/Community'
import Settings from './pages/SettingsPage/Settings'
import ProtectedRoute from './services/APIs/Auth/ProtectedRoute'
import GuestRoute from './services/APIs/Auth/GuestRoute'
import TripPlannerRoute from './pages/CreateTripPage/TripPlannerRoute.tsx'
import TripPlannerEntry from './pages/CreateTripPage/TripPlannerEntry.tsx'
import TripView from './pages/TripViewPage/TripView';
import RiskMonitor from './pages/RiskMonitorPage/RiskMonitor';
import AuthenticatedLayout from './pages/PageLayout/AuthenticatedLayout';
import { NotFound404, InternalError500, UnauthorizedAccess, UnderConstruction, SomethingWentWrong, DynamicErrorPage } from './pages/ErrorPages/ErrorPages';
import SuccessOverlay from './components/CommonComponents/SuccessOverlay';
import TermsPage from './pages/InfoPages/TermsPage';
import PrivacyPage from './pages/InfoPages/PrivacyPage';
import HelpPage from './pages/InfoPages/HelpPage';
import ContactPage from './pages/InfoPages/ContactPage';
import AboutPage from './pages/InfoPages/AboutPage';
import BlogsList from './pages/BlogsPage/BlogsList';
import BlogPost from './pages/BlogsPage/BlogPost';

// Import debug utilities for development
if (import.meta.env.DEV) {
  import('./utils/authDebug');
}

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
        <Route path="/signin" element={<GuestRoute><Signin /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/" element={<GuestRoute><Landingpage /></GuestRoute>} />
        
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
        
        {/* Default redirect */}
        {/* <Route path="/" element={<Navigate to="/home" replace />} /> */}
        
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
      <SuccessOverlay />
    </div>
  )
}

export default App