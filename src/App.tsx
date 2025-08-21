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
        
        {/* Protected Routes */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/community" 
          element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        
        {/* Catch all - redirect to signin */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </div>
  )
}

export default App