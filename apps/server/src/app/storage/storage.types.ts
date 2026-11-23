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
