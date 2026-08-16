import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import Logo from '../ui/Logo'
import './Header.css'

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    setUserMenuOpen(false)
    await logout()
  }

  const handleDashboard = () => {
    setMenuOpen(false)
    setUserMenuOpen(false)
    navigate('/me/dashboard')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container header-container">
        <div className="logo" onClick={() => navigate('/')}>
          <Logo width={32} height={32} />
          <span className="logo-text">CoreDrop</span>
        </div>

        <nav className={`nav ${menuOpen ? 'open' : ''}`}>
          <a href="#features" className="nav-link">
            <span className="nav-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
            <span className="nav-text">Возможности</span>
          </a>
          <a href="#pricing" className="nav-link">
            <span className="nav-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </span>
            <span className="nav-text">Цены</span>
          </a>
          <a href="#about" className="nav-link">
            <span className="nav-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <span className="nav-text">О нас</span>
          </a>
          <a href="https://t.me/coredropteam" target="_blank" rel="noopener noreferrer" className="nav-link">
            <span className="nav-icon">
              <img src="/telegram.svg" alt="Telegram" width="14" height="14" style={{ display: 'block' }} />
            </span>
            <span className="nav-text">Контакты</span>
          </a>

          {!user ? (
            <div className="nav-auth-buttons">
              <a href="/login" className="auth-btn login-btn">
                Вход
              </a>

              <a href="/register" className="auth-btn register-btn">
                Регистрация
              </a>
            </div>
          ) : (
            <div className="nav-user-menu-mobile">
              <button className="user-menu-item-mobile" onClick={handleDashboard}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="6" height="6" rx="1" strokeWidth="1.5"/>
                  <rect x="11" y="3" width="6" height="6" rx="1" strokeWidth="1.5"/>
                  <rect x="3" y="11" width="6" height="6" rx="1" strokeWidth="1.5"/>
                  <rect x="11" y="11" width="6" height="6" rx="1" strokeWidth="1.5"/>
                </svg>
                Перейти в панель
              </button>

              <button className="user-menu-item-mobile logout" onClick={handleLogout}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M13 3H17V17H13M8 14L12 10L8 6M12 10H3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Выйти
              </button>
            </div>
          )}
        </nav>

        <div className="header-actions">
          {!user ? (
            <>
              <a href="/login" className="auth-btn login-btn">
                Вход
              </a>

              <a href="/register" className="auth-btn register-btn">
                Регистрация
              </a>
            </>
          ) : (
            <div className="user-profile-container" ref={userMenuRef}>
              <div className="user-profile-header" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <div className="user-avatar">
                  {user.avatar_url ? (
                    <img src={`/uploads/${user.avatar_url}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <span className="user-name-header">{user.name}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  className={`dropdown-arrow ${userMenuOpen ? 'open' : ''}`}
                >
                  <path d="M4 6L8 10L12 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {userMenuOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar">
                      {user.avatar_url ? (
                        <img src={`/uploads/${user.avatar_url}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    <div className="user-dropdown-info">
                      <div className="user-dropdown-name">{user.name}</div>
                      <div className="user-dropdown-email">{user.email}</div>
                    </div>
                  </div>

                  <div className="user-dropdown-divider"></div>

                  <button className="user-dropdown-item" onClick={handleDashboard}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                      <rect x="2" y="2" width="5" height="5" rx="1" strokeWidth="1.5"/>
                      <rect x="9" y="2" width="5" height="5" rx="1" strokeWidth="1.5"/>
                      <rect x="2" y="9" width="5" height="5" rx="1" strokeWidth="1.5"/>
                      <rect x="9" y="9" width="5" height="5" rx="1" strokeWidth="1.5"/>
                    </svg>
                    Перейти в панель
                  </button>

                  <div className="user-dropdown-divider"></div>

                  <button className="user-dropdown-item logout-item" onClick={handleLogout}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                      <path d="M12 3H15V15H12M7 12L10 9L7 6M10 9H3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Переключить тему"
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3V1M10 19V17M17 10H19M1 10H3M15.657 4.343L17.071 2.929M2.929 17.071L4.343 15.657M15.657 15.657L17.071 17.071M2.929 2.929L4.343 4.343" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 10.5C16.1 13.5 13.4 15.7 10.2 15.7C6.3 15.7 3.1 12.5 3.1 8.6C3.1 5.4 5.3 2.7 8.3 1.8C8.1 2.3 8 2.9 8 3.5C8 7.4 11.1 10.5 15 10.5C15.6 10.5 16.2 10.4 16.7 10.3L17 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          <button
            className={`menu-toggle ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
