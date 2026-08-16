import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { RowDataPacket } from 'mysql2';
import authenticate from '../middleware/auth';
import { uploadRateLimiter } from '../middleware/rateLimiter';
import { dbThrottle } from '../utils/dbThrottle';
import { generateS3Key } from '../services/s3-storage';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client, S3_BUCKET, S3_PUBLIC_URL } from '../config/s3';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const MAX_STORAGE_PER_USER = 100 * 1024 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 5;
const MAX_TOTAL_UPLOAD_SIZE = 1 * 1024 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/bmp', 'image/tiff', 'image/x-icon', 'image/heic', 'image/heif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
  'video/mpeg', 'video/ogg', 'video/3gpp', 'video/x-flv', 'video/mp2t',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a',
  'audio/flac', 'audio/x-wav', 'audio/webm', 'audio/midi', 'audio/x-midi', 'audio/x-mp3',
  'application/pdf', 'application/x-pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/x-tar', 'application/gzip', 'application/x-bzip2', 'application/x-compressed',
  'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
  'application/json', 'application/xml', 'application/x-yaml', 'text/markdown',
  'application/rtf', 'application/vnd.rar', 'application/x-zip-compressed'
];

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.vbe', '.js', '.jse',
  '.ws', '.wsf', '.wsh', '.msi', '.msp', '.cpl', '.jar', '.app', '.deb', '.rpm',
  '.dmg', '.pkg', '.run', '.bin', '.sh', '.bash', '.zsh', '.fish', '.ksh', '.csh',
  '.command', '.workflow', '.action', '.gadget', '.inf', '.ins', '.inx', '.isu',
  '.job', '.lnk', '.msc', '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
  '.reg', '.rgs', '.scf', '.sct', '.shb', '.shs', '.u3p', '.vb', '.wsc', '.dll',
  '.so', '.dylib', '.sys', '.drv', '.efi', '.elf', '.o', '.ko', '.mod', '.out'
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.tif', '.ico',
  '.heic', '.heif', '.avif', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.mpeg',
  '.mpg', '.ogg', '.ogv', '.3gp', '.flv', '.ts', '.mp3', '.wav', '.aac', '.m4a',
  '.flac', '.wma', '.oga', '.mid', '.midi', '.pdf', '.doc', '.docx', '.xls',
  '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp', '.zip', '.rar', '.7z', '.tar',
  '.gz', '.bz2', '.txt', '.csv', '.html', '.htm', '.css', '.json', '.xml', '.yaml',
  '.yml', '.md', '.rtf'
];

const getMimeTypeFromExtension = (ext: string): string => {
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.txt': 'text/plain',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.webm': 'video/webm',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    const error = new Error(`Blocked file extension: ${ext}`);
    return cb(error);
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(`File extension not allowed: ${ext}`);
    return cb(error);
  }

  const expectedMime = getMimeTypeFromExtension(ext);
  if (!ALLOWED_TYPES.includes(file.mimetype) && file.mimetype !== expectedMime) {
    if (file.mimetype === 'application/octet-stream' || !file.mimetype) {
      req.file = { ...file, mimetype: expectedMime } as Express.Multer.File;
      cb(null, true);
      return;
    }
    const error = new Error(`File type not allowed: ${file.mimetype}`);
    return cb(error);
  }

  cb(null, true);
};

const decodeFilename = (filename: string): string => {
  try {
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    return decoded;
  } catch {
    return filename;
  }
};

const validateFileExtensionSafety = (filename: string): boolean => {
  const lowerFilename = filename.toLowerCase();

  for (const blockedExt of BLOCKED_EXTENSIONS) {
    if (lowerFilename.includes(blockedExt)) {
      return false;
    }
  }

  const parts = lowerFilename.split('.');
  if (parts.length > 2) {
    for (let i = 0; i < parts.length - 1; i++) {
      const possibleExt = '.' + parts[i];
      if (BLOCKED_EXTENSIONS.includes(possibleExt)) {
        return false;
      }
    }
  }

  return true;
};

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_UPLOAD,
    fieldSize: 10 * 1024 * 1024,
    parts: MAX_FILES_PER_UPLOAD + 10,
    fields: 10
  }
});

