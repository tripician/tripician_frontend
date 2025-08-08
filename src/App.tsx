import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Signin from './components/pages/AuthPage/Signin'
import Signup from './components/pages/AuthPage/Signup'
import Dashboard from './components/pages/DashboardPage/Dashboard'
import Profile from './components/pages/ProfilePage/Profile'
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
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/profile" element={<Navigate to="/profile" replace />} />
        
        {/* Catch all - redirect to signin */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </div>
  )
}

export default App