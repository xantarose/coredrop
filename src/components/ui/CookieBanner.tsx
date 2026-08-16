import React from 'react'
import { useCookie } from '../../contexts/CookieContext'
import './CookieBanner.css'

const CookieBanner = () => {
  const { showBanner, acceptCookies, declineCookies } = useCookie()

  if (!showBanner) return null

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <div className="cookie-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" fill="#d97706" />
            <circle cx="12" cy="12" r="2" fill="white" opacity="0.8" />
            <circle cx="20" cy="14" r="1.5" fill="white" opacity="0.6" />
            <circle cx="14" cy="20" r="1.5" fill="white" opacity="0.7" />
            <circle cx="21" cy="21" r="2" fill="white" opacity="0.8" />
          </svg>
        </div>

        <div className="cookie-text">
          <h3>Мы используем cookies</h3>
          <p>
            Этот сайт использует файлы cookie для улучшения вашего опыта.
            Продолжая использовать сайт, вы соглашаетесь с нашей политикой конфиденциальности.
          </p>
        </div>

        <div className="cookie-actions">
          <button
            className="cookie-btn cookie-btn-secondary"
            onClick={declineCookies}
          >
            Отклонить
          </button>
          <button
            className="cookie-btn cookie-btn-primary"
            onClick={acceptCookies}
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  )
}

export default CookieBanner
