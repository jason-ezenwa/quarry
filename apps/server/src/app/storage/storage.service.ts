import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  BYTES_PER_MB,
  FILE_EXTENSIONS,
  UPLOAD_PURPOSES,
  type UploadedFileRef,
  type UploadMimeType,
  type UploadPurpose,
} from '@quarry/contracts';
import { nanoid } from 'nanoid';
import { StorageObjectNotFoundError } from './storage-bucket';
import { R2Bucket } from './r2-bucket';
import { ORIGINAL_NAME_METADATA_KEY } from './storage.constants';
import type { StoredFile, UploadFile } from './storage.types';
import {
  assertMimeTypeMatchesKey,
  buildStorageFolder,
  decodeOriginalName,
  encodeOriginalName,
} from './storage.utils';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly bucket: R2Bucket) {}

  async uploadPending(
    userId: string,
    purpose: UploadPurpose,
    file: UploadFile,
  ): Promise<UploadedFileRef> {
    const config = UPLOAD_PURPOSES[purpose];
    // Client-declared; narrowed only so the allowlist check below can run.
    const mimeType = file.mimetype as UploadMimeType;

    if (!config.mimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `${file.mimetype} is not allowed for ${purpose}`,
      );
    }

    if (file.size > config.maxBytes) {
      throw new PayloadTooLargeException(
        `${purpose} must be at most ${config.maxBytes / BYTES_PER_MB} MB`,
      );
    }

    const key = `${nanoid()}.${FILE_EXTENSIONS[mimeType]}`;
    const path = `${buildStorageFolder('pending', userId, purpose)}/${key}`;

    await this.logFailure('put', path, () =>
      this.bucket.put(path, file.buffer, {
        contentType: mimeType,
        metadata: {
          [ORIGINAL_NAME_METADATA_KEY]: encodeOriginalName(file.originalname),
        },
      }),
    );

    return { key, mimeType };
  }

  // Pending objects are left in place for the bucket's lifecycle rule, so a
  // retried commit finds them again.
  async commit(
    userId: string,
    purpose: UploadPurpose,
    upload: UploadedFileRef,
  ): Promise<StoredFile> {
    assertMimeTypeMatchesKey(upload);

    const source = `${buildStorageFolder('pending', userId, purpose)}/${upload.key}`;
    const destination = `${buildStorageFolder('users', userId, purpose)}/${upload.key}`;

    try {
      const copied = await this.bucket.copy(source, destination);

      return {
        path: destination,
        mimeType: upload.mimeType,
        originalName:
          decodeOriginalName(copied.metadata[ORIGINAL_NAME_METADATA_KEY]) ??
          upload.key,
        size: copied.size,
      };
    } catch (error) {
      // Keys resolve under the caller's own folder, so another user's key 404s.
      if (error instanceof StorageObjectNotFoundError) {
        throw new NotFoundException(`Upload ${upload.key} was not found`);
      }

      this.logger.error('Storage copy failed', { source, destination, error });
      throw error;
    }
  }

  async read(path: string): Promise<Buffer> {
    return this.logFailure('read', path, () => this.bucket.get(path));
  }

  async delete(path: string): Promise<void> {
    await this.logFailure('delete', path, () => this.bucket.delete(path));
  }

  // A signed URL is a bearer credential; callers decide who may have one.
  async getSignedUrl(path: string, expiresInMs: number): Promise<string> {
    return this.bucket.getSignedUrl(path, Math.ceil(expiresInMs / 1000));
  }

  private async logFailure<T>(
    operation: string,
    path: string,
    run: () => Promise<T>,
  ): Promise<T> {
    try {
      return await run();
    } catch (error) {
      this.logger.error('Storage operation failed', { operation, path, error });
      throw error;
    }
  }
}
