import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const getEncryptionKey = (): Buffer => {
  if (process.env.ENCRYPTION_KEY) {
    return crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
  }
  return crypto.randomBytes(32);
};

const decrypt = (text: string): string => {
  const algorithm = 'aes-256-cbc';
  const key = getEncryptionKey();
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

interface PendingSession extends RowDataPacket {
  id: string;
  user_id: number;
  temp_token: string;
  expires_at: string;
  attempts: number;
  ip_address: string;
  user_agent: string;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  name: string;
  avatar_url?: string | null;
  two_factor_secret: string;
  backup_codes: string;
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

const verifyTempToken = async (tempToken: string): Promise<PendingSession | null> => {
  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as { userId: number; sessionId: string };

    const [sessions] = await pool.query<PendingSession[]>(
      'SELECT * FROM pending_2fa_sessions WHERE temp_token = ? AND expires_at > NOW()',
      [tempToken]
    );

    if (sessions.length === 0) {
      return null;
    }

    return sessions[0];
  } catch {
    return null;
  }
};

router.post('/verify-2fa', strictRateLimiter, async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Токен и код обязательны.' });
    }

    const session = await verifyTempToken(tempToken);

    if (!session) {
      return res.status(401).json({ error: 'Недействительный или истекший токен.' });
    }

    if (session.attempts >= 5) {
      await pool.query('DELETE FROM pending_2fa_sessions WHERE id = ?', [session.id]);
      return res.status(429).json({ error: 'Слишком много неправильных попыток. Пожалуйста, попробуйте снова позже.' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, email, name, avatar_url, two_factor_secret FROM users WHERE id = ?',
      [session.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    const user = users[0];

    const decryptedSecret = decrypt(user.two_factor_secret);

    const isCodeValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!isCodeValid) {
      const newAttempts = session.attempts + 1;
      await pool.query(
        'UPDATE pending_2fa_sessions SET attempts = ? WHERE id = ?',
        [newAttempts, session.id]
      );

      return res.status(401).json({
        error: 'Неверный код.',
        attemptsLeft: 5 - newAttempts
      });
    }

    await pool.query('DELETE FROM pending_2fa_sessions WHERE id = ?', [session.id]);

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
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify-2fa-backup', strictRateLimiter, async (req: Request, res: Response) => {
  try {
    const { tempToken, backupCode } = req.body;

    if (!tempToken || !backupCode) {
      return res.status(400).json({ error: 'Токен и код обязательны.' });
    }

    const session = await verifyTempToken(tempToken);

    if (!session) {
      return res.status(401).json({ error: 'Недействительный или истекший токен.' });
    }

    if (session.attempts >= 5) {
      await pool.query('DELETE FROM pending_2fa_sessions WHERE id = ?', [session.id]);
      return res.status(429).json({ error: 'Слишком много неправильных попыток.' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, email, name, avatar_url, backup_codes FROM users WHERE id = ?',
      [session.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    const user = users[0];

    if (!user.backup_codes) {
      return res.status(400).json({ error: 'Резервные коды не найдены.' });
    }

    const decryptedBackupCodes = decrypt(user.backup_codes);
    const hashedBackupCodes: string[] = JSON.parse(decryptedBackupCodes);

    let codeIndex = -1;
    for (let i = 0; i < hashedBackupCodes.length; i++) {
      const isMatch = await bcrypt.compare(backupCode, hashedBackupCodes[i]);
      if (isMatch) {
        codeIndex = i;
        break;
      }
    }

    if (codeIndex === -1) {
      const newAttempts = session.attempts + 1;
      await pool.query(
        'UPDATE pending_2fa_sessions SET attempts = ? WHERE id = ?',
        [newAttempts, session.id]
      );

      return res.status(401).json({
        error: 'Неверный код.',
        attemptsLeft: 5 - newAttempts
      });
    }

    hashedBackupCodes.splice(codeIndex, 1);

    const encrypt = (text: string): string => {
      const algorithm = 'aes-256-cbc';
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    };

    const updatedBackupCodes = encrypt(JSON.stringify(hashedBackupCodes));

    await pool.query(
      'UPDATE users SET backup_codes = ? WHERE id = ?',
      [updatedBackupCodes, user.id]
    );

    await pool.query('DELETE FROM pending_2fa_sessions WHERE id = ?', [session.id]);

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
    console.error('Backup code verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/cancel-2fa', async (req: Request, res: Response) => {
  try {
    const { tempToken } = req.body;

    if (!tempToken) {
      return res.status(400).json({ error: 'Токен обязателен.' });
    }

    const session = await verifyTempToken(tempToken);

    if (!session) {
      return res.status(401).json({ error: 'Недействительный или истекший токен.' });
    }

    await pool.query('DELETE FROM pending_2fa_sessions WHERE id = ?', [session.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel 2FA error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
