import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';

interface JWTPayload {
  userId: number;
}

interface AdminAuthRequest extends Request {
  userId?: number;
  user?: any;
}

export const adminAuth = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      res.status(401).json({ error: 'Доступ запрещён' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const [sessions] = await pool.query<RowDataPacket[]>(
      'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
      [token]
    );

    if (sessions.length === 0) {
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, name, is_admin FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    if (!users[0].is_admin) {
      res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора' });
      return;
    }

    req.userId = decoded.userId;
    req.user = users[0];

    next();
  } catch (error) {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};

export default adminAuth;
