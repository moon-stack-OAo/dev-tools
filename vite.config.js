import {defineConfig} from 'vite';
import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
    if (fs.statSync(src).isDirectory()) {
        fs.mkdirSync(dest, {recursive: true});
        for (const entry of fs.readdirSync(src)) {
            copyDir(path.join(src, entry), path.join(dest, entry));
        }
    } else if (src.endsWith('.js')) {
        fs.copyFileSync(src, dest);
    }
}

function copyTree(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, {recursive: true});
    for (const entry of fs.readdirSync(src)) {
        const s = path.join(src, entry);
        const d = path.join(dest, entry);
        if (fs.statSync(s).isDirectory()) {
            copyTree(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

function removeGithubPlugin(mode) {
    return {
        name: 'remove-github-link',
        transformIndexHtml(html) {
            if (mode !== 'dev') return html;
            return html.replace(
                /[\s]*<a class="header-github"[\s\S]*?<\/a>/g,
                ''
            );
        },
    };
}

export default defineConfig(({mode}) => ({
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
            name: 'cache-bust',
            transformIndexHtml(html) {
                const v = Date.now().toString(36);
                return html.replace(
                    /(src|href)="([^"]+\.(js|css))"/g,
                    `$1="$2?v=${v}"`
                );
            },
        },
        {
            name: 'copy-js-assets',
            closeBundle() {
                if (fs.existsSync('js')) {
                    copyDir('js', 'dist/js');
                    console.log('✓ JS 文件已复制到 dist/js/');
                }
                if (fs.existsSync('html')) {
                    copyTree('html', 'dist/html');
                    console.log('✓ HTML 片段已复制到 dist/html/');
                }
            },
        },
        removeGithubPlugin(mode),
    ],
}));
