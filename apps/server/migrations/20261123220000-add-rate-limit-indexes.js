module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async up(db) {
    // One counter per client and path. Better Auth relies on a duplicate-key
    // error to settle two first requests racing to create the same counter.
    await db
      .collection('rateLimits')
      .createIndex({ key: 1 }, { unique: true, name: 'key_1' });

    // Better Auth prunes expired counters by lastRequest.
    await db
      .collection('rateLimits')
      .createIndex({ lastRequest: 1 }, { name: 'lastRequest_1' });
  },

  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async down(db) {
    await db.collection('rateLimits').dropIndex('key_1');
    await db.collection('rateLimits').dropIndex('lastRequest_1');
  },
};
