import { dbThrottle } from '../utils/dbThrottle';
import { globalOperationQueue } from '../utils/operationQueue';

const BATCH_SIZE = 500;

async function processBatchRestore(fileIds: number[], userId: number): Promise<{ restored: number; failed: number }> {
  let restored = 0;
  let failed = 0;

  for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
    const batch = fileIds.slice(i, i + BATCH_SIZE);

    try {
      const [files] = await dbThrottle.execute<any[]>(
        `SELECT id FROM files WHERE id IN (${batch.map(() => '?').join(',')}) AND user_id = ? AND is_deleted = TRUE`,
        [...batch, userId]
      );

      if (files.length === 0) {
        failed += batch.length;
        continue;
      }

      for (const file of files) {
        try {
          await dbThrottle.execute(
            'UPDATE files SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW() WHERE id = ?',
            [file.id]
          );
          restored++;
        } catch (error) {
          failed++;
        }
      }
    } catch (error) {
      failed += batch.length;
    }
  }

  return { restored, failed };
}

export async function restoreBatch(fileIds: number[], userId: number): Promise<{ restored: number; failed: number }> {
  return processBatchRestore(fileIds, userId);
}
