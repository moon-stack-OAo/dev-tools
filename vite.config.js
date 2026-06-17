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
                /\s*<a[^>]*class="header-github"[^>]*>[\s\S]*?<\/a>\s*/g,
                ''
            );
        },
    };
}

// 在 dev 模式下不注入 withGithub 标志（GitHub 链接不创建）；
// 在生产模式注入 window.__DEVTOOLS__ = { withGithub: true }，由 app.js 据此动态创建 GitHub 链接 DOM。
function injectDevtoolsFlagPlugin(mode) {
    return {
        name: 'inject-devtools-flag',
        transformIndexHtml(html) {
            // dev 场景不注入：包括 `npm run dev` (mode='development') 与 `npm run build:dev` (mode='dev')；
            // 仅 `npm run build` 默认 mode='production' 时才注入标志。
            if (mode !== 'production') return html;
            const flagScript = `<script>window.__DEVTOOLS__ = { withGithub: true };</script>`;
            // 注入到 </head> 之前；如果找不到 </head>，退而注入到 <body> 之前
            if (html.includes('</head>')) {
                return html.replace('</head>', flagScript + '</head>');
            }
            if (html.includes('<body')) {
                return html.replace(/<body([^>]*)>/, `<body$1>${flagScript}`);
            }
            return flagScript + html;
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
        injectDevtoolsFlagPlugin(mode),
    ],
}));
