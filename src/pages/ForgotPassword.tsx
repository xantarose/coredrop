import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Mail } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { useToast } from '../contexts/ToastContext'
import '../components/auth/AuthForm.css'

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        sessionStorage.setItem('reset_email', email.trim().toLowerCase())
        addToast({ type: 'success', title: 'Письмо отправлено', message: 'Проверьте вашу почту и следуйте ссылке' })
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
          <h1 className="auth-title">Восстановление пароля</h1>
          <p className="auth-subtitle">Введите email, чтобы получить ссылку для сброса пароля.</p>
        </div>

        <div className="auth-body">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={16} aria-hidden="true" />
                </span>
                <input
                  type="email"
                  id="email"
                  className="form-input has-icon-left"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить ссылку'}
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

export default ForgotPassword
