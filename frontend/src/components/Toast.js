import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import './Toast.css';

// Create Toast Context
const ToastContext = createContext(null);

// Toast types and their icons
const TOAST_TYPES = {
  success: { icon: 'fas fa-check-circle', color: '#4CAF50' },
  error: { icon: 'fas fa-times-circle', color: '#f44336' },
  warning: { icon: 'fas fa-exclamation-triangle', color: '#ff9800' },
  info: { icon: 'fas fa-info-circle', color: '#2196F3' }
};

// Individual Toast Component
const Toast = ({ id, type, message, onClose, duration = 4000 }) => {
  const [isExiting, setIsExiting] = useState(false);
  const toastConfig = TOAST_TYPES[type] || TOAST_TYPES.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon" style={{ color: toastConfig.color }}>
        <i className={toastConfig.icon}></i>
      </div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
      <button className="toast-close" onClick={handleClose}>
        <i className="fas fa-times"></i>
      </button>
      <div 
        className="toast-progress" 
        style={{ 
          backgroundColor: toastConfig.color,
          animation: `progress ${duration}ms linear forwards`
        }}
      ></div>
    </div>
  );
};

// Toast Container Component
export const ToastContainer = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = {
    success: (message, duration) => addToast('success', message, duration),
    error: (message, duration) => addToast('error', message, duration),
    warning: (message, duration) => addToast('warning', message, duration),
    info: (message, duration) => addToast('info', message, duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast
            key={t.id}
            id={t.id}
            type={t.type}
            message={t.message}
            duration={t.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastContainer');
  }
  return context;
};

export default Toast;
