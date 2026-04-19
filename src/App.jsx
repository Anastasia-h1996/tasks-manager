import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Tasks from './pages/Tasks'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tasks" element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={   // ← НОВЫЙ МАРШРУТ
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />        
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App