import { BadRequestException } from '@nestjs/common';
import {
  FILE_EXTENSIONS,
  type UploadedFileRef,
  type UploadPurpose,
} from '@quarry/contracts';

// `pending` holds uploads awaiting submit; `users` holds committed files.
export type StorageStage = 'pending' | 'users';

export function buildStorageFolder(
  stage: StorageStage,
  userId: string,
  purpose: UploadPurpose,
): string {
  return `${stage}/${userId}/${purpose}`;
}

// Keys are joined into object paths, so only a generated nanoid key is allowed.
export const UPLOAD_KEY_PATTERN = /^[A-Za-z0-9_-]{21}\.[a-z0-9]{2,5}$/;

// The key's extension was set from the uploaded file's type.
export function assertMimeTypeMatchesKey({ key, mimeType }: UploadedFileRef) {
  if (!key.endsWith(`.${FILE_EXTENSIONS[mimeType]}`)) {
    throw new BadRequestException(`mimeType does not match upload ${key}`);
  }
}

// Object metadata travels as an HTTP header, which only carries ASCII.
export const ORIGINAL_NAME_METADATA_KEY = 'original-name';

export function encodeOriginalName(name: string): string {
  return encodeURIComponent(name);
}

export function decodeOriginalName(encoded: string | undefined): string | null {
  if (!encoded) return null;

  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}
