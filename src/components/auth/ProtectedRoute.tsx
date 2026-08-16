import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getMe, isAuthenticated } from '../../lib/api'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        setAuthenticated(false)
        setLoading(false)
        return
      }

      try {
        await getMe()
        setAuthenticated(true)
      } catch (error) {
        setAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div style={{
          fontSize: '1.5rem',
          color: 'var(--text-secondary)'
        }}>
          Загрузка...
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
