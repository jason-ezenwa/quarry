export const STORAGE_BUCKET = Symbol('STORAGE_BUCKET');

export type PutObjectOptions = {
  contentType: string;
  metadata: Record<string, string>;
};

export type StoredObjectInfo = {
  size: number;
  contentType: string;
  metadata: Record<string, string>;
};

// The object store calls StorageService makes, so tests can swap in a bucket
// held in memory.
export interface StorageBucket {
  put(path: string, data: Buffer, options: PutObjectOptions): Promise<void>;
  // Throws StorageObjectNotFoundError when the source holds nothing.
  copy(source: string, destination: string): Promise<StoredObjectInfo>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}

export class StorageObjectNotFoundError extends Error {
  constructor(readonly path: string) {
    super('Storage object not found');
  }
}
