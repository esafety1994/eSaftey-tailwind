const fs = require('fs').promises;
const path = require('path');
const { minify } = require('terser');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

async function minifyFile(filePath) {
  const code = await fs.readFile(filePath, 'utf8');
  const res = await minify(code, { ecma: 2020, module: false });
  if (!res.code) throw new Error('Minification failed for ' + filePath);
  const outPath = filePath.replace(/\.js$/, '.min.js');
  await fs.writeFile(outPath, res.code, 'utf8');
  console.log('Minified', path.basename(filePath), '→', path.basename(outPath));
}

async function run() {
  const files = await fs.readdir(ASSETS_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));
  for (const f of jsFiles) {
    const full = path.join(ASSETS_DIR, f);
    try {
      await minifyFile(full);
    } catch (err) {
      console.error('Error minifying', f, err);
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
