export interface PasswordRequirement {
  id: string
  label: string
  met: boolean
}

export interface PasswordStrength {
  level: 'weak' | 'medium' | 'strong' | 'very-strong'
  requirements: PasswordRequirement[]
  score: number
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: 'Минимум 8 символов',
      met: password.length >= 8
    },
    {
      id: 'uppercase',
      label: 'Минимум 1 заглавная буква (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      id: 'lowercase',
      label: 'Минимум 1 строчная буква (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      id: 'number',
      label: 'Минимум 1 цифра (0-9)',
      met: /[0-9]/.test(password)
    },
    {
      id: 'special',
      label: 'Минимум 1 специальный символ (!@#$%^&*)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ]

  const score = requirements.filter(req => req.met).length

  let level: 'weak' | 'medium' | 'strong' | 'very-strong'

  if (score < 3) {
    level = 'weak'
  } else if (score === 3 || score === 4) {
    level = 'medium'
  } else if (score === 4 && !requirements[4].met) {
    level = 'strong'
  } else {
    level = 'very-strong'
  }

  if (score === 4 && requirements.slice(0, 4).every(req => req.met)) {
    level = 'strong'
  }

  if (score === 5) {
    level = 'very-strong'
  }

  return {
    level,
    requirements,
    score
  }
}

export const isPasswordStrong = (password: string): boolean => {
  const strength = checkPasswordStrength(password)
  return strength.score >= 4 && strength.requirements.slice(0, 4).every(req => req.met)
}
