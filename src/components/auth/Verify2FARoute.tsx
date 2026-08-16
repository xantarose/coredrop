import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import './AuthForm.css'

interface Verify2FARouteProps {
  children: React.ReactNode
}

const Verify2FARoute: React.FC<Verify2FARouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [hasTempToken, setHasTempToken] = useState(false)

  useEffect(() => {
    const tempToken = localStorage.getItem('temp_2fa_token')
    setHasTempToken(!!tempToken)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">Загрузка...</div>
      </div>
    )
  }

  if (!hasTempToken) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default Verify2FARoute
