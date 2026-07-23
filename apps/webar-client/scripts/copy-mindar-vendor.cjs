const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = [
  {
    from: path.join(root, 'node_modules', 'aframe', 'dist', 'aframe-master.min.js'),
    to: path.join(root, 'public', 'vendor', 'aframe', 'aframe-master.min.js'),
  },
  {
    from: path.join(root, 'node_modules', 'mind-ar', 'dist', 'mindar-image-aframe.prod.js'),
    to: path.join(root, 'public', 'vendor', 'mind-ar', 'mindar-image-aframe.prod.js'),
  },
];

for (const file of files) {
  if (!fs.existsSync(file.from)) {
    throw new Error(`Missing vendor source: ${file.from}`);
  }

  fs.mkdirSync(path.dirname(file.to), { recursive: true });
  fs.copyFileSync(file.from, file.to);
}

console.log(`[webar-client] Copied ${files.length} MindAR vendor assets`);
