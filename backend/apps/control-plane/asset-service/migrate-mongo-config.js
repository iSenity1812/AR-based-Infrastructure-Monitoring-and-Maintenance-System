const defaultMongoUri =
  process.env.ASSET_MONGODB_URI ??
  process.env.MONGODB_URI ??
  'mongodb://127.0.0.1:27017/asset_db';

function getDatabaseNameFromUri(uri) {
  try {
    const normalizedUri = uri.replace('mongodb+srv://', 'http://').replace(
      'mongodb://',
      'http://',
    );
    const parsed = new URL(normalizedUri);
    const pathname = parsed.pathname.replace(/^\/+/, '');
    return pathname || 'asset-service';
  } catch {
    return 'asset-service';
  }
}

module.exports = {
  mongodb: {
    url: defaultMongoUri,
    databaseName:
      process.env.ASSET_MONGODB_DATABASE ??
      process.env.MONGODB_DATABASE ??
      getDatabaseNameFromUri(defaultMongoUri),
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'asset_service_migrations',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};
