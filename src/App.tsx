import { Routes, Route } from 'react-router-dom'
import './App.css'
import Signin from './components/pages/AuthPage/Signin'
import Signup from './components/pages/AuthPage/Signup'
import Dashboard from './components/pages/Dashboardpage/Dashboard'

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
    </>
  )
}

export default App