const streamUpload = async (file: Express.Multer.File, userId: number, originalName: string, mimeType: string) => {
  const key = generateS3Key(userId, originalName);

  const sanitizeMetadataKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9-]/g, '');
  };

  const encodeMetadata = (str: string): string => {
    return Buffer.from(str).toString('base64');
  };

  const parallelUploads = new Upload({
    client: s3Client,
    params: {
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: mimeType,
      Metadata: {
        [sanitizeMetadataKey('originalname')]: encodeMetadata(originalName),
        [sanitizeMetadataKey('userid')]: userId.toString(),
        [sanitizeMetadataKey('uploadedat')]: new Date().toISOString()
      }
    },
    queueSize: 6,
    partSize: 15 * 1024 * 1024,
    leavePartsOnError: false
  });

  await parallelUploads.done();

  return {
    key,
    publicUrl: `${S3_PUBLIC_URL}/${key}`,
    size: file.size
  };
};

router.post('/single', uploadRateLimiter, authenticate, (req: AuthRequest, res: Response) => {
  const uploadHandler = upload.single('file');

  uploadHandler(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              error: 'File too large',
              maxSize: MAX_FILE_SIZE,
              message: `Maximum file size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Unexpected field name' });
          }
        }

        return res.status(400).json({
          error: err.message || 'Upload failed',
          details: 'File validation failed'
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.userId;
      const { folder_id = null } = req.body;

      const fileExt = path.extname(req.file.originalname).toLowerCase();

      if (!validateFileExtensionSafety(req.file.originalname)) {
        return res.status(400).json({ error: 'Dangerous file extension pattern detected' });
      }

      if (BLOCKED_EXTENSIONS.includes(fileExt)) {
        return res.status(400).json({ error: 'Blocked file extension detected' });
      }

      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        return res.status(400).json({ error: 'File extension not allowed' });
      }

      if (req.file.size < 1) {
        return res.status(400).json({ error: 'File is empty' });
      }

      const [userFiles] = await dbThrottle.execute<RowDataPacket[]>(
        'SELECT COALESCE(SUM(size_bytes), 0) as total_size FROM files WHERE user_id = ? AND is_deleted = FALSE',
        [userId]
      );

      const totalSize = Number(userFiles[0].total_size);

      if (totalSize + req.file.size > MAX_STORAGE_PER_USER) {
        return res.status(413).json({
          error: 'Storage limit exceeded',
          used: totalSize,
          max: MAX_STORAGE_PER_USER,
          required: req.file.size
        });
      }

      const decodedOriginalName = decodeFilename(req.file.originalname);
      let mimeType = req.file.mimetype;

      if (!mimeType || mimeType === 'application/octet-stream') {
        mimeType = getMimeTypeFromExtension(fileExt);
      }

      const s3Result = await streamUpload(req.file, userId!, decodedOriginalName, mimeType);

      const [result] = await dbThrottle.execute(
        `INSERT INTO files (user_id, filename, original_name, mime_type, size_bytes, path, folder_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          s3Result.key.split('/').pop(),
          decodedOriginalName,
          mimeType,
          req.file.size,
          s3Result.key,
          folder_id || null
        ]
      );

      const fileId = (result as any).insertId;

      res.status(201).json({
        success: true,
        file: {
          id: fileId,
          filename: s3Result.key.split('/').pop(),
          original_name: decodedOriginalName,
          mime_type: mimeType,
          size_bytes: req.file.size,
          path: s3Result.key,
          folder_id: folder_id || null,
          created_at: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Internal server error';
      console.error('Upload single error:', errorMsg);
      res.status(500).json({
        error: 'Upload failed',
        message: errorMsg
      });
    }
  });
});

