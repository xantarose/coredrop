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
    return { valid: false, error: 'Email обязателен для заполнения.' }
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: 'Неверный формат email.' }
  }

  return { valid: true }
}

export const validatePassword = (password: string): ValidationResult => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Пароль обязателен.' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Пароль должен быть не менее ${MIN_PASSWORD_LENGTH} символов.` }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну заглавную букву (A-Z).' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну строчную букву (a-z).' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну цифру (0-9).' }
  }

  return { valid: true }
}

export const validateName = (name: string): ValidationResult => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Имя обязательно для заполнения.' }
  }

  if (name.trim().length < MIN_NAME_LENGTH) {
    return { valid: false, error: 'Имя слишком короткое.' }
  }

  if (name.trim().length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Имя слишком длинное (максимум ${MAX_NAME_LENGTH} символов).` }
  }

  return { valid: true }
}

export const validateRequiredFields = (fields: Record<string, any>): ValidationResult => {
  for (const [key, value] of Object.entries(fields)) {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return { valid: false, error: 'Все поля обязательны для заполнения.' }
    }
  }

  return { valid: true }
}

export const validateEmailFormat = (email: string): ValidationResult => {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return { valid: false, error: 'Email обязателен для заполнения.' }
  }

  const normalized = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, error: 'Неверный формат email.' }
  }

  const atIndex = normalized.indexOf('@')
  const localPart = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)

  if (localPart.includes('+')) {
    return { valid: false, error: 'Email с символом + не поддерживается.' }
  }

  if (domain.includes('..')) {
    return { valid: false, error: 'Неверный формат домена email.' }
  }

  const tld = domain.split('.').pop()
  if (!tld || tld.length <= 1) {
    return { valid: false, error: 'Неверный формат домена email.' }
  }

  return { valid: true }
}