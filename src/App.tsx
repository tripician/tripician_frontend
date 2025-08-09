import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Signin from './components/pages/AuthPage/Signin'
import Signup from './components/pages/AuthPage/Signup'
import Dashboard from './components/pages/Dashboardpage/Dashboard'
import Profile from './components/pages/ProfilePage/Profile'
import Home from './components/pages/HomePage/Home'
import Community from './components/pages/CommunityPage/Community'
import Settings from './components/pages/SettingsPage/Settings'
import ProtectedRoute from './services/ProtectedRoute'

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
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