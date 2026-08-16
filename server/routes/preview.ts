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
  folder_id: number | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

const TEXT_MIME_TYPES = [
  'text/plain',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
  'application/x-yaml',
  'text/yaml'
];

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const [files] = await pool.query<FileRow[]>(
      `SELECT id, user_id, filename, original_name, mime_type, size_bytes, path, folder_id, created_at, updated_at
       FROM files
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    if (TEXT_MIME_TYPES.includes(file.mime_type)) {
      const MAX_TEXT_SIZE = 10 * 1024 * 1024;

      if (file.size_bytes > MAX_TEXT_SIZE) {
        return res.status(413).json({
          error: 'File too large for preview',
          maxSize: MAX_TEXT_SIZE
        });
      }

      try {
        const fileStream = await getFileFromS3(file.path);
        const chunks: Buffer[] = [];

        fileStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        fileStream.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf-8');
          res.json({
            success: true,
            file: {
              id: file.id,
              filename: file.filename,
              original_name: file.original_name,
              mime_type: file.mime_type,
              size_bytes: file.size_bytes,
              created_at: file.created_at
            },
            content,
            isText: true
          });
        });

        fileStream.on('error', (error) => {
          console.error('Stream error:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to read file' });
          }
        });
      } catch (error) {
        console.error('S3 error:', error);
        res.status(500).json({ error: 'Failed to retrieve file' });
      }

      return;
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const fileStream = await getFileFromS3(file.path);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
