import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { useToast } from '../contexts/ToastContext'
import '../components/auth/AuthForm.css'

const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')

  useEffect(() => {
    const resetToken = sessionStorage.getItem('reset_token')
    if (!resetToken) {
      navigate('/forgot-password', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (newPassword.length === 0) {
      setPasswordStrength('weak')
    } else if (newPassword.length < 8) {
      setPasswordStrength('weak')
    } else if (newPassword.length < 12) {
      setPasswordStrength('medium')
    } else {
      setPasswordStrength('strong')
    }
  }, [newPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', title: 'Ошибка', message: 'Пароли не совпадают' })
      return
    }

    if (newPassword.length < 8) {
      addToast({ type: 'error', title: 'Ошибка', message: 'Пароль должен быть не менее 8 символов' })
      return
    }

    setLoading(true)

    try {
      const resetToken = sessionStorage.getItem('reset_token')
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        sessionStorage.removeItem('reset_token')
        addToast({ type: 'success', title: 'Пароль изменен', message: 'Войдите с новым паролем' })
        navigate('/login')
      } else {
        addToast({ type: 'error', title: 'Ошибка', message: data.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', message: 'Не удалось подключиться к серверу' })
    } finally {
      setLoading(false)
    }
  }

  const passwordStrengthLabel = {
    weak: 'Слабый пароль',
    medium: 'Средний пароль',
    strong: 'Надежный пароль'
  }[passwordStrength]

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <div className="auth-logo" onClick={() => navigate('/')}>
            <Logo width={48} height={48} />
          </div>
          <h1 className="auth-title">Новый пароль</h1>
          <p className="auth-subtitle">Создайте новый пароль для вашего аккаунта.</p>
        </div>

        <div className="auth-body">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">Новый пароль</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={16} aria-hidden="true" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  className="form-input has-icon-left has-icon-right"
                  placeholder="Минимум 8 символов"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className={`password-strength password-strength-${passwordStrength}`} aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p className="password-strength-label">{passwordStrengthLabel}</p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Подтвердите пароль</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={16} aria-hidden="true" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="form-input has-icon-left has-icon-right"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить пароль'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="auth-switch">
            Вспомнили пароль?{' '}
            <button type="button" onClick={() => navigate('/login')} disabled={loading}>
              Войти
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default ResetPassword
