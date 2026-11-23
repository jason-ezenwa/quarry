import { ObjectId } from 'mongodb';
import { auth } from './auth';

// Indexes built on first write hit a WriteConflict inside a transaction, so a
// no-op write builds them up front. Unique field indexes are in a migration.
export async function ensureAuthIndexes(): Promise<void> {
  const context = await auth.$context;
  const matchesNothing = [{ field: 'id', value: new ObjectId().toHexString() }];

  await Promise.all(
    Object.keys(context.tables).map((model) =>
      context.adapter.updateMany({ model, where: matchesNothing, update: {} }),
    ),
  );
}
