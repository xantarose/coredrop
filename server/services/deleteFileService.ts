import { dbThrottle } from '../utils/dbThrottle';
import { deleteFileFromS3 } from './s3-storage';

export async function deleteFileFromStorage(s3Key: string): Promise<void> {
  try {
    await deleteFileFromS3(s3Key);
  } catch (error) {
    console.error('File S3 deletion error:', error);
  }
}

export async function deleteFileRecord(fileId: number): Promise<void> {
  await dbThrottle.execute('DELETE FROM files WHERE id = ?', [fileId]);
}

export async function permanentlyDeleteFile(fileId: number, userId: number): Promise<boolean> {
  const [files] = await dbThrottle.execute<any[]>(
    'SELECT id, path FROM files WHERE id = ? AND user_id = ? AND is_deleted = TRUE',
    [fileId, userId]
  );

  if (files.length === 0) {
    return false;
  }

  const file = files[0];

  await Promise.all([
    deleteFileFromStorage(file.path),
    deleteFileRecord(fileId)
  ]);

  return true;
}
