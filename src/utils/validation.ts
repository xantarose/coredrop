export const MIN_PASSWORD_LENGTH = 8
export const MIN_NAME_LENGTH = 1
export const MAX_NAME_LENGTH = 100
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ValidationResult {
  valid: boolean
  error?: string
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return { valid: false, error: 'Email обязателен для заполнения' }
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: 'Неверный формат email' }
  }

  return { valid: true }
}

export const validatePassword = (password: string): ValidationResult => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Пароль обязателен' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Пароль должен быть не менее ${MIN_PASSWORD_LENGTH} символов` }
  }

  return { valid: true }
}

export const validateName = (name: string): ValidationResult => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Имя обязательно для заполнения' }
  }

  if (name.trim().length < MIN_NAME_LENGTH) {
    return { valid: false, error: 'Имя слишком короткое' }
  }

  if (name.trim().length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Имя слишком длинное (максимум ${MAX_NAME_LENGTH} символов)` }
  }

  return { valid: true }
}

export const validatePasswordMatch = (password: string, confirmPassword: string): ValidationResult => {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Пароли не совпадают' }
  }

  return { valid: true }
}

export const validatePasswordStrength = (password: string): ValidationResult => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Пароль обязателен' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Пароль должен быть не менее ${MIN_PASSWORD_LENGTH} символов` }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну заглавную букву' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну строчную букву' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну цифру' }
  }

  return { valid: true }
}

export const sanitizeQueryParam = (value: string | null): string | null => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(trimmed)) return null
  return trimmed
}

export const validateRefCode = (value: string | null): string | null => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 30) return null
  return trimmed
}

export const validateUTMParam = (value: string | null): string | null => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 50) return null
  return trimmed
}

export const getAllowedTab = (value: string | null, allowed: string[]): string | null => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (!allowed.includes(trimmed)) return null
  return trimmed
}