import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { CookieProvider } from './contexts/CookieContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ToastNotification from './components/ToastNotification'
import Layout from './components/layout/Layout'

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <CookieProvider>
          <AuthProvider>
            <ToastProvider>
              <Layout />
              <ToastNotification />
            </ToastProvider>
          </AuthProvider>
        </CookieProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
