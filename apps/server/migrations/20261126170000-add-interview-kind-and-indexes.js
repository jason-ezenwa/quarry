module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async up(db) {
    // Every session so far is an application.
    await db
      .collection('agent-sessions')
      .updateMany(
        { kind: { $exists: false } },
        { $set: { kind: 'application' } },
      );

    // A user's applications or interviews, newest first, and the monthly caps.
    await db
      .collection('agent-sessions')
      .createIndex(
        { user: 1, kind: 1, createdAt: -1 },
        { name: 'user_1_kind_1_createdAt_-1' },
      );

    // An application's interviews, newest first.
    await db
      .collection('agent-sessions')
      .createIndex(
        { parentSession: 1, createdAt: -1 },
        { name: 'parentSession_1_createdAt_-1' },
      );

    // One record per interview session.
    await db
      .collection('interviews')
      .createIndex({ session: 1 }, { unique: true, name: 'session_1' });
  },

  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async down(db) {
    await db
      .collection('agent-sessions')
      .dropIndex('user_1_kind_1_createdAt_-1');

    await db
      .collection('agent-sessions')
      .dropIndex('parentSession_1_createdAt_-1');

    await db.collection('interviews').dropIndex('session_1');
  },
};
