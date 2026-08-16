import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import pool from '../database/init';
import authenticate from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  backup_codes: string | null;
}

interface SessionRow extends RowDataPacket {
  id: string;
  user_id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

interface LoginHistoryRow extends RowDataPacket {
  id: number;
  user_id: number;
  ip_address: string;
  user_agent: string;
  login_time: string;
  status: 'success' | 'failed';
  failure_reason: string | null;
}

const getEncryptionKey = (): Buffer => {
  if (process.env.ENCRYPTION_KEY) {
    return crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
  }
  return crypto.randomBytes(32);
};

const encrypt = (text: string): string => {
  const algorithm = 'aes-256-cbc';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
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

const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code.match(/.{1,4}/g)!.join('-'));
  }
  return codes;
};

const hashBackupCode = async (code: string): Promise<string> => {
  return bcrypt.hash(code, 10);
};

router.get('/2fa/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [users] = await pool.query<UserRow[]>(
      'SELECT two_factor_enabled FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      success: true,
      enabled: users[0].two_factor_enabled || false
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [users] = await pool.query<UserRow[]>(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const secret = speakeasy.generateSecret({
      name: `FileStorage (${users[0].email})`,
      length: 32
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/enable', strictRateLimiter, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { code, secret } = req.body;

    if (!code || !secret) {
      return res.status(400).json({ error: 'Код и секрет обязательны' });
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );

    const encryptedSecret = encrypt(secret);
    const encryptedBackupCodes = encrypt(JSON.stringify(hashedBackupCodes));

    await pool.query(
      'UPDATE users SET two_factor_enabled = TRUE, two_factor_secret = ?, backup_codes = ? WHERE id = ?',
      [encryptedSecret, encryptedBackupCodes, userId]
    );

    res.json({
      success: true,
      backupCodes
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const isPasswordValid = await bcrypt.compare(password, users[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    await pool.query(
      'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, backup_codes = NULL WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '2FA отключена'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/verify', strictRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email и код обязательны' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, two_factor_secret, backup_codes FROM users WHERE email = ? AND two_factor_enabled = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = users[0];

    if (!user.two_factor_secret) {
      return res.status(400).json({ error: '2FA не настроена' });
    }

    const secret = decrypt(user.two_factor_secret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (verified) {
      return res.json({
        success: true,
        verified: true
      });
    }

    if (user.backup_codes) {
      const hashedBackupCodes = JSON.parse(decrypt(user.backup_codes));

      for (let i = 0; i < hashedBackupCodes.length; i++) {
        const isMatch = await bcrypt.compare(code, hashedBackupCodes[i]);
        if (isMatch) {
          hashedBackupCodes.splice(i, 1);
          const updatedBackupCodes = encrypt(JSON.stringify(hashedBackupCodes));

          await pool.query(
            'UPDATE users SET backup_codes = ? WHERE id = ?',
            [updatedBackupCodes, user.id]
          );

          return res.json({
            success: true,
            verified: true,
            usedBackupCode: true
          });
        }
      }
    }

    res.status(400).json({ error: 'Неверный код' });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');

    await pool.query(
      'DELETE FROM sessions WHERE user_id = ? AND expires_at <= NOW()',
      [userId]
    );

    const [sessions] = await pool.query<SessionRow[]>(
      'SELECT id, ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const sessionsWithCurrent = sessions.map(session => ({
      id: session.id,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      created_at: session.created_at,
      expires_at: session.expires_at,
      is_current: session.id === currentToken
    }));

    res.json({
      success: true,
      sessions: sessionsWithCurrent
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/sessions/terminate-others', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');

    const [result] = await pool.query(
      'DELETE FROM sessions WHERE user_id = ? AND id != ?',
      [userId, currentToken]
    );

    res.json({
      success: true,
      terminated: (result as any).affectedRows
    });
  } catch (error) {
    console.error('Terminate other sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/sessions/:token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { token } = req.params;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');

    if (token === currentToken) {
      return res.status(400).json({ error: 'Нельзя завершить текущую сессию' });
    }

    const [sessions] = await pool.query<SessionRow[]>(
      'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
      [token, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    await pool.query('DELETE FROM sessions WHERE id = ?', [token]);

    res.json({
      success: true,
      message: 'Сессия завершена'
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/login-history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const {
      limit = 20,
      offset = 0,
      days = 30,
      status = 'all'
    } = req.query;

    let query = `
      SELECT id, ip_address, user_agent, login_time, status, failure_reason
      FROM login_history
      WHERE user_id = ? AND login_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const params: any[] = [userId, Number(days)];

    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY login_time DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [history] = await pool.query<LoginHistoryRow[]>(query, params);

    res.json({
      success: true,
      history,
      total: history.length
    });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
