const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, 'node_modules', '@pdftron', 'webviewer', 'public');
const destination = path.join(projectRoot, 'public', 'lib', 'webviewer');

if (!fs.existsSync(source)) {
  console.error('[WebViewer] Package assets were not found:', source);
  process.exit(1);
}

fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, destination, { recursive: true, force: true });

console.log('[WebViewer] Static assets copied to', destination);
