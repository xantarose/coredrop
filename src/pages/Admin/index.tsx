import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Dashboard from './Dashboard'
import Users from './Users'
import '../../styles/Admin.css'

const Admin: React.FC = () => {
  const location = useLocation()
  const currentPath = location.pathname
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const renderContent = () => {
    if (currentPath === '/me/admin/users') {
      return <Users />
    }
    return <Dashboard />
  }

  const getPageTitle = () => {
    if (currentPath === '/me/admin/users') {
      return 'Пользователи'
    }
    return 'Статистика'
  }

  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="admin-container">
      <div className="admin-mobile-header">
        <h2 className="admin-mobile-title">{getPageTitle()}</h2>
        <button
          className="admin-mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>Панель Управления</h2>
          <button
            className="admin-mobile-toggle"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <nav className="admin-nav">
          <Link
            to="/me/admin"
            className={currentPath === '/me/admin' ? 'admin-nav-link active' : 'admin-nav-link'}
            onClick={handleNavClick}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4-2h2v20h-2zm4 4h2v16h-2z"/>
            </svg>
            <span>Статистика</span>
          </Link>
          <Link
            to="/me/admin/users"
            className={currentPath === '/me/admin/users' ? 'admin-nav-link active' : 'admin-nav-link'}
            onClick={handleNavClick}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <span>Пользователи</span>
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-back-link" onClick={handleNavClick}>
            ← Вернуться на главную
          </Link>
        </div>
      </aside>
      <main className="admin-main">
        {renderContent()}
      </main>
    </div>
  )
}

export default Admin
