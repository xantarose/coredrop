import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import Logo from '../components/ui/Logo'
import '../components/auth/AuthForm.css'
import './Verify2FA.css'

const Verify2FA: React.FC = () => {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState(5)
  const [timeLeft, setTimeLeft] = useState(300)
  const [isBackupMode, setIsBackupMode] = useState(false)
  const [email, setEmail] = useState('')
  const [showCode, setShowCode] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tempToken = localStorage.getItem('temp_2fa_token')
    const storedEmail = localStorage.getItem('temp_2fa_email')

    if (!tempToken) {
      navigate('/login', { replace: true })
      return
    }

    if (storedEmail) {
      setEmail(storedEmail)
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          localStorage.removeItem('temp_2fa_token')
          localStorage.removeItem('temp_2fa_email')
          navigate('/login', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  useEffect(() => {
    if (code.length === 6 && !loading) {
      handleVerify()
    }
  }, [code])

  useEffect(() => {
    if (!isBackupMode) {
      inputRef.current?.focus()
    }
  }, [isBackupMode])

  const handleVerify = async () => {
    const tempToken = localStorage.getItem('temp_2fa_token')
    if (!tempToken) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('auth_token', data.token)
        localStorage.removeItem('temp_2fa_token')
        localStorage.removeItem('temp_2fa_email')
        window.location.href = '/me/dashboard'
      } else {
        setError(data.error || 'Неверный код')
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft)
        }
        setCode('')
        inputRef.current?.focus()
      }
    } catch (err) {
      setError('Ошибка соединения')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleBackupVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const tempToken = localStorage.getItem('temp_2fa_token')
    if (!tempToken || !backupCode.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-2fa-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, backupCode: backupCode.trim() })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('auth_token', data.token)
        localStorage.removeItem('temp_2fa_token')
        localStorage.removeItem('temp_2fa_email')
        window.location.href = '/me/dashboard'
      } else {
        setError(data.error || 'Неверный резервный код')
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft)
        }
        setBackupCode('')
      }
    } catch (err) {
      setError('Ошибка соединения')
      setBackupCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    const tempToken = localStorage.getItem('temp_2fa_token')
    if (!tempToken) return

    try {
      await fetch('/api/auth/cancel-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken })
      })
    } catch (err) {
      console.error('Cancel error:', err)
    } finally {
      localStorage.removeItem('temp_2fa_token')
      localStorage.removeItem('temp_2fa_email')
      navigate('/login', { replace: true })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCodeChange = (value: string) => {
    const filtered = value.replace(/\D/g, '').slice(0, 6)
    setCode(filtered)
    setError('')
  }

  const progressPercent = (timeLeft / 300) * 100

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-wide">
        <motion.div
          className="auth-body verify-2fa-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-header">
            <div className="auth-logo" onClick={() => navigate('/')}>
              <Logo width={48} height={48} />
            </div>
            <h1 className="auth-title">Двухфакторная аутентификация</h1>
            <p className="auth-subtitle auth-subtitle-break">
              {email ? `Код отправлен на ${email}` : 'Введите код из приложения'}
            </p>
          </div>

          <div className="auth-timer">
            <div className="auth-progress-bar">
              <motion.div
                className={`auth-progress-fill ${progressPercent <= 30 ? 'is-danger' : ''}`}
                initial={{ width: '100%' }}
                animate={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="auth-timer-text">{formatTime(timeLeft)}</div>
          </div>

          <AnimatePresence mode="wait">
            {!isBackupMode ? (
              <motion.div
                key="code-mode"
                className="verify-2fa-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="code-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    className="code-input"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    disabled={loading}
                  />
                  <div className="code-display">
                    <div className="code-boxes-group">
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`code-box ${code[i] ? 'filled' : ''}`} onClick={() => inputRef.current?.focus()}>
                          {showCode ? (code[i] || '0') : (code[i] ? '*' : '0')}
                        </div>
                      ))}
                    </div>
                    <div className="code-separator">-</div>
                    <div className="code-boxes-group">
                      {[3, 4, 5].map(i => (
                        <div key={i} className={`code-box ${code[i] ? 'filled' : ''}`} onClick={() => inputRef.current?.focus()}>
                          {showCode ? (code[i] || '0') : (code[i] ? '*' : '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="toggle-visibility-btn"
                    onClick={() => setShowCode(!showCode)}
                    disabled={loading}
                    title={showCode ? 'Скрыть код' : 'Показать код'}
                    aria-label={showCode ? 'Скрыть код' : 'Показать код'}
                  >
                    {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && (
                  <motion.div
                    className="verify-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                      <circle cx="9" cy="9" r="7" strokeWidth="1.5"/>
                      <path d="M9 5V9" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M9 12V12.5" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {error}
                  </motion.div>
                )}

                <div className="auth-meta">
                  Осталось попыток: <strong>{attemptsLeft}</strong>
                </div>

                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={() => setIsBackupMode(true)}
                  disabled={loading}
                >
                  Использовать резервный код
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="backup-mode"
                className="verify-2fa-form"
                onSubmit={handleBackupVerify}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="form-group backup-input-wrapper">
                  <label className="form-label">Резервный код</label>
                  <input
                    type="text"
                    className="form-input backup-input"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.div
                    className="verify-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                      <circle cx="9" cy="9" r="7" strokeWidth="1.5"/>
                      <path d="M9 5V9" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M9 12V12.5" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {error}
                  </motion.div>
                )}

                <div className="auth-meta">
                  Осталось попыток: <strong>{attemptsLeft}</strong>
                </div>

                <div className="backup-actions">
                  <motion.button
                    type="submit"
                    className="auth-submit"
                    disabled={loading || !backupCode.trim()}
                    whileHover={!loading && backupCode.trim() ? { scale: 1.02 } : {}}
                    whileTap={!loading && backupCode.trim() ? { scale: 0.98 } : {}}
                  >
                    {loading ? 'Проверка...' : 'Подтвердить'}
                  </motion.button>
                  <button
                    type="button"
                    className="auth-secondary-btn"
                    onClick={() => {
                      setIsBackupMode(false)
                      setBackupCode('')
                      setError('')
                    }}
                    disabled={loading}
                  >
                    Вернуться к коду
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.button
            className="auth-secondary-btn"
            onClick={handleCancel}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Отменить вход
          </motion.button>

          <div className="verify-2fa-footer">
            <p className="footer-hint">
              Откройте приложение аутентификации на вашем устройстве, чтобы получить код
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Verify2FA
