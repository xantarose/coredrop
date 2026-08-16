import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import './AuthForm.css'

interface ResetPasswordRouteProps {
  children: React.ReactNode
}

const ResetPasswordRoute: React.FC<ResetPasswordRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const validateToken = async () => {
      const resetToken = sessionStorage.getItem('reset_token')

      if (!resetToken) {
        setIsValid(false)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resetToken })
        })

        setIsValid(response.ok)
      } catch (error) {
        setIsValid(false)
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [])

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

export default ResetPasswordRoute
