import type { UploadMimeType } from '@quarry/contracts';

export type UploadFile = Pick<
  Express.Multer.File,
  'buffer' | 'mimetype' | 'size' | 'originalname'
>;

// A committed file, as a record stores it.
export type StoredFile = {
  path: string;
  mimeType: UploadMimeType;
  originalName: string;
  size: number;
};

// `pending` holds uploads awaiting submit; `users` holds committed files.
export type StorageStage = 'pending' | 'users';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

export type PutObjectOptions = {
  contentType: string;
  metadata: Record<string, string>;
};

export type StoredObjectInfo = {
  size: number;
  contentType: string;
  metadata: Record<string, string>;
};
