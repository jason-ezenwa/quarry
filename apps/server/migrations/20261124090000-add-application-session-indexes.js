module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async up(db) {
    // A user's active or archived sessions, newest first.
    await db
      .collection('application-sessions')
      .createIndex(
        { user: 1, archivedAt: 1, createdAt: -1 },
        { name: 'user_1_archivedAt_1_createdAt_-1' },
      );

    // Sessions a user created this month, for the monthly cap.
    await db
      .collection('application-sessions')
      .createIndex({ user: 1, createdAt: -1 }, { name: 'user_1_createdAt_-1' });

    // A session's history, oldest first.
    await db
      .collection('messages')
      .createIndex(
        { session: 1, createdAt: 1 },
        { name: 'session_1_createdAt_1' },
      );

    // A message is stored once, however often the client resends it.
    await db
      .collection('messages')
      .createIndex(
        { session: 1, uiId: 1 },
        { unique: true, name: 'session_1_uiId_1' },
      );

    // A session's fit reports, newest first.
    await db
      .collection('fit-scores')
      .createIndex(
        { session: 1, createdAt: -1 },
        { name: 'session_1_createdAt_-1' },
      );
  },

  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async down(db) {
    await db
      .collection('application-sessions')
      .dropIndex('user_1_archivedAt_1_createdAt_-1');

    await db
      .collection('application-sessions')
      .dropIndex('user_1_createdAt_-1');

    await db.collection('messages').dropIndex('session_1_createdAt_1');
    await db.collection('messages').dropIndex('session_1_uiId_1');
    await db.collection('fit-scores').dropIndex('session_1_createdAt_-1');
  },
};
