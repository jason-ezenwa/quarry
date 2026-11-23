const path = require('path');

// Standalone tsconfig so this doesn't have to reconcile with the Nest
// build's nodenext module settings.
require('ts-node').register({
  transpileOnly: true,
  project: path.join(__dirname, 'tsconfig.migrate-mongo.json'),
});
require('dotenv').config();

const { DATABASE_NAME, getMongoUri } = require('./src/lib/database');

const config = {
  mongodb: {
    url: getMongoUri(),
    databaseName: DATABASE_NAME,
    options: {},
  },

  // Absolute path so `up`/`down` work regardless of the invoking cwd.
  migrationsDir: path.join(__dirname, 'migrations'),
  changelogCollectionName: 'changelog',
  lockCollectionName: 'changelog_lock',
  lockTtl: 0,
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
