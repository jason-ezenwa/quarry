module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async up(db) {
    // A session's tailored resumes, newest first.
    await db
      .collection('resumes')
      .createIndex(
        { session: 1, kind: 1, createdAt: -1 },
        { name: 'session_1_kind_1_createdAt_-1' },
      );

    // A session's cover letters, newest first.
    await db
      .collection('cover-letters')
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
    await db.collection('resumes').dropIndex('session_1_kind_1_createdAt_-1');
    await db.collection('cover-letters').dropIndex('session_1_createdAt_-1');
  },
};
