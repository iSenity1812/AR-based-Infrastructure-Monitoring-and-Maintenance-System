const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const variables = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    variables[key] = value;
  }

  return variables;
}

function loadMongoUrl() {
  const rootDir = __dirname;
  const env = {
    ...parseEnvFile(path.join(rootDir, ".env.example")),
    ...parseEnvFile(path.join(rootDir, ".env")),
    ...process.env,
  };

  return env.MONGODB_URI || "mongodb://127.0.0.1:27017/identity_db";
}

module.exports = {
  mongodb: {
    url: loadMongoUrl(),
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  lockCollectionName: "changelog_lock",
  lockTtl: 0,
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs",
};
