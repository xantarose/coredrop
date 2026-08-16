import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';
import { authRateLimiter, registerRateLimiter, forgotPasswordRateLimiter, verifyResetCodeRateLimiter } from '../middleware/rateLimiter';
import { validateEmail, validatePassword, validateName, validateRequiredFields, validateEmailFormat } from '../utils/validation';
import { isDisposableEmail } from '../utils/disposableEmailChecker';
import { validateRefCode } from '../utils/queryValidator';
import { logSuspiciousRequest } from '../middleware/securityLogger';
import { ipRegistrationLimiter } from '../middleware/ipRegistrationLimiter';
import { generateResetCode } from '../utils/codeGenerator';
import { sendPasswordResetCode, sendEmailVerification } from '../services/email-service';

const router = Router();
const SALT_ROUNDS = 12;

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  is_active: boolean;
  avatar_url?: string | null;
  two_factor_enabled: boolean;
  is_email_verified: boolean;
}

const generateToken = (userId: number): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const clearAuthCookie = (res: Response): void => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

router.post('/register', registerRateLimiter, ipRegistrationLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const fieldsValidation = validateRequiredFields({ email, password, name });
    if (!fieldsValidation.valid) {
      return res.status(400).json({ error: fieldsValidation.error });
    }

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    const emailFormatValidation = validateEmailFormat(email);
    if (!emailFormatValidation.valid) {
      return res.status(400).json({ error: emailFormatValidation.error });
    }

    if (isDisposableEmail(email)) {
      logSuspiciousRequest(req, 'DISPOSABLE_EMAIL_BLOCKED', { email: email.trim().toLowerCase() });
      return res.status(400).json({ error: 'Одноразовые email-адреса не поддерживаются.' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email уже зарегистрирован.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const rawRef = req.query.ref as string | undefined;
    const validatedRefCode = validateRefCode(rawRef ?? null);

    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name, registration_ip, referral_code) VALUES (?, ?, ?, ?, ?)',
      [normalizedEmail, passwordHash, name.trim(), req.ip, validatedRefCode]
    );

    const userId = (result as any).insertId;

    const verificationToken = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
      [userId, verificationToken]
    );

    await sendEmailVerification(normalizedEmail, verificationToken, name.trim());

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'Письмо с подтверждением отправлено на ваш email'
    });
  } catch (error) {
    console.error('Registration error');
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const fieldsValidation = validateRequiredFields({ email, password });
    if (!fieldsValidation.valid) {
      return res.status(400).json({ error: fieldsValidation.error });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, email, password_hash, name, is_active, avatar_url, two_factor_enabled, is_email_verified FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Неверные учетные данные.' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Аккаунт деактивирован.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logSuspiciousRequest(req, 'LOGIN_FAILED_BURST', { email: normalizedEmail });
      await pool.query(
        'INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, ?)',
        [user.id, req.ip, req.headers['user-agent'], 'failed']
      );
      return res.status(401).json({ error: 'Неверные учетные данные.' });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({ error: 'Необходимо подтвердить email. Проверьте почту.' });
    }

    if (user.two_factor_enabled) {
      const tempTokenId = crypto.randomBytes(32).toString('hex');
      const tempToken = jwt.sign(
        { userId: user.id, sessionId: tempTokenId },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' }
      );

      const sessionId = crypto.randomUUID();

      await pool.query(
        'INSERT INTO pending_2fa_sessions (id, user_id, temp_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), ?, ?)',
        [sessionId, user.id, tempToken, req.ip, req.headers['user-agent']]
      );

      return res.json({
        success: true,
        requires2FA: true,
        tempToken,
        email: user.email
      });
    }

    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    const token = generateToken(user.id);

    await pool.query(
      'INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)',
      [token, user.id, req.ip, req.headers['user-agent']]
    );

    await pool.query(
      'INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, ?)',
      [user.id, req.ip, req.headers['user-agent'], 'success']
    );

    setAuthCookie(res, token);

    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error');
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.auth_token;

    if (token) {
      await pool.query('DELETE FROM sessions WHERE id = ?', [token]);
    }

    clearAuthCookie(res);

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error');
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Доступ запрещён.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };

    const [sessions] = await pool.query<RowDataPacket[]>(
      'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
      [token]
    );

    if (sessions.length === 0) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Session expired' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, email, name, avatar_url, is_admin, created_at, last_login, email_changed_at FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      clearAuthCookie(res);
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Auth verification error');
    clearAuthCookie(res);
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/forgot-password', forgotPasswordRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.query<UserRow[]>('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await pool.query('DELETE FROM password_reset_codes WHERE user_id = ?', [users[0].id]);

    const resetCode = generateResetCode();
    const [result] = await pool.query(
      'INSERT INTO password_reset_codes (user_id, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
      [users[0].id, resetCode]
    );

    const codeId = (result as any).insertId;

    const resetToken = jwt.sign(
      { userId: users[0].id, codeId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password-link?token=${resetToken}`;
    await sendPasswordResetCode(normalizedEmail, resetLink);
    res.json({ success: true, message: 'Ссылка отправлена на email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify-reset-code', verifyResetCodeRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.query<UserRow[]>('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const [codes] = await pool.query<RowDataPacket[]>(
      'SELECT id, attempts FROM password_reset_codes WHERE user_id = ? AND code = ? AND expires_at > NOW()',
      [users[0].id, code]
    );

    if (codes.length === 0) {
      return res.status(400).json({ error: 'Неверный или истекший код', attemptsLeft: 0 });
    }

    if (codes[0].attempts >= 3) {
      await pool.query('DELETE FROM password_reset_codes WHERE id = ?', [codes[0].id]);
      logSuspiciousRequest(req, 'RESET_CODE_BRUTE', { email: normalizedEmail });
      return res.status(400).json({ error: 'Превышено количество попыток', attemptsLeft: 0 });
    }

    const newAttempts = codes[0].attempts + 1;
    await pool.query('UPDATE password_reset_codes SET attempts = ? WHERE id = ?', [newAttempts, codes[0].id]);

    if (newAttempts >= 3) {
      await pool.query('DELETE FROM password_reset_codes WHERE id = ?', [codes[0].id]);
      logSuspiciousRequest(req, 'RESET_CODE_BRUTE', { email: normalizedEmail });
      return res.status(400).json({ error: 'Превышено количество попыток', attemptsLeft: 0 });
    }

    const resetToken = jwt.sign(
      { userId: users[0].id, codeId: codes[0].id },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' }
    );

    res.json({ success: true, resetToken, attemptsLeft: 3 - newAttempts });
  } catch (error) {
    console.error('Verify reset code error');
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const { resetToken } = req.body;

    if (!resetToken) {
      return res.status(400).json({ error: 'Требуется токен' });
    }

    let decoded: { userId: number; codeId: number };
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET!) as { userId: number; codeId: number };
    } catch (error) {
      return res.status(401).json({ error: 'Токен истек или невалиден' });
    }

    const [resetCodes] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM password_reset_codes WHERE id = ? AND expires_at > NOW()',
      [decoded.codeId]
    );

    if (resetCodes.length === 0) {
      return res.status(401).json({ error: 'Токен истек или невалиден' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Verify reset token error');
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Требуется токен и новый пароль' });
    }

    let decoded: { userId: number; codeId: number };
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET!) as { userId: number; codeId: number };
    } catch (error) {
      return res.status(401).json({ error: 'Токен истек или невалиден' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const [resetCodes] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM password_reset_codes WHERE id = ? AND expires_at > NOW()',
      [decoded.codeId]
    );

    if (resetCodes.length === 0) {
      return res.status(400).json({ error: 'Код восстановления истек' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, decoded.userId]);
    await pool.query('DELETE FROM password_reset_codes WHERE id = ?', [decoded.codeId]);
    await pool.query('DELETE FROM sessions WHERE user_id = ?', [decoded.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error');
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password-from-link', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Требуется токен и новый пароль' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    let decoded: { userId: number; codeId: number };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; codeId: number };
    } catch (error) {
      return res.status(401).json({ error: 'Токен истек или невалиден' });
    }

    const [resetCodes] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM password_reset_codes WHERE id = ? AND expires_at > NOW()',
      [decoded.codeId]
    );

    if (resetCodes.length === 0) {
      return res.status(401).json({ error: 'Токен истек или невалиден' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, decoded.userId]);
    await pool.query('DELETE FROM password_reset_codes WHERE id = ?', [decoded.codeId]);
    await pool.query('DELETE FROM sessions WHERE user_id = ?', [decoded.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password from link error');
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.redirect(`${process.env.CLIENT_URL}/register`);
    }

    const [verifications] = await pool.query<RowDataPacket[]>(
      'SELECT user_id FROM email_verifications WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (verifications.length === 0) {
      return res.redirect(`${process.env.CLIENT_URL}/register`);
    }

    const userId = verifications[0].user_id;

    await pool.query('UPDATE users SET is_email_verified = TRUE WHERE id = ?', [userId]);
    await pool.query('DELETE FROM email_verifications WHERE token = ?', [token]);

    return res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (error) {
    console.error('Verify email error');
    return res.redirect(`${process.env.CLIENT_URL}/register`);
  }
});

export default router;
