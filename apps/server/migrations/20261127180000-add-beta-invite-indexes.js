module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async up(db) {
    // Sign-up looks invites up by email, and an email is invited once.
    await db
      .collection('beta-invites')
      .createIndex({ email: 1 }, { unique: true, name: 'email_1' });
  },

  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async down(db) {
    await db.collection('beta-invites').dropIndex('email_1');
  },
};
