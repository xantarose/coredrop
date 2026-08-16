import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';
import authenticate from '../middleware/auth';
import { getFileFromS3 } from '../services/s3-storage';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

interface FileRow extends RowDataPacket {
  id: number;
  user_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  path: string;
  is_deleted: boolean;
}

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Length', file.size_bytes.toString());
    res.setHeader('Cache-Control', 'no-cache');

    const fileStream = await getFileFromS3(file.path);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
