export class StorageObjectNotFoundError extends Error {
  constructor(readonly path: string) {
    super('Storage object not found');
  }
}
