import React from 'react'
import { checkPasswordStrength, PasswordStrength } from '../../utils/passwordStrength'
import './PasswordStrengthIndicator.css'

interface PasswordStrengthIndicatorProps {
  password: string
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  if (!password) {
    return null
  }

  const strength: PasswordStrength = checkPasswordStrength(password)

  const getLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      'weak': 'Слабый пароль',
      'medium': 'Средний пароль',
      'strong': 'Хороший пароль',
      'very-strong': 'Отличный пароль'
    }
    return labels[level] || ''
  }

  return (
    <div className="password-strength-container">
      <div className="password-strength-bar">
        <div className={`password-strength-fill ${strength.level}`} />
      </div>

      <div className={`password-strength-label ${strength.level}`}>
        {getLevelLabel(strength.level)}
      </div>

      <div className="password-requirements">
        {strength.requirements.map((requirement) => (
          <div
            key={requirement.id}
            className={`password-requirement ${requirement.met ? 'met' : ''}`}
          >
            <div className={`requirement-icon ${requirement.met ? 'met' : 'not-met'}`}>
              {requirement.met ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <span>{requirement.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PasswordStrengthIndicator
