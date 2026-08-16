import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { login } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

const LoginForm = () => {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userData = await login(email, password)

      if (userData && 'requires2FA' in userData && userData.requires2FA) {
        navigate('/verify-2fa')
        return
      }

      setUser(userData)
      navigate('/me/dashboard')
    } catch (err: any) {
      setError(err.message || 'Ошибка при входе')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="email" className="form-label">Email</label>
        <div className="input-wrapper">
          <span className="input-icon-left">
            <Mail size={16} aria-hidden="true" />
          </span>
          <input
            id="email"
            className="form-input has-icon-left"
            placeholder="example@mail.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="password" className="form-label">Пароль</label>
          <button
            type="button"
            className="forgot-link"
            onClick={() => navigate('/forgot-password')}
            disabled={loading}
          >
            Забыли пароль?
          </button>
        </div>
        <div className="input-wrapper">
          <span className="input-icon-left">
            <Lock size={16} aria-hidden="true" />
          </span>
          <input
            id="password"
            className="form-input has-icon-left has-icon-right"
            placeholder="Введите пароль"
            type={isVisible ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setIsVisible(!isVisible)}
            disabled={loading}
            aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="checkbox-row">
        <input
          id="remember-me"
          type="checkbox"
          className="auth-checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={loading}
        />
        <label htmlFor="remember-me" className="checkbox-text">
          Запомнить меня на 30 дней
        </label>
      </div>

      <button type="submit" className="auth-submit" disabled={loading}>
        {loading ? 'Вход...' : 'Войти'}
        {!loading && <ArrowRight size={16} />}
      </button>

      <div className="auth-switch">
        Нет аккаунта?{' '}
        <button type="button" onClick={() => navigate('/register')} disabled={loading}>
          Создать аккаунт
        </button>
      </div>
    </form>
  )
}

export default LoginForm
