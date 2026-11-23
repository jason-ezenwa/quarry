import { DUPLICATE_KEY_ERROR_CODE } from './mongo-errors.constants';

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_ERROR_CODE
  );
}
