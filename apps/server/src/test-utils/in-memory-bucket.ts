import {
  StorageObjectNotFoundError,
  type PutObjectOptions,
  type StorageBucket,
  type StoredObjectInfo,
} from '../app/storage/storage-bucket';

export type StoredObject = PutObjectOptions & {
  data: Buffer;
};

// Stands in for R2 in tests. `objects` is keyed by object path.
export class InMemoryBucket implements StorageBucket {
  readonly objects = new Map<string, StoredObject>();

  async put(
    path: string,
    data: Buffer,
    options: PutObjectOptions,
  ): Promise<void> {
    this.objects.set(path, { data, ...options });
  }

  async copy(source: string, destination: string): Promise<StoredObjectInfo> {
    const object = this.objects.get(source);
    if (!object) throw new StorageObjectNotFoundError(source);

    this.objects.set(destination, object);

    return {
      size: object.data.length,
      contentType: object.contentType,
      metadata: object.metadata,
    };
  }

  // Like S3, deleting a missing object succeeds.
  async delete(path: string): Promise<void> {
    this.objects.delete(path);
  }

  async getSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    return `https://storage.test/${path}?expires-in=${expiresInSeconds}`;
  }
}
