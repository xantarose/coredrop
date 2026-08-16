import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Hero.css'

const Hero = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleGetStarted = () => {
    if (user) {
      navigate('/me/dashboard')
    } else {
      navigate('/register')
    }
  }

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Новое поколение облачного хранилища
          </div>

          <h1 className="hero-title">
            Храните данные
            <br />
            <span className="blue-text">безопасно и легко</span>
          </h1>

          <p className="hero-description">
            CoreDrop предоставляет современное решение для хранения ваших файлов с максимальной безопасностью, высокой скоростью и простотой использования
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={handleGetStarted}>
              <span>Начать бесплатно</span>
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/login')}>
              <span>Узнать больше</span>
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">10M+</span>
              <span className="stat-label">Пользователей</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">99.9%</span>
              <span className="stat-label">Надежность</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">5PB+</span>
              <span className="stat-label">Данных сохранено</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
