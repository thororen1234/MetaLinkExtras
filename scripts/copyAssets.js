const { copyFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const srcRenderer = join(root, 'src', 'renderer');
const outRenderer = join(root, 'out', 'renderer');

mkdirSync(outRenderer, { recursive: true });

['index.html', 'styles.css'].forEach(file => {
  copyFileSync(join(srcRenderer, file), join(outRenderer, file));
  console.log(`Copied ${file} to out/renderer/${file}`);
});
