import type { StoredFile } from '../storage/storage.types';

export type CreatePrimaryResumeInput = {
  userId: string;
  file: StoredFile;
};
