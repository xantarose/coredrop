import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';

interface PendingSession extends RowDataPacket {
  id: string;
  user_id: number;
  temp_token: string;
  expires_at: string;
  attempts: number;
}

declare global {
  namespace Express {
    interface Request {
      pendingSession?: PendingSession;
    }
  }
}

export const verify2FAToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Токен обязателен.' });
    }

    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as { userId: number; sessionId: string };

    const [sessions] = await pool.query<PendingSession[]>(
      'SELECT * FROM pending_2fa_sessions WHERE temp_token = ? AND expires_at > NOW()',
      [tempToken]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Недействительный или истекший токен.' });
    }

    req.pendingSession = sessions[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export default verify2FAToken;
