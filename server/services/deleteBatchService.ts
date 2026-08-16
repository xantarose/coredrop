import { dbThrottle } from '../utils/dbThrottle';
import { deleteMultipleFilesFromS3 } from './s3-storage';

const BATCH_SIZE = 500;
const S3_DELETE_BATCH = 1000;

async function processDeleteQueue(files: any[]): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  const s3Keys: string[] = [];
  const fileIds: number[] = [];

  for (const file of files) {
    s3Keys.push(file.path);
    fileIds.push(file.id);
  }

  for (let i = 0; i < s3Keys.length; i += S3_DELETE_BATCH) {
    const keyBatch = s3Keys.slice(i, i + S3_DELETE_BATCH);
    const idBatch = fileIds.slice(i, i + S3_DELETE_BATCH);

    try {
      await deleteMultipleFilesFromS3(keyBatch);

      for (const fileId of idBatch) {
        try {
          await dbThrottle.execute('DELETE FROM files WHERE id = ? AND is_deleted = TRUE', [fileId]);
          deleted++;
        } catch (error) {
          failed++;
        }
      }
    } catch (error) {
      failed += keyBatch.length;
    }
  }

  return { deleted, failed };
}

export async function permanentlyDeleteBatch(
  fileIds: number[],
  userId: number
): Promise<{ deleted: number; failed: number }> {
  let totalDeleted = 0;
  let totalFailed = 0;

  for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
    const batch = fileIds.slice(i, i + BATCH_SIZE);

    try {
      const [files] = await dbThrottle.execute<any[]>(
        `SELECT id, path FROM files WHERE id IN (${batch.map(() => '?').join(',')}) AND user_id = ? AND is_deleted = TRUE LIMIT ${BATCH_SIZE}`,
        [...batch, userId]
      );

      if (files.length === 0) {
        totalFailed += batch.length;
        continue;
      }

      const { deleted, failed } = await processDeleteQueue(files);
      totalDeleted += deleted;
      totalFailed += failed;
    } catch (error) {
      totalFailed += batch.length;
    }
  }

  return { deleted: totalDeleted, failed: totalFailed };
}

export async function permanentlyDeleteAllTrash(userId: number): Promise<{ deleted: number; failed: number }> {
  const [trashedFiles] = await dbThrottle.execute<any[]>(
    'SELECT id, path FROM files WHERE user_id = ? AND is_deleted = TRUE',
    [userId]
  );

  if (trashedFiles.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let totalDeleted = 0;
  let totalFailed = 0;

  for (let i = 0; i < trashedFiles.length; i += BATCH_SIZE) {
    const batch = trashedFiles.slice(i, i + BATCH_SIZE);

    try {
      const { deleted, failed } = await processDeleteQueue(batch);
      totalDeleted += deleted;
      totalFailed += failed;
    } catch (error) {
      totalFailed += batch.length;
    }
  }

  return { deleted: totalDeleted, failed: totalFailed };
}
