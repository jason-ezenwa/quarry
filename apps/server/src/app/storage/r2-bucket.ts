import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageObjectNotFoundError } from './storage-bucket';
import type {
  PutObjectOptions,
  R2Config,
  StoredObjectInfo,
} from './storage.types';

export function createR2Client({
  accountId,
  accessKeyId,
  secretAccessKey,
}: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2 has not always accepted the SDK's newer default checksums.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

function isNotFound(error: unknown): boolean {
  return (
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode === 404
  );
}

// Cloudflare R2 through its S3-compatible API.
export class R2Bucket {
  constructor(
    private readonly client: S3Client,
    private readonly bucketName: string,
  ) {}

  async put(
    path: string,
    data: Buffer,
    { contentType, metadata }: PutObjectOptions,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: data,
        ContentType: contentType,
        Metadata: metadata,
      }),
    );
  }

  async get(path: string): Promise<Buffer> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucketName, Key: path }),
      );

      if (!object.Body) throw new StorageObjectNotFoundError(path);

      return Buffer.from(await object.Body.transformToByteArray());
    } catch (error) {
      if (isNotFound(error)) throw new StorageObjectNotFoundError(path);
      throw error;
    }
  }

  // Read first, because a copy's response does not carry the object's size.
  async copy(source: string, destination: string): Promise<StoredObjectInfo> {
    let head;

    try {
      head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: source }),
      );
    } catch (error) {
      if (isNotFound(error)) throw new StorageObjectNotFoundError(source);
      throw error;
    }

    // The lifecycle rule can expire the source between the two calls.
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucketName,
          Key: destination,
          CopySource: `${this.bucketName}/${encodeURIComponent(source)}`,
        }),
      );
    } catch (error) {
      if (isNotFound(error)) throw new StorageObjectNotFoundError(source);
      throw error;
    }

    return {
      size: head.ContentLength ?? 0,
      contentType: head.ContentType ?? 'application/octet-stream',
      metadata: head.Metadata ?? {},
    };
  }

  async delete(path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: path }),
    );
  }

  async getSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: path }),
      { expiresIn: expiresInSeconds },
    );
  }
}

// Nothing is sent until the first request against the bucket.
export const r2BucketProvider: FactoryProvider<R2Bucket> = {
  provide: R2Bucket,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const config: R2Config = {
      accountId: configService.getOrThrow<string>('R2_ACCOUNT_ID'),
      accessKeyId: configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
      secretAccessKey: configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      bucketName: configService.getOrThrow<string>('R2_BUCKET_NAME'),
    };

    return new R2Bucket(createR2Client(config), config.bucketName);
  },
};
