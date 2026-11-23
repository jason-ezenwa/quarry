module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async up(db) {
    // One profile per user, and the onboarding gate's lookup.
    await db
      .collection('profiles')
      .createIndex({ user: 1 }, { unique: true, name: 'user_1' });

    // One primary resume per user; tailored resumes are not limited.
    await db.collection('resumes').createIndex(
      { user: 1 },
      {
        unique: true,
        partialFilterExpression: { kind: 'primary' },
        name: 'user_1_primary',
      },
    );

    // Finds parses interrupted by a restart.
    await db.collection('resumes').createIndex(
      { parseStatus: 1, parseStartedAt: 1 },
      {
        partialFilterExpression: { parseStatus: 'parsing' },
        name: 'parseStatus_1_parseStartedAt_1_parsing',
      },
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async down(db) {
    await db.collection('profiles').dropIndex('user_1');
    await db.collection('resumes').dropIndex('user_1_primary');
    await db
      .collection('resumes')
      .dropIndex('parseStatus_1_parseStartedAt_1_parsing');
  },
};
