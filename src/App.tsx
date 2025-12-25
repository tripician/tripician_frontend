import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Signin from './pages/AuthPage/Signin'
import Signup from './pages/AuthPage/Signup'
import Dashboard from './pages/DashboardPage/Dashboard'
import Profile from './pages/ProfilePage/Profile'
import Home from './pages/HomePage/Home'
import Community from './pages/CommunityPage/Community'
import Settings from './pages/SettingsPage/Settings'
import ProtectedRoute from './services/APIs/Auth/ProtectedRoute'
import TripPlannerRoute from './pages/CreateTripPage/TripPlannerRoute.tsx'
import TripPlannerEntry from './pages/CreateTripPage/TripPlannerEntry.tsx'
import TripView from './pages/TripViewPage/TripView';
import AuthenticatedLayout from './pages/PageLayout/AuthenticatedLayout';
import { NotFound404, InternalError500, UnauthorizedAccess, UnderConstruction, SomethingWentWrong, DynamicErrorPage } from './pages/ErrorPages/ErrorPages';
import SuccessOverlay from './components/CommonComponents/SuccessOverlay';

// Import debug utilities for development
if (process.env.NODE_ENV === 'development') {
  import('./utils/authDebug');
}

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        
        {/* Protected Routes grouped under persistent layout */}
        <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/community" element={<Community />} />
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
        <Route path="/" element={<Navigate to="/home" replace />} />
        
  {/* Final catch-all -> 404 page */}
  <Route path="*" element={<NotFound404 />} />
      </Routes>
      <SuccessOverlay />
    </div>
  )
}

export default App