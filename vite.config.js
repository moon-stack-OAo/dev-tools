import {defineConfig} from 'vite';
import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyDir(path.join(src, entry), path.join(dest, entry));
    }
  } else if (src.endsWith('.js')) {
    fs.copyFileSync(src, dest);
  }
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 3000,
    open: true,
  },
  plugins: [
    {
      name: 'copy-js-assets',
      closeBundle() {
        if (fs.existsSync('js')) {
          copyDir('js', 'dist/js');
          console.log('✓ JS 文件已复制到 dist/js/');
        }
      },
    },
  ],
});
