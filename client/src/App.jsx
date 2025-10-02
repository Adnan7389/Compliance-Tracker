import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
// import Layout from './components/layout/Layout';
// import Login from './pages/auth/Login';
// import Register from './pages/auth/Register';
// import Dashboard from './pages/dashboard/Dashboard';
// import StaffManagement from './pages/dashboard/StaffManagement';
// import TaskManagement from './pages/dashboard/TaskManagement';
// import NotFound from './pages/NotFound';
import Loader from './components/ui/Loader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <Loader />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <Loader />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <h1>Welcome To compliance Tracker</h1>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;