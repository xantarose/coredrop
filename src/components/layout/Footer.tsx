import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'
import { footerLinksData } from './footerLinks'
import './Footer.css'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-logo">
            <Logo width={32} height={32} />
            <span className="footer-logo-text">CoreDrop</span>
          </div>
        </div>

        <div className="footer-line"></div>

        <div className="footer-body">
          <nav className="footer-column">
            <h4>Продукт</h4>
            <ul>
              {footerLinksData.product.map((link, index) => (
                <li key={index}>
                  {link.disabled ? (
                    <span className="disabled-link">
                      {link.title}
                      {link.badge && <span className="badge">{link.badge}</span>}
                    </span>
                  ) : (
                    <a href={link.href}>{link.title}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer-column">
            <h4>Компания</h4>
            <ul>
              {footerLinksData.company.map((link, index) => (
                <li key={index}>
                  {link.disabled ? (
                    <span className="disabled-link">
                      {link.title}
                    </span>
                  ) : link.href.startsWith('http') ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer">{link.title}</a>
                  ) : (
                    <a href={link.href}>{link.title}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer-column">
            <h4>Условия и Лицензии</h4>
            <ul>
              {footerLinksData.legal.map((link, index) => (
                <li key={index}>
                  <Link to={link.href}>{link.title}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="footer-line"></div>

        <div className="footer-bottom">
          <div className="footer-info">
            <p className="company-info-text">ООО &quot;Коредроп Девелопмент&quot;</p>
            <p className="copyright-text">&copy; {currentYear} CoreDrop. Все права защищены.</p>
          </div>
          <div className="footer-socials">
            <a href="https://t.me/coredropteam" target="_blank" rel="noopener noreferrer" className="social-link telegram-large" aria-label="Telegram">
              <img src="/telegram.svg" alt="Telegram" width="28" height="28" style={{ display: 'block' }} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