router.post('/multiple', uploadRateLimiter, authenticate, (req: AuthRequest, res: Response) => {
  const uploadHandler = upload.array('files', MAX_FILES_PER_UPLOAD);

  uploadHandler(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              error: 'File too large',
              maxSize: MAX_FILE_SIZE,
              message: `Maximum file size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: `Too many files. Maximum ${MAX_FILES_PER_UPLOAD} files allowed` });
          }
          if (err.code === 'LIMIT_PART_COUNT' || err.code === 'LIMIT_FIELD_COUNT') {
            return res.status(400).json({ error: 'Too many form fields' });
          }
        }

        return res.status(400).json({
          error: err.message || 'Upload failed',
          details: 'File validation failed'
        });
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      if (files.length > MAX_FILES_PER_UPLOAD) {
        return res.status(400).json({
          error: `Too many files. Maximum ${MAX_FILES_PER_UPLOAD} files allowed`,
          count: files.length
        });
      }

      const uploadSize = files.reduce((sum, file) => sum + file.size, 0);

      if (uploadSize > MAX_TOTAL_UPLOAD_SIZE) {
        return res.status(413).json({
          error: 'Total upload size exceeds limit',
          max: MAX_TOTAL_UPLOAD_SIZE,
          required: uploadSize
        });
      }

      for (const file of files) {
        const fileExt = path.extname(file.originalname).toLowerCase();

        if (!validateFileExtensionSafety(file.originalname)) {
          return res.status(400).json({ error: 'Dangerous file extension pattern detected' });
        }

        if (BLOCKED_EXTENSIONS.includes(fileExt)) {
          return res.status(400).json({ error: 'Blocked file extension detected' });
        }

        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
          return res.status(400).json({ error: 'File extension not allowed' });
        }

        if (file.size < 1) {
          return res.status(400).json({ error: 'One or more files are empty' });
        }
      }

      const userId = req.userId;
      const { folder_id = null } = req.body;

      const [userFiles] = await dbThrottle.execute<RowDataPacket[]>(
        'SELECT COALESCE(SUM(size_bytes), 0) as total_size FROM files WHERE user_id = ? AND is_deleted = FALSE',
        [userId]
      );

      const totalSize = Number(userFiles[0].total_size);

      if (totalSize + uploadSize > MAX_STORAGE_PER_USER) {
        return res.status(413).json({
          error: 'Storage limit exceeded',
          used: totalSize,
          max: MAX_STORAGE_PER_USER,
          required: uploadSize
        });
      }

      const uploadedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          const decodedOriginalName = decodeFilename(file.originalname);
          const fileExt = path.extname(decodedOriginalName).toLowerCase();
          let mimeType = file.mimetype;

          if (!mimeType || mimeType === 'application/octet-stream') {
            mimeType = getMimeTypeFromExtension(fileExt);
          }

          const s3Result = await streamUpload(file, userId!, decodedOriginalName, mimeType);

          const [result] = await dbThrottle.execute(
            `INSERT INTO files (user_id, filename, original_name, mime_type, size_bytes, path, folder_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              s3Result.key.split('/').pop(),
              decodedOriginalName,
              mimeType,
              file.size,
              s3Result.key,
              folder_id || null
            ]
          );

          uploadedFiles.push({
            id: (result as any).insertId,
            filename: s3Result.key.split('/').pop(),
            original_name: decodedOriginalName,
            mime_type: mimeType,
            size_bytes: file.size,
            path: s3Result.key,
            folder_id: folder_id || null,
            created_at: new Date().toISOString()
          });
        } catch (error) {
          throw error;
        }
      }

      res.status(201).json({
        success: true,
        files: uploadedFiles,
        count: uploadedFiles.length
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Internal server error';
      console.error('Upload multiple error:', errorMsg);
      res.status(500).json({
        error: 'Upload failed',
        message: errorMsg
      });
    }
  });
});

export default router;
