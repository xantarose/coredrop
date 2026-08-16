import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCookie } from '../../contexts/CookieContext'
import './CookieBanner.css'

const CookieBanner = () => {
  const { showBanner, acceptCookies, declineCookies } = useCookie()

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          className="cookie-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="cookie-content">
            <div className="cookie-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" fill="url(#cookieGradient)" />
                <circle cx="12" cy="12" r="2" fill="white" opacity="0.8" />
                <circle cx="20" cy="14" r="1.5" fill="white" opacity="0.6" />
                <circle cx="14" cy="20" r="1.5" fill="white" opacity="0.7" />
                <circle cx="21" cy="21" r="2" fill="white" opacity="0.8" />
                <defs>
                  <linearGradient id="cookieGradient" x1="2" y1="2" x2="30" y2="30">
                    <stop offset="0%" stopColor="#f59e42" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
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
              <motion.button
                className="cookie-btn cookie-btn-secondary"
                onClick={declineCookies}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Отклонить
              </motion.button>
              <motion.button
                className="cookie-btn cookie-btn-primary"
                onClick={acceptCookies}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Принять
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CookieBanner
