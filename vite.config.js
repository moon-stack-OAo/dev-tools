import {defineConfig} from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
            return html.replace(/\s*<a[^>]*class="header-github"[^>]*>[\s\S]*?<\/a>\s*/g, '');
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

// 构建时扫描 js/ 与 html/ 下所有资源,按文件内容 md5 生成 window.__ASSET_MAP__ 并内联进
// dist/index.html。app.js 动态加载工具脚本/面板时据此附加 ?v=<hash>,实现强缓存与更新自动失效。
// 生产与 build:dev 均需注入(静态部署后 nginx 长缓存,无 ?v= 会命中旧缓存);仅 live dev server 不需要。
function injectAssetMapPlugin(mode) {
    return {
        name: 'inject-asset-map',
        closeBundle() {
            if (mode === 'development') return;
            const map = {};
            const stamp = (rel) => {
                try {
                    return crypto.createHash('md5').update(fs.readFileSync(rel)).digest('hex').slice(0, 8);
                } catch (e) {
                    return '';
                }
            };
            const walk = (dir, pred) => {
                if (!fs.existsSync(dir)) return;
                for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
                    const full = path.join(dir, e.name);
                    if (e.isDirectory()) walk(full, pred);
                    else if (pred(e.name)) {
                        map[path.relative('.', full).replace(/\\/g, '/')] = stamp(full);
                    }
                }
            };
            walk('js', (n) => n.endsWith('.js') && n !== 'app.js');
            walk('html', (n) => n.endsWith('.html'));
            // 扫描 public/lib 下的第三方库,用于 loadLib 按需懒加载的缓存失效
            const libDir = 'public/lib';
            if (fs.existsSync(libDir)) {
                for (const e of fs.readdirSync(libDir)) {
                    if (e.endsWith('.js')) map['lib/' + e] = stamp(path.join(libDir, e));
                }
            }
            const inline = `<script>window.__ASSET_MAP__=${JSON.stringify(map)};</script>`;
            const idx = path.join('dist', 'index.html');
            if (fs.existsSync(idx)) {
                let h = fs.readFileSync(idx, 'utf8');
                h = h.replace('<script src="js/app.js', inline + '\n<script src="js/app.js');
                fs.writeFileSync(idx, h, 'utf8');
                console.log('✓ ASSET_MAP 已内联到 dist/index.html (' + Object.keys(map).length + ' 项)');
            }
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
                return html.replace(/(src|href)="([^"]+\.(js|css))"/g, (m, attr, file) => {
                    try {
                        const buf = fs.readFileSync(file);
                        const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
                        return `${attr}="${file}?v=${hash}"`;
                    } catch (e) {
                        return m;
                    }
                });
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
        injectAssetMapPlugin(mode),
    ],
}));
