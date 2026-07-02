const fs = require('fs');
const path = require('path');

const pnpmDir = path.join(__dirname, '..', 'node_modules', '.pnpm');

if (!fs.existsSync(pnpmDir)) {
  process.exit(0);
}

const cliPackages = fs
  .readdirSync(pnpmDir)
  .filter((entry) => entry.startsWith('@expo+cli@'));

for (const cliPackage of cliPackages) {
  const middlewarePath = path.join(
    pnpmDir,
    cliPackage,
    'node_modules',
    '@expo',
    'cli',
    'build',
    'src',
    'start',
    'server',
    'metro',
    'dev-server',
    'createMetroMiddleware.js',
  );

  if (!fs.existsSync(middlewarePath)) {
    continue;
  }

  const source = fs.readFileSync(middlewarePath, 'utf8');
  const original =
    'res.setHeader("X-React-Native-Project-Root", metroConfig.projectRoot);';
  const patched =
    'res.setHeader("X-React-Native-Project-Root", String(metroConfig.projectRoot).replace(/[^\\\\x20-\\\\x7E]/g, "?"));';

  if (source.includes(patched)) {
    continue;
  }

  if (!source.includes(original)) {
    console.warn(`Expo CLI header patch skipped for ${middlewarePath}`);
    continue;
  }

  fs.writeFileSync(middlewarePath, source.replace(original, patched));
  console.log(`Patched Expo CLI project root header: ${middlewarePath}`);
}
