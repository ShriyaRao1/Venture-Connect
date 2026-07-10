import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home          from './pages/Home';
import Login         from './pages/Login';
import Register      from './pages/Register';
import Startups      from './pages/Startups';
import StartupDetail from './pages/StartupDetail';
import Dashboard     from './pages/Dashboard';
import Investors     from './pages/Investors';
import Messages      from './pages/Messages';
import CreateStartup from './pages/CreateStartup';
import AdminPanel    from './pages/AdminPanel';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#161616',
              color: '#f0f0f0',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
            success: { iconTheme: { primary: '#00c853', secondary: '#0c0c0c' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#0c0c0c' } },
          }}
        />

        <Navbar />

        <Routes>
          {/* Public */}
          <Route path="/"             element={<Home />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/forgot-password"   element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/startups"          element={<Startups />} />
          {/* /new must be before /:id or React Router will match 'new' as an id */}
          <Route path="/startups/new"      element={<ProtectedRoute allowedRoles={['founder']}><CreateStartup /></ProtectedRoute>} />
          <Route path="/startups/:id/edit" element={<ProtectedRoute allowedRoles={['founder']}><CreateStartup /></ProtectedRoute>} />
          <Route path="/startups/:id"      element={<StartupDetail />} />
          <Route path="/investors"    element={<Investors />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/messages"  element={<ProtectedRoute><Messages /></ProtectedRoute>} />

          {/* Admin only */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-4 text-center px-4">
              <p className="text-7xl font-black text-[#1e1e1e]">404</p>
              <p className="text-sm text-[#555]">Page not found</p>
              <a href="/" className="btn-al px-5 py-2 text-sm rounded-md mt-2">← Go Home</a>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
