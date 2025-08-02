import { Routes, Route } from 'react-router-dom'
import './App.css'
import Signin from './components/pages/AuthPages/Signin'
import Signup from './components/pages/AuthPages/Signup'

function App() {
  return (
    <>
    <Routes>
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
    </>
  )
}

export default App
