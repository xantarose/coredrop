import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from '../components/ui/Logo'
import { useToast } from '../contexts/ToastContext'
import '../components/auth/AuthForm.css'

const VerifyResetCode: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [email, setEmail] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('reset_email')
    if (!storedEmail) {
      navigate('/forgot-password', { replace: true })
      return
    }
    setEmail(storedEmail)

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/forgot-password', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  useEffect(() => {
    const code = digits.join('')
    if (code.length === 6 && !digits.includes('') && !loading) {
      handleVerify(code)
    }
  }, [digits])

  const handleVerify = async (code: string) => {
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        sessionStorage.setItem('reset_token', data.resetToken)
        sessionStorage.removeItem('reset_email')
        navigate('/reset-password')
      } else {
        addToast({ type: 'error', title: 'Ошибка', message: data.error })
        setDigits(['', '', '', '', '', ''])
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(Math.max(0, data.attemptsLeft))
        } else {
          setAttemptsLeft(prev => Math.max(0, prev - 1))
        }
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', message: 'Не удалось подключиться к серверу' })
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '')

    if (cleaned.length > 1) {
      const newDigits = ['', '', '', '', '', '']
      for (let i = 0; i < 6 && i < cleaned.length; i++) {
        newDigits[i] = cleaned[i]
      }
      setDigits(newDigits)
      const nextIndex = Math.min(cleaned.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    const newDigits = [...digits]
    newDigits[index] = cleaned
    setDigits(newDigits)

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits]
        newDigits[index] = ''
        setDigits(newDigits)
      } else if (index > 0) {
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newDigits = ['', '', '', '', '', '']
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || ''
    }
    setDigits(newDigits)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = (timeLeft / 600) * 100

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container auth-container-wide"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <div className="auth-logo" onClick={() => navigate('/')}>
            <Logo width={48} height={48} />
          </div>
          <h1 className="auth-title">Введите код восстановления</h1>
          <p className="auth-subtitle auth-subtitle-break">Код отправлен на {email}</p>
        </div>

        <div className="auth-body">
          <div className="auth-timer">
            <div className="auth-progress-bar">
              <div
                className={`auth-progress-fill ${progressPercent <= 30 ? 'is-danger' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="auth-timer-text">{formatTime(timeLeft)}</div>
          </div>

          <div className="auth-otp-wrapper" onPaste={handlePaste}>
            {[0, 1, 2].map(i => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`auth-otp-input${digits[i] ? ' filled' : ''}`}
                value={digits[i]}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                autoFocus={i === 0}
                aria-label={`Цифра ${i + 1}`}
              />
            ))}
            <span className="auth-otp-separator">-</span>
            {[3, 4, 5].map(i => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`auth-otp-input${digits[i] ? ' filled' : ''}`}
                value={digits[i]}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                aria-label={`Цифра ${i + 1}`}
              />
            ))}
          </div>

          <div className="auth-meta">
            Осталось попыток: <strong className={attemptsLeft <= 1 ? 'is-danger' : ''}>{attemptsLeft}</strong>
          </div>

          <button
            type="button"
            className="auth-secondary-btn"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            Отменить
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default VerifyResetCode
