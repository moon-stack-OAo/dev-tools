const fs = require('fs');
const path = require('path');

const LIB_DIR = path.join(__dirname, '..', 'public', 'lib');

const libs = [
  { src: 'js-yaml/dist/js-yaml.min.js', dest: 'js-yaml.min.js' },
  { src: 'diff/dist/diff.min.js', dest: 'diff.min.js' },
  { src: 'blueimp-md5/js/md5.min.js', dest: 'md5.min.js' },
  { src: 'sql-formatter/dist/sql-formatter.min.js', dest: 'sql-formatter.min.js' },
];

if (!fs.existsSync(LIB_DIR)) {
  fs.mkdirSync(LIB_DIR, { recursive: true });
}

libs.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, '..', 'node_modules', src);
  const destPath = path.join(LIB_DIR, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ ${dest}`);
  } else {
    console.error(`✗ 未找到 ${srcPath}，请先执行 npm install`);
    process.exit(1);
  }
});

console.log('\n依赖库已复制到 public/lib/');
