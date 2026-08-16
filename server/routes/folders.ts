import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../database/init';
import authenticate from '../middleware/auth';
import { dbThrottle } from '../utils/dbThrottle';
import { globalOperationQueue } from '../utils/operationQueue';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

interface FolderRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  parent_id: number | null;
  is_deleted: boolean;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { name, parent_id = null } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Название папки обязательно' });
    }

    if (name.length > 24) {
      return res.status(400).json({ error: 'Название слишком длинное (максимум 24 символов)' });
    }

    if (parent_id !== null) {
      const [parentFolders] = await dbThrottle.execute<FolderRow[]>(
        'SELECT id FROM folders WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
        [parent_id, userId]
      );

      if (parentFolders.length === 0) {
        return res.status(404).json({ error: 'Родительская папка не найдена' });
      }
    }

    const [existingFolders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id <=> ? AND is_deleted = FALSE',
      [userId, name.trim(), parent_id]
    );

    if (existingFolders.length > 0) {
      return res.status(409).json({ error: 'Папка с таким названием уже существует в этой директории' });
    }

    const [result] = await dbThrottle.execute(
      'INSERT INTO folders (user_id, name, parent_id) VALUES (?, ?, ?)',
      [userId, name.trim(), parent_id]
    );

    const folderId = (result as any).insertId;

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE id = ?',
      [folderId]
    );

    res.status(201).json({
      success: true,
      folder: folders[0]
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { parent_id = null } = req.query;

    let query = `
      SELECT f.id, f.name, f.parent_id, f.created_at, f.updated_at,
             COUNT(DISTINCT files.id) as file_count,
             COUNT(DISTINCT subfolders.id) as subfolder_count
      FROM folders f
      LEFT JOIN files ON files.folder_id = f.id AND files.is_deleted = FALSE
      LEFT JOIN folders subfolders ON subfolders.parent_id = f.id AND subfolders.is_deleted = FALSE
      WHERE f.user_id = ? AND f.is_deleted = FALSE
    `;

    const params: any[] = [userId];

    if (parent_id === null || parent_id === 'null' || parent_id === 'root') {
      query += ' AND f.parent_id IS NULL';
    } else {
      query += ' AND f.parent_id = ?';
      params.push(Number(parent_id));
    }

    query += ' GROUP BY f.id, f.name, f.parent_id, f.created_at, f.updated_at';
    query += ' ORDER BY f.name ASC';

    const [folders] = await dbThrottle.execute<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      folders,
      total: folders.length
    });
  } catch (error) {
    console.error('List folders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [folders] = await dbThrottle.execute<RowDataPacket[]>(
      `SELECT id, name, parent_id
       FROM folders
       WHERE user_id = ? AND is_deleted = FALSE
       ORDER BY name ASC`,
      [userId]
    );

    res.json({
      success: true,
      folders
    });
  } catch (error) {
    console.error('Get all folders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/favorites', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [folders] = await dbThrottle.execute<RowDataPacket[]>(
      `SELECT f.id, f.name, f.parent_id, f.is_favorite, f.created_at, f.updated_at,
              COUNT(DISTINCT files.id) as file_count,
              COUNT(DISTINCT subfolders.id) as subfolder_count
       FROM folders f
       LEFT JOIN files ON files.folder_id = f.id AND files.is_deleted = FALSE
       LEFT JOIN folders subfolders ON subfolders.parent_id = f.id AND subfolders.is_deleted = FALSE
       WHERE f.user_id = ? AND f.is_deleted = FALSE AND f.is_favorite = TRUE
       GROUP BY f.id, f.name, f.parent_id, f.is_favorite, f.created_at, f.updated_at
       ORDER BY f.updated_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      folders
    });
  } catch (error) {
    console.error('Get favorite folders error:', error);
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

    let query = `
      SELECT f.id, f.name, f.parent_id, f.deleted_at, f.created_at, f.updated_at,
             COUNT(DISTINCT files.id) as file_count,
             COUNT(DISTINCT subfolders.id) as subfolder_count
      FROM folders f
      LEFT JOIN files ON files.folder_id = f.id AND files.is_deleted = TRUE
      LEFT JOIN folders subfolders ON subfolders.parent_id = f.id AND subfolders.is_deleted = TRUE
      WHERE f.user_id = ? AND f.is_deleted = TRUE
      GROUP BY f.id, f.name, f.parent_id, f.deleted_at, f.created_at, f.updated_at
    `;

    const params: any[] = [userId];

    const sortFieldMap: Record<string, string> = {
      'deleted_at': 'f.deleted_at',
      'created_at': 'f.created_at',
      'name': 'f.name'
    };
    const sortField = sortFieldMap[sort as string] || 'f.deleted_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortField} ${sortOrder}`;

    if (limit) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
    }

    const [folders] = await dbThrottle.execute<RowDataPacket[]>(query, params);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM folders
      WHERE user_id = ? AND is_deleted = TRUE
    `;
    const [countResult] = await dbThrottle.execute<RowDataPacket[]>(countQuery, [userId]);
    const total = countResult[0].total;

    res.json({
      success: true,
      folders,
      total,
      page: Math.floor(Number(offset) / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('List trash folders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const folderId = req.params.id;

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      `SELECT f.id, f.name, f.parent_id, f.created_at, f.updated_at,
              COUNT(DISTINCT files.id) as file_count,
              COUNT(DISTINCT subfolders.id) as subfolder_count
       FROM folders f
       LEFT JOIN files ON files.folder_id = f.id AND files.is_deleted = FALSE
       LEFT JOIN folders subfolders ON subfolders.parent_id = f.id AND subfolders.is_deleted = FALSE
       WHERE f.id = ? AND f.user_id = ? AND f.is_deleted = FALSE
       GROUP BY f.id, f.name, f.parent_id, f.created_at, f.updated_at`,
      [folderId, userId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Папка не найдена' });
    }

    res.json({
      success: true,
      folder: folders[0]
    });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/path', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const folderId = req.params.id;

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id, name, parent_id FROM folders WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [folderId, userId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Папка не найдена' });
    }

    const path: Array<{ id: number; name: string }> = [];
    let currentFolder = folders[0];

    path.unshift({ id: currentFolder.id, name: currentFolder.name });

    while (currentFolder.parent_id !== null) {
      const [parentFolders] = await dbThrottle.execute<FolderRow[]>(
        'SELECT id, name, parent_id FROM folders WHERE id = ? AND is_deleted = FALSE',
        [currentFolder.parent_id]
      );

      if (parentFolders.length === 0) break;

      currentFolder = parentFolders[0];
      path.unshift({ id: currentFolder.id, name: currentFolder.name });

      if (path.length > 100) {
        break;
      }
    }

    res.json({
      success: true,
      path
    });
  } catch (error) {
    console.error('Get folder path error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/rename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const folderId = req.params.id;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Название папки обязательно' });
    }

    if (name.length > 255) {
      return res.status(400).json({ error: 'Название слишком длинное' });
    }

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id, name, parent_id FROM folders WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [folderId, userId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Папка не найдена' });
    }

    const folder = folders[0];
    const newName = name.trim();

    if (folder.name === newName) {
      return res.json({
        success: true,
        message: 'Папка переименована'
      });
    }

    const [existingFolders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id <=> ? AND id != ? AND is_deleted = FALSE',
      [userId, newName, folder.parent_id, folderId]
    );

    if (existingFolders.length > 0) {
      return res.status(409).json({ error: 'Папка с таким названием уже существует' });
    }

    await dbThrottle.execute(
      'UPDATE folders SET name = ?, updated_at = NOW() WHERE id = ?',
      [newName, folderId]
    );

    res.json({
      success: true,
      message: 'Папка переименована'
    });
  } catch (error) {
    console.error('Rename folder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const folderId = Number(req.params.id);
    const moveToRoot = req.query.moveToRoot === 'true';

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id FROM folders WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [folderId, userId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Папка не найдена' });
    }

    if (moveToRoot) {
      await dbThrottle.execute(
        'UPDATE files SET folder_id = NULL, updated_at = NOW() WHERE folder_id = ? AND user_id = ? AND is_deleted = FALSE',
        [folderId, userId]
      );

      await dbThrottle.execute(
        'UPDATE folders SET parent_id = NULL, updated_at = NOW() WHERE parent_id = ? AND user_id = ? AND is_deleted = FALSE',
        [folderId, userId]
      );

      await dbThrottle.execute(
        'UPDATE folders SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND user_id = ?',
        [folderId, userId]
      );
    } else {
      const markFolderAsDeleted = async (targetFolderId: number, depth: number = 0): Promise<void> => {
        if (depth > 50) {
          return;
        }

        await dbThrottle.execute(
          'UPDATE files SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE folder_id = ? AND user_id = ? AND is_deleted = FALSE',
          [targetFolderId, userId]
        );

        const [subfolders] = await dbThrottle.execute<FolderRow[]>(
          'SELECT id FROM folders WHERE parent_id = ? AND user_id = ? AND is_deleted = FALSE LIMIT 50',
          [targetFolderId, userId]
        );

        await dbThrottle.execute(
          'UPDATE folders SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND user_id = ?',
          [targetFolderId, userId]
        );

        for (const subfolder of subfolders) {
          await markFolderAsDeleted(subfolder.id, depth + 1);
        }
      };

      await markFolderAsDeleted(folderId);
    }

    res.json({
      success: true,
      message: 'Папка удалена'
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/favorite', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const folderId = req.params.id;

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id, is_favorite FROM folders WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [folderId, userId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Папка не найдена' });
    }

    const newFavoriteStatus = !folders[0].is_favorite;

    await dbThrottle.execute(
      'UPDATE folders SET is_favorite = ?, updated_at = NOW() WHERE id = ?',
      [newFavoriteStatus, folderId]
    );

    res.json({
      success: true,
      is_favorite: newFavoriteStatus
    });
  } catch (error) {
    console.error('Toggle favorite folder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const folderId = Number(req.params.id);

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id FROM folders WHERE id = ? AND user_id = ? AND is_deleted = TRUE',
      [folderId, userId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Папка не найдена в корзине' });
    }

    const restoreFolderRecursive = async (targetFolderId: number, depth: number = 0): Promise<void> => {
      if (depth > 50) {
        return;
      }

      await dbThrottle.execute(
        'UPDATE files SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW() WHERE folder_id = ? AND user_id = ? AND is_deleted = TRUE',
        [targetFolderId, userId]
      );

      const [subfolders] = await dbThrottle.execute<FolderRow[]>(
        'SELECT id FROM folders WHERE parent_id = ? AND user_id = ? AND is_deleted = TRUE LIMIT 50',
        [targetFolderId, userId]
      );

      await dbThrottle.execute(
        'UPDATE folders SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [targetFolderId, userId]
      );

      for (const subfolder of subfolders) {
        await restoreFolderRecursive(subfolder.id, depth + 1);
      }
    };

    await restoreFolderRecursive(folderId);

    res.json({
      success: true,
      message: 'Папка восстановлена'
    });
  } catch (error) {
    console.error('Restore folder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/permanent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const folderId = Number(req.params.id);

    const [folders] = await dbThrottle.execute<FolderRow[]>(
      'SELECT id FROM folders WHERE id = ? AND user_id = ? AND is_deleted = TRUE',
      [folderId, userId]
    );

    if (folders.length === 0) {
      return res.status(404).json({ error: 'Папка не найдена в корзине' });
    }

    const deleteFolderPermanent = async (targetFolderId: number, depth: number = 0): Promise<void> => {
      if (depth > 50) {
        return;
      }

      await dbThrottle.execute(
        'DELETE FROM files WHERE folder_id = ? AND user_id = ? AND is_deleted = TRUE',
        [targetFolderId, userId]
      );

      const [subfolders] = await dbThrottle.execute<FolderRow[]>(
        'SELECT id FROM folders WHERE parent_id = ? AND user_id = ? AND is_deleted = TRUE LIMIT 50',
        [targetFolderId, userId]
      );

      for (const subfolder of subfolders) {
        await deleteFolderPermanent(subfolder.id, depth + 1);
      }

      await dbThrottle.execute(
        'DELETE FROM folders WHERE id = ? AND user_id = ?',
        [targetFolderId, userId]
      );
    };

    await deleteFolderPermanent(folderId);

    res.json({
      success: true,
      message: 'Папка окончательно удалена'
    });
  } catch (error) {
    console.error('Permanent delete folder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
