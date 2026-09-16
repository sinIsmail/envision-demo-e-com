
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import Profile from './pages/profile';
import Cart from './pages/cart'
import Admin from "./Admin/admin";
import Login from './Auth/login'
import Signup from './Auth/signup'
import ProtectedRoute from './components/protectedRoute'

export function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/Profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/Cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/Admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            
            <Route path="/Login" element={<Login />} />
            <Route path="/Signup" element={<Signup />} />
          
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
