import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './styles/App.css';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import CoursesPage from './pages/CoursesPage';
import TestsPage from './pages/TestsPage';
import QuestionsPage from './pages/QuestionsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import FeedbackPage from './pages/FeedbackPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Components
import Navigation from './components/Navigation';
import { ToastContainer } from './components/Toast';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          // Set authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token with backend
          const response = await axios.get('http://localhost:5000/api/auth/verify');
          
          if (response.data.valid) {
            setIsAuthenticated(true);
            // Use verified user data from server, fallback to localStorage
            const adminData = response.data.user || JSON.parse(localStorage.getItem('adminData'));
            setAdmin(adminData);
          } else {
            // Token invalid, clear stored data
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            delete axios.defaults.headers.common['Authorization'];
            setIsAuthenticated(false);
          }
        } catch (error) {
          // Token verification failed, clear stored data
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          delete axios.defaults.headers.common['Authorization'];
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (token, adminData) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setAdmin(adminData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    delete axios.defaults.headers.common['Authorization'];
    setAdmin(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <ToastContainer>
      <Router>
        {isAuthenticated ? (
          <div className="app-container">
            <Navigation admin={admin} onLogout={handleLogout} />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/tests" element={<TestsPage />} />
                <Route path="/questions" element={<QuestionsPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </Router>
    </ToastContainer>
  );
}

export default App;
