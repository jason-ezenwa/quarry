export const DATABASE_NAME = 'quarry-db';

export function getMongoUri(): string {
  return (
    process.env.MONGODB_URI || `mongodb://localhost:27017/${DATABASE_NAME}`
  );
}
