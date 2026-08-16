import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pool from '../database/init';
import authenticate from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  avatar_url: string | null;
}

const AVATARS_DIR = path.join(__dirname, '../../uploads/avatars');
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;
    const userAvatarDir = path.join(AVATARS_DIR, String(userId));

    if (!fs.existsSync(userAvatarDir)) {
      fs.mkdirSync(userAvatarDir, { recursive: true });
    }

    cb(null, userAvatarDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const filename = `avatar-${Date.now()}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const avatarFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`File type not allowed: ${file.mimetype}`);
    cb(error);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
    files: 1
  }
});

router.put('/name', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Имя обязательно для заполнения' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Имя слишком длинное (максимум 100 символов)' });
    }

    await pool.query(
      'UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), userId]
    );

    res.json({
      success: true,
      message: 'Имя успешно обновлено',
      name: name.trim()
    });
  } catch (error) {
    console.error('Update name error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/email', strictRateLimiter, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({ error: 'Email обязателен для заполнения' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Для изменения email требуется пароль' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const isPasswordValid = await bcrypt.compare(password, users[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const [existingUsers] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email.trim(), userId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Этот email уже используется' });
    }

    await pool.query(
      'UPDATE users SET email = ?, email_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [email.trim(), userId]
    );

    res.json({
      success: true,
      message: 'Email успешно обновлен',
      email: email.trim()
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/avatar', authenticate, (req: AuthRequest, res: Response) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              error: 'Файл слишком большой',
              maxSize: MAX_AVATAR_SIZE,
              message: 'Максимальный размер аватара 5 МБ'
            });
          }
        }

        return res.status(400).json({
          error: err.message || 'Ошибка загрузки',
          details: 'Проверьте формат файла'
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }

      const userId = req.userId;
      const relativePath = path.relative(path.join(__dirname, '../../uploads'), req.file.path);

      const [users] = await pool.query<UserRow[]>(
        'SELECT avatar_url FROM users WHERE id = ?',
        [userId]
      );

      if (users.length > 0 && users[0].avatar_url) {
        const oldAvatarPath = path.join(__dirname, '../../uploads', users[0].avatar_url);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (fsError) {
            console.error('Failed to delete old avatar:', fsError);
          }
        }
      }

      await pool.query(
        'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
        [relativePath, userId]
      );

      res.status(200).json({
        success: true,
        message: 'Аватар успешно загружен',
        avatar_url: relativePath
      });
    } catch (error) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fsError) {
          console.error('Failed to cleanup file:', fsError);
        }
      }
      console.error('Upload avatar error:', error);
      res.status(500).json({
        error: 'Ошибка загрузки аватара',
        message: error instanceof Error ? error.message : 'Server error'
      });
    }
  });
});

router.put('/password', strictRateLimiter, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Текущий пароль обязателен' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Новый пароль обязателен' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, userId]
    );

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
