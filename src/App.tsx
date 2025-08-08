import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Signin from './components/pages/AuthPage/Signin'
import Signup from './components/pages/AuthPage/Signup'
import Dashboard from './components/pages/DashboardPage/Dashboard'
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
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all - redirect to signin */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </div>
  )
}

export default App