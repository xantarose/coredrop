import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, X } from 'lucide-react'
import { register } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

type CaptchaState = 'idle' | 'checking' | 'verified'

const RegisterForm = () => {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [captchaState, setCaptchaState] = useState<CaptchaState>('idle')
  const [captchaProgress, setCaptchaProgress] = useState(0)
  const [isDraggingCaptcha, setIsDraggingCaptcha] = useState(false)
  const captchaTrackRef = useRef<HTMLDivElement>(null)
  const captchaProgressRef = useRef(0)
  const dragStartXRef = useRef(0)
  const dragStartProgressRef = useRef(0)
  const verifyTimerRef = useRef<number | null>(null)
  const submitTimerRef = useRef<number | null>(null)

  const clearCaptchaTimers = () => {
    if (verifyTimerRef.current) {
      window.clearTimeout(verifyTimerRef.current)
      verifyTimerRef.current = null
    }
    if (submitTimerRef.current) {
      window.clearTimeout(submitTimerRef.current)
      submitTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearCaptchaTimers()
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const setCaptchaProgressValue = (value: number) => {
    const nextValue = Math.max(0, Math.min(value, 100))
    captchaProgressRef.current = nextValue
    setCaptchaProgress(nextValue)
  }

  const resetCaptcha = () => {
    clearCaptchaTimers()
    setCaptchaState('idle')
    setIsDraggingCaptcha(false)
    setCaptchaProgressValue(0)
  }

  const submitRegistration = async () => {
    clearCaptchaTimers()
    setLoading(true)
    setCaptchaOpen(false)

    try {
      const userData = await register(formData.email, formData.password, formData.name)
      setUser(userData)
      navigate('/me/dashboard')
    } catch (err: any) {
      setError(err.message || 'Ошибка при регистрации')
      resetCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const confirmCaptcha = () => {
    clearCaptchaTimers()
    setCaptchaProgressValue(100)
    setCaptchaState('checking')
    verifyTimerRef.current = window.setTimeout(() => {
      setCaptchaState('verified')
      submitTimerRef.current = window.setTimeout(() => {
        submitRegistration()
      }, 650)
    }, 4500)
  }

  const handleCaptchaPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (captchaState !== 'idle') {
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDraggingCaptcha(true)
    dragStartXRef.current = e.clientX
    dragStartProgressRef.current = captchaProgressRef.current
  }

  const handleCaptchaPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingCaptcha || captchaState !== 'idle') {
      return
    }

    const trackWidth = captchaTrackRef.current?.offsetWidth || 1
    const availableWidth = Math.max(trackWidth - 56, 1)
    const delta = e.clientX - dragStartXRef.current
    const nextProgress = dragStartProgressRef.current + (delta / availableWidth) * 100
    setCaptchaProgressValue(nextProgress)
  }

  const handleCaptchaPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingCaptcha) {
      return
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setIsDraggingCaptcha(false)

    if (captchaProgressRef.current >= 92) {
      confirmCaptcha()
      return
    }

    setCaptchaProgressValue(0)
  }

  const handleCaptchaClose = () => {
    if (captchaState === 'checking' || loading) {
      return
    }

    setCaptchaOpen(false)
    resetCaptcha()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreeToTerms) {
      setError('Пожалуйста, примите условия использования')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    resetCaptcha()
    setCaptchaOpen(true)
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="name" className="form-label">Имя</label>
        <div className="input-wrapper">
          <span className="input-icon-left">
            <User size={16} aria-hidden="true" />
          </span>
          <input
            id="name"
            name="name"
            className="form-input has-icon-left"
            placeholder="Иван Иванов"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email</label>
        <div className="input-wrapper">
          <span className="input-icon-left">
            <Mail size={16} aria-hidden="true" />
          </span>
          <input
            id="email"
            name="email"
            className="form-input has-icon-left"
            placeholder="example@mail.com"
            type="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Пароль</label>
        <div className="input-wrapper">
          <span className="input-icon-left">
            <Lock size={16} aria-hidden="true" />
          </span>
          <input
            id="password"
            name="password"
            className="form-input has-icon-left has-icon-right"
            placeholder="Минимум 8 символов"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            minLength={8}
            disabled={loading}
            required
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
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword" className="form-label">Подтвердите пароль</label>
        <div className="input-wrapper">
          <span className="input-icon-left">
            <Lock size={16} aria-hidden="true" />
          </span>
          <input
            id="confirmPassword"
            name="confirmPassword"
            className="form-input has-icon-left has-icon-right"
            placeholder="Повторите пароль"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            minLength={8}
            disabled={loading}
            required
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

      {error && <div className="auth-error">{error}</div>}

      <div className="checkbox-row align-start">
        <input
          id="terms"
          type="checkbox"
          className="auth-checkbox"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.target.checked)}
          disabled={loading}
          required
        />
        <label htmlFor="terms" className="checkbox-text">
          Я принимаю{' '}
          <a href="/legal?section=terms" target="_blank">условия использования</a>{' '}
          и{' '}
          <a href="/legal?section=privacy" target="_blank">политику конфиденциальности</a>
        </label>
      </div>

      <button type="submit" className="auth-submit" disabled={loading || captchaOpen}>
        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        {!loading && <ArrowRight size={16} />}
      </button>

      <div className="auth-switch">
        Уже есть аккаунт?{' '}
        <button type="button" onClick={() => navigate('/login')} disabled={loading}>
          Войти
        </button>
      </div>
    </form>

    {captchaOpen && (
      <div className="captcha-backdrop" role="dialog" aria-modal="true" aria-labelledby="coredrop-captcha-title">
        <div className={`coredrop-captcha captcha-${captchaState}`}>
          <button
            type="button"
            className="captcha-close"
            onClick={handleCaptchaClose}
            disabled={captchaState === 'checking' || loading}
            aria-label="Закрыть проверку"
          >
            <X size={18} />
          </button>

          <div className="captcha-brand">
            <div>
              <h2 id="coredrop-captcha-title">CoreDrop Captcha</h2>
              <p>Подтвердите, что действие выполняет человек</p>
            </div>
          </div>

          <div className="captcha-panel">
            <div className={`captcha-status ${captchaState}`}>
              <span className="captcha-status-icon">
                {captchaState === 'verified' ? '✓' : captchaState === 'checking' ? <span className="captcha-loader" /> : '→'}
              </span>
              <span>
                {captchaState === 'verified' ? 'Подтверждено' : captchaState === 'checking' ? 'Идет проверка...' : 'Зажмите и проведите вправо'}
              </span>
            </div>

            <div
              ref={captchaTrackRef}
              className="captcha-slider"
              style={{ '--captcha-progress': `${captchaProgress}%` } as React.CSSProperties}
            >
              <div className="captcha-slider-fill" />
              <div className="captcha-slider-text">
                {captchaState === 'idle' ? 'Сдвиньте ползунок до конца' : captchaState === 'checking' ? 'Проверка займет несколько секунд' : 'Готово'}
              </div>
              <button
                type="button"
                className={`captcha-slider-thumb ${isDraggingCaptcha ? 'dragging' : ''}`}
                style={{ left: `calc(${captchaProgress}% - ${(captchaProgress / 100) * 56}px)` }}
                onPointerDown={handleCaptchaPointerDown}
                onPointerMove={handleCaptchaPointerMove}
                onPointerUp={handleCaptchaPointerUp}
                onPointerCancel={handleCaptchaPointerUp}
                disabled={captchaState !== 'idle'}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(captchaProgress)}
                aria-valuetext={captchaState === 'verified' ? 'Подтверждено' : captchaState === 'checking' ? 'Проверка' : 'Проведите вправо'}
              >
                {captchaState === 'checking' ? <span className="captcha-thumb-loader" /> : captchaState === 'verified' ? '✓' : '→'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default RegisterForm
