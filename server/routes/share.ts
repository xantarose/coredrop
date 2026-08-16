import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import pool from '../database/init';
import authenticate from '../middleware/auth';
import { generatePresignedUrl, getFileFromS3 } from '../services/s3-storage';
import { validateShareToken } from '../utils/queryValidator';
import { logSuspiciousRequest } from '../middleware/securityLogger';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

interface ShareLinkRow extends RowDataPacket {
  id: number;
  file_id: number;
  user_id: number;
  token: string;
  expires_at: string;
  download_count: number;
  created_at: string;
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

interface UserShareLinkRow extends RowDataPacket {
  id: number;
  token: string;
  file_id: number;
  file_name: string;
  expires_at: string;
  download_count: number;
  created_at: string;
}

const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { file_id, expires_in_days = 7 } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    const [files] = await pool.query<FileRow[]>(
      'SELECT id, user_id FROM files WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [file_id, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [existingLinks] = await pool.query<ShareLinkRow[]>(
      'SELECT token FROM shared_links WHERE file_id = ? AND user_id = ? AND expires_at > NOW()',
      [file_id, userId]
    );

    if (existingLinks.length > 0) {
      await pool.query(
        'DELETE FROM shared_links WHERE file_id = ? AND user_id = ?',
        [file_id, userId]
      );
    }

    const [activeLinksCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM shared_links WHERE user_id = ? AND expires_at > NOW()',
      [userId]
    );

    if (activeLinksCount[0].count >= 10) {
      return res.status(400).json({ error: 'Maximum share links limit reached' });
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expires_in_days));

    await pool.query(
      'INSERT INTO shared_links (file_id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [file_id, userId, token, expiresAt]
    );

    res.status(201).json({
      success: true,
      token,
      expires_at: expiresAt.toISOString(),
      share_url: `/s/${token}`
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [links] = await pool.query<UserShareLinkRow[]>(
      `SELECT sl.id, sl.token, sl.file_id, f.original_name as file_name,
              sl.expires_at, sl.download_count, sl.created_at
       FROM shared_links sl
       JOIN files f ON sl.file_id = f.id
       WHERE sl.user_id = ? AND sl.expires_at > NOW() AND f.is_deleted = FALSE
       ORDER BY sl.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      links,
      total: links.length
    });
  } catch (error) {
    console.error('Get user share links error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!validateShareToken(token)) {
      logSuspiciousRequest(req, 'MALFORMED_TOKEN', { token: token?.slice(0, 20) });
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    const [links] = await pool.query<ShareLinkRow[]>(
      `SELECT sl.*, f.original_name, f.size_bytes, f.mime_type
       FROM shared_links sl
       JOIN files f ON sl.file_id = f.id
       WHERE sl.token = ? AND sl.expires_at > NOW() AND f.is_deleted = FALSE`,
      [token]
    );

    if (links.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    const link = links[0];

    res.json({
      success: true,
      file_name: link.original_name,
      file_size: link.size_bytes,
      mime_type: link.mime_type,
      expires_at: link.expires_at,
      download_count: link.download_count
    });
  } catch (error) {
    console.error('Get share link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { token } = req.params;

    const [links] = await pool.query<ShareLinkRow[]>(
      'SELECT id, user_id FROM shared_links WHERE token = ?',
      [token]
    );

    if (links.length === 0) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    if (links[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM shared_links WHERE token = ?', [token]);

    res.json({
      success: true,
      message: 'Share link deleted'
    });
  } catch (error) {
    console.error('Delete share link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/download/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!validateShareToken(token)) {
      logSuspiciousRequest(req, 'MALFORMED_TOKEN', { token: token?.slice(0, 20) });
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    const [links] = await pool.query<ShareLinkRow[]>(
      `SELECT sl.*, f.filename, f.original_name, f.mime_type, f.size_bytes, f.path
       FROM shared_links sl
       JOIN files f ON sl.file_id = f.id
       WHERE sl.token = ? AND sl.expires_at > NOW() AND f.is_deleted = FALSE`,
      [token]
    );

    if (links.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    await pool.query(
      'UPDATE shared_links SET download_count = download_count + 1 WHERE token = ?',
      [token]
    );

    const link = links[0];

    res.setHeader('Content-Type', link.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(link.original_name)}"`);
    res.setHeader('Content-Length', link.size_bytes.toString());
    res.setHeader('Cache-Control', 'no-cache');

    const fileStream = await getFileFromS3(link.path);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });
  } catch (error) {
    console.error('Download shared file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
