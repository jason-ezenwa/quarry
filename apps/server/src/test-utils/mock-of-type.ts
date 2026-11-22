/**
 * Build a single mock that is shaped like a real `T` but only carries the
 * fields a given test exercises, while still being typed as a full `T`.
 *
 * Use this for mock data whose target type can be named — service-method
 * arguments, dependency return values, and `.lean()` results — in place of
 * `as any` (which silences all type checking). The value is checked against
 * `Partial<T>`, so any field you *do* supply must match `T`'s real shape
 * (typos and renamed properties fail to compile); fields irrelevant to the
 * test may be omitted.
 *
 * NOT for Mongoose hydrated-document resolves: a model's
 * `findOne`/`find().mockResolvedValue(...)` expects a fully hydrated document
 * type that no partial — and no nameable `T` — satisfies. Keep `as any` there.
 */
export const mockOfType = <T>(value: Partial<T>): T => value as T;

/**
 * The array-returning counterpart to {@link mockOfType} — for arguments,
 * dependency return values, and `.lean()` results that are collections.
 */
export const mockOfTypeList = <T>(...items: Partial<T>[]): T[] =>
  items.map((item) => mockOfType<T>(item));
