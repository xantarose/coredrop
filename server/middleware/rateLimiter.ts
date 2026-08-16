import rateLimit from 'express-rate-limit';

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много запросов с этого IP, попробуйте позже',
  skipSuccessfulRequests: false
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много запросов, попробуйте позже',
  skipSuccessfulRequests: false
});

export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много попыток входа, попробуйте через 5 минут',
  skipSuccessfulRequests: true,
  skipFailedRequests: false
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много попыток регистрации, попробуйте позже',
  skipSuccessfulRequests: false
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много загрузок, попробуйте позже',
  skipSuccessfulRequests: false
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много попыток восстановления пароля, попробуйте через час',
  skipSuccessfulRequests: false
});

export const verifyResetCodeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много попыток проверки кода, попробуйте через 15 минут',
  skipSuccessfulRequests: false
});

export const emailVerificationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много попыток отправки письма, попробуйте через час',
  skipSuccessfulRequests: false
});
