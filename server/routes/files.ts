import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';
import authenticate from '../middleware/auth';
import { permanentlyDeleteFile } from '../services/deleteFileService';
import { permanentlyDeleteBatch, permanentlyDeleteAllTrash } from '../services/deleteBatchService';
import { restoreBatch } from '../services/restoreBatchService';
import { generatePresignedUrl } from '../services/s3-storage';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

interface FileRow extends RowDataPacket {
  id: number;
  user_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  path: string;
  folder_id: number | null;
  is_deleted: boolean;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

router.get('/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const {
      search = '',
      sort = 'created_at',
      order = 'desc',
      folder_id = null,
      limit = 50,
      offset = 0
    } = req.query;

    let whereConditions = 'user_id = ? AND is_deleted = FALSE';
    const params: any[] = [userId];

    if (search && typeof search === 'string' && search.trim()) {
      whereConditions += ` AND (original_name LIKE ? OR filename LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (folder_id === null || folder_id === undefined || folder_id === '' || folder_id === 'root') {
      whereConditions += ` AND folder_id IS NULL`;
    } else {
      whereConditions += ` AND folder_id = ?`;
      params.push(Number(folder_id));
    }

    const sortFieldMap: Record<string, string> = {
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'original_name': 'original_name',
      'size_bytes': 'size_bytes'
    };
    const sortField = sortFieldMap[sort as string] || 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        id, filename, original_name, mime_type, size_bytes,
        path, folder_id, is_favorite, created_at, updated_at, last_accessed_at,
        COUNT(*) OVER() as total_count
      FROM files
      WHERE ${whereConditions}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));

    const [files] = await pool.query<(FileRow & { total_count: number })[]>(query, params);

    const total = files.length > 0 ? files[0].total_count : 0;

    const cleanFiles = files.map(({ total_count, ...file }) => file);

    res.json({
      success: true,
      files: cleanFiles,
      total,
      page: Math.floor(Number(offset) / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [files] = await pool.query<FileRow[]>(
      `SELECT id, filename, original_name, mime_type, size_bytes,
              path, folder_id, is_favorite, created_at, updated_at, last_accessed_at
       FROM files
       WHERE user_id = ? AND is_deleted = FALSE
       ORDER BY last_accessed_at DESC
       LIMIT 20`,
      [userId]
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

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_files,
        COALESCE(SUM(size_bytes), 0) as total_size,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_count
      FROM files
      WHERE user_id = ? AND is_deleted = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/favorites', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const {
      limit = 50,
      offset = 0
    } = req.query;

    const query = `
      SELECT
        id, filename, original_name, mime_type, size_bytes,
        path, folder_id, is_favorite, created_at, updated_at, last_accessed_at,
        COUNT(*) OVER() as total_count
      FROM files
      WHERE user_id = ? AND is_deleted = FALSE AND is_favorite = TRUE
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const [files] = await pool.query<(FileRow & { total_count: number })[]>(
      query,
      [userId, Number(limit), Number(offset)]
    );

    const total = files.length > 0 ? files[0].total_count : 0;

    const cleanFiles = files.map(({ total_count, ...file }) => file);

    res.json({
      success: true,
      files: cleanFiles,
      total,
      page: Math.floor(Number(offset) / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/trash', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const {
      sort = 'deleted_at',
      order = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    const params: any[] = [userId];

    const sortFieldMap: Record<string, string> = {
      'deleted_at': 'deleted_at',
      'created_at': 'created_at',
      'original_name': 'original_name',
      'size_bytes': 'size_bytes'
    };
    const sortField = sortFieldMap[sort as string] || 'deleted_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        id, filename, original_name, mime_type, size_bytes,
        path, folder_id, is_favorite, deleted_at, created_at, updated_at,
        COUNT(*) OVER() as total_count
      FROM files
      WHERE user_id = ? AND is_deleted = TRUE
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));

    const [files] = await pool.query<(FileRow & { total_count: number })[]>(query, params);

    const total = files.length > 0 ? files[0].total_count : 0;

    const cleanFiles = files.map(({ total_count, ...file }) => file);

    res.json({
      success: true,
      files: cleanFiles,
      total,
      page: Math.floor(Number(offset) / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('List trash files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const [files] = await pool.query<FileRow[]>(
      `SELECT id, user_id, filename, original_name, mime_type, size_bytes, path
       FROM files
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    await pool.query(
      'UPDATE files SET last_accessed_at = NOW() WHERE id = ?',
      [fileId]
    ).catch(() => {});

    const presignedUrl = await generatePresignedUrl(file.path, 3600);

    res.redirect(presignedUrl);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/thumbnail', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const [files] = await pool.query<FileRow[]>(
      `SELECT id, user_id, filename, mime_type, path
       FROM files
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    await pool.query(
      'UPDATE files SET last_accessed_at = NOW() WHERE id = ?',
      [fileId]
    ).catch(() => {});

    const presignedUrl = await generatePresignedUrl(file.path, 86400);

    res.redirect(presignedUrl);
  } catch (error) {
    console.error('Thumbnail error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const [files] = await pool.query<FileRow[]>(
      `SELECT id, filename, original_name, mime_type, size_bytes,
              path, folder_id, is_favorite, created_at, updated_at, last_accessed_at
      FROM files
      WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    await pool.query(
      'UPDATE files SET last_accessed_at = NOW() WHERE id = ?',
      [fileId]
    ).catch(() => {});

    res.json({
      success: true,
      file: files[0]
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const [files] = await pool.query<FileRow[]>(
      'SELECT id FROM files WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    await pool.query(
      'UPDATE files SET is_deleted = TRUE, deleted_at = NOW() WHERE id = ?',
      [fileId]
    );

    res.json({
      success: true,
      message: 'File moved to trash'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/rename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const [files] = await pool.query<FileRow[]>(
      'SELECT id, original_name FROM files WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const currentName = files[0].original_name;
    const newName = name.trim();

    if (currentName === newName) {
      return res.json({
        success: true,
        message: 'File renamed successfully'
      });
    }

    await pool.query(
      'UPDATE files SET original_name = ?, updated_at = NOW() WHERE id = ?',
      [newName, fileId]
    );

    res.json({
      success: true,
      message: 'File renamed successfully'
    });
  } catch (error) {
    console.error('Rename file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/favorite', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const [files] = await pool.query<FileRow[]>(
      'SELECT id, is_favorite FROM files WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const newFavoriteStatus = !files[0].is_favorite;

    await pool.query(
      'UPDATE files SET is_favorite = ?, updated_at = NOW() WHERE id = ?',
      [newFavoriteStatus, fileId]
    );

    res.json({
      success: true,
      is_favorite: newFavoriteStatus
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const [files] = await pool.query<FileRow[]>(
      'SELECT id FROM files WHERE id = ? AND user_id = ? AND is_deleted = TRUE',
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found in trash' });
    }

    await pool.query(
      'UPDATE files SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW() WHERE id = ?',
      [fileId]
    );

    res.json({
      success: true,
      message: 'File restored successfully'
    });
  } catch (error) {
    console.error('Restore file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/batch/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'Invalid file IDs' });
    }

    const numericIds = fileIds.map((id: any) => parseInt(id));
    const { restored, failed } = await restoreBatch(numericIds, userId);

    res.json({
      success: true,
      restored,
      failed,
      total: fileIds.length
    });
  } catch (error) {
    console.error('Batch restore error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/permanent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const success = await permanentlyDeleteFile(parseInt(fileId), userId);

    if (!success) {
      return res.status(404).json({ error: 'File not found in trash' });
    }

    res.json({
      success: true,
      message: 'File permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/batch/permanent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'Invalid file IDs' });
    }

    const numericIds = fileIds.map((id: any) => parseInt(id));
    const { deleted, failed } = await permanentlyDeleteBatch(numericIds, userId);

    res.json({
      success: true,
      deleted,
      failed,
      total: fileIds.length
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/trash/empty', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const { deleted, failed } = await permanentlyDeleteAllTrash(userId);

    res.json({
      success: true,
      deleted,
      failed,
      message: 'Trash emptied successfully'
    });
  } catch (error) {
    console.error('Empty trash error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
