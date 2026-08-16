import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';
import authenticate from '../middleware/auth';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

interface StatsRow extends RowDataPacket {
  total_files: number;
  total_size: number;
  recent_count: number;
}

interface FileRow extends RowDataPacket {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  path: string;
  created_at: string;
}

interface ActivityRow extends RowDataPacket {
  id: number;
  action_type: string;
  description: string;
  created_at: string;
  file_name: string | null;
  folder_name: string | null;
}

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [stats] = await pool.query<StatsRow[]>(
      `SELECT
        COUNT(*) as total_files,
        COALESCE(SUM(size_bytes), 0) as total_size,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_count
      FROM files
      WHERE user_id = ? AND is_deleted = FALSE`,
      [userId]
    );

    const maxStorage = 10 * 1024 * 1024 * 1024;

    res.json({
      success: true,
      stats: {
        total_files: stats[0].total_files,
        total_size: stats[0].total_size,
        max_storage: maxStorage,
        recent_count: stats[0].recent_count,
        percentage: (stats[0].total_size / maxStorage) * 100
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recent-files', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const limit = Number(req.query.limit) || 8;

    const [files] = await pool.query<FileRow[]>(
      `SELECT id, filename, original_name, mime_type, size_bytes, path, created_at
       FROM files
       WHERE user_id = ? AND is_deleted = FALSE
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Recent files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const limit = Number(req.query.limit) || 10;

    const [activities] = await pool.query<ActivityRow[]>(
      `SELECT
        ua.id,
        ua.action_type,
        ua.description,
        ua.created_at,
        f.original_name as file_name,
        fo.name as folder_name
       FROM user_activities ua
       LEFT JOIN files f ON ua.file_id = f.id
       LEFT JOIN folders fo ON ua.folder_id = fo.id
       WHERE ua.user_id = ?
       ORDER BY ua.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/trash-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [filesResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM files WHERE user_id = ? AND is_deleted = TRUE',
      [userId]
    );

    const [foldersResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM folders WHERE user_id = ? AND is_deleted = TRUE',
      [userId]
    );

    const totalCount = (filesResult[0]?.count || 0) + (foldersResult[0]?.count || 0);

    res.json({
      success: true,
      count: totalCount
    });
  } catch (error) {
    console.error('Trash count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
