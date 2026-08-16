import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import Hero from '../sections/Hero'
import Features from '../sections/Features'
import Pricing from '../sections/Pricing'
import FAQ from '../sections/FAQ'
import CookieBanner from '../ui/CookieBanner'
import Login from '../../pages/Login'
import Register from '../../pages/Register'
import Verify2FA from '../../pages/Verify2FA'
import Dashboard from '../../pages/Dashboard'
import NotFound from '../../pages/NotFound'
import ProtectedRoute from '../auth/ProtectedRoute'
import PublicRoute from '../auth/PublicRoute'
import Verify2FARoute from '../auth/Verify2FARoute'
import ResetPasswordRoute from '../auth/ResetPasswordRoute'
import ResetPasswordLinkRoute from '../auth/ResetPasswordLinkRoute'
import AdminRoute from '../auth/AdminRoute'
import PublicShare from '../../pages/PublicShare'
import Legal from '../../pages/Legal'
import Admin from '../../pages/Admin'
import ForgotPassword from '../../pages/ForgotPassword'
import VerifyResetCode from '../../pages/VerifyResetCode'
import ResetPassword from '../../pages/ResetPassword'
import ResetPasswordFromLink from '../../pages/ResetPasswordFromLink'

const Layout = () => {
  const location = useLocation()
  
  const isDashboard = location.pathname.startsWith('/me/')
  const isPublicShare = location.pathname.startsWith('/s/')
  const isAuthPage = ['/login', '/register', '/verify-2fa', '/forgot-password', '/verify-reset-code', '/reset-password'].includes(location.pathname) || location.pathname.startsWith('/reset-password-link')
  
  const showHeaderFooter = !isDashboard && !isAuthPage && !isPublicShare && location.pathname !== '/legal'

  return (
    <div className="app-layout">
      {showHeaderFooter && <Header />}
      
      <main className={isDashboard ? 'dashboard-layout-main' : 'site-main'}>
        <Routes>
          <Route path="/" element={
            <div className="landing-page">
              <Hero />
              <Features />
              <Pricing />
              <FAQ />
            </div>
          } />
          
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/verify-2fa" element={<Verify2FARoute><Verify2FA /></Verify2FARoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-reset-code" element={<VerifyResetCode />} />
          <Route path="/reset-password" element={<ResetPasswordRoute><ResetPassword /></ResetPasswordRoute>} />
          <Route path="/reset-password-link" element={<ResetPasswordLinkRoute><ResetPasswordFromLink /></ResetPasswordLinkRoute>} />
          
          <Route path="/me/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          <Route path="/s/:token" element={<PublicShare />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {showHeaderFooter && <Footer />}
      {showHeaderFooter && <CookieBanner />}
    </div>
  )
}

export default Layout
