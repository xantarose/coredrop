import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';
import adminAuth from '../middleware/adminAuth';

const router = Router();

interface AdminAuthRequest extends Request {
  userId?: number;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  name: string;
  created_at: string;
  last_login: string | null;
  is_admin: boolean;
  is_active: boolean;
  file_count: number;
  total_size: number;
}

interface StatsRow extends RowDataPacket {
  total_users: number;
  total_files: number;
  total_storage: number;
  active_users: number;
}

interface RegistrationRow extends RowDataPacket {
  date: string;
  count: number;
}

router.get('/stats', adminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const [stats] = await pool.query<StatsRow[]>(
      `SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM files WHERE is_deleted = FALSE) as total_files,
        (SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE is_deleted = FALSE) as total_storage,
        (SELECT COUNT(*) FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as active_users`
    );

    const [registrations] = await pool.query<RegistrationRow[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    const [activity] = await pool.query<RegistrationRow[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM files
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND is_deleted = FALSE
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      stats: stats[0],
      registrations,
      activity
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', adminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      search = '',
      sort = 'created_at',
      order = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    let whereConditions = '1=1';
    const params: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      whereConditions += ` AND (u.email LIKE ? OR u.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const sortFieldMap: Record<string, string> = {
      'created_at': 'u.created_at',
      'last_login': 'u.last_login',
      'email': 'u.email',
      'name': 'u.name',
      'file_count': 'file_count',
      'total_size': 'total_size'
    };
    const sortField = sortFieldMap[sort as string] || 'u.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        u.id, u.email, u.name, u.created_at, u.last_login, u.is_admin, u.is_active,
        COUNT(DISTINCT f.id) as file_count,
        COALESCE(SUM(f.size_bytes), 0) as total_size,
        COUNT(*) OVER() as total_count
      FROM users u
      LEFT JOIN files f ON f.user_id = u.id AND f.is_deleted = FALSE
      WHERE ${whereConditions}
      GROUP BY u.id, u.email, u.name, u.created_at, u.last_login, u.is_admin, u.is_active
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));

    const [users] = await pool.query<(UserRow & { total_count: number })[]>(query, params);

    const total = users.length > 0 ? users[0].total_count : 0;

    const cleanUsers = users.map(({ total_count, ...user }) => user);

    res.json({
      success: true,
      users: cleanUsers,
      total,
      page: Math.floor(Number(offset) / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id/password', adminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { password, generate } = req.body;

    const [users] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    let newPassword: string;

    if (generate) {
      newPassword = crypto.randomBytes(8).toString('hex');
    } else if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
      }
      newPassword = password;
    } else {
      return res.status(400).json({ error: 'Необходимо указать пароль или generate: true' });
    }

    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, userId]
    );

    await pool.query(
      'DELETE FROM sessions WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      password: newPassword
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', adminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const adminId = req.userId;

    if (userId === adminId) {
      return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await pool.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Пользователь удалён'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
