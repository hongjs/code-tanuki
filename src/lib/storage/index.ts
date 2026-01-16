import { IStorageAdapter } from '@/types/storage';
import { JsonStorageAdapter } from './json-storage';
import { logger } from '../logger/winston';

let storageInstance: IStorageAdapter | null = null;

export function getStorage(): IStorageAdapter {
  if (!storageInstance) {
    const storageType = process.env.STORAGE_TYPE || 'json';
    const dataDir = process.env.DATA_DIR || './data/reviews';

    switch (storageType) {
      case 'json':
        storageInstance = new JsonStorageAdapter(dataDir);
        logger.info(`Initialized JSON storage adapter with data directory: ${dataDir}`);
        break;
      // Future: case 'postgres': return new PostgresStorageAdapter();
      // Future: case 'mongodb': return new MongoStorageAdapter();
      default:
        throw new Error(`Unknown storage type: ${storageType}`);
    }
  }

  return storageInstance;
}
