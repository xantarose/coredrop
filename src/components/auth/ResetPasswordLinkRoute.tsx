import React, { useEffect, useState } from 'react'
import { Navigate, useSearchParams, useLocation } from 'react-router-dom'
import './AuthForm.css'

interface ResetPasswordLinkRouteProps {
  children: React.ReactNode
}

const ResetPasswordLinkRoute: React.FC<ResetPasswordLinkRouteProps> = ({ children }) => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token || location.pathname !== '/reset-password-link') {
      setIsValid(false)
    } else {
      setIsValid(true)
    }
    setLoading(false)
  }, [searchParams, location])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">Загрузка...</div>
      </div>
    )
  }

  if (!isValid) {
    return <Navigate to="/forgot-password" replace />
  }

  return <>{children}</>
}

export default ResetPasswordLinkRoute
