import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'node:http';
import https from 'node:https';

const md5 = (filePath) => {
    try {
        return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex').slice(0, 8);
    } catch {
        return '';
    }
};

// CORS 代理：仅开发模式启用。
// 浏览器 fetch 跨域会被 CORS 拦截，本代理让前端把请求发到本工具同源的 /__cors_proxy，
// 再由 vite dev server 在 Node 层转发到目标 URL，避开浏览器 CORS 限制。
// 代理端点：任意方法 /__cors_proxy?target=<encodeURIComponent(url)>
// 请求头/Body 原样转发；响应流式回传 + 加 access-control-allow-origin: *。
function corsProxyPlugin() {
    return {
        name: 'cors-proxy',
        configureServer(server) {
            server.middlewares.use('/__cors_proxy', (req, res) => {
                const u = new URL(req.url, 'http://localhost');
                const target = u.searchParams.get('target');
                if (!target) {
                    res.statusCode = 400;
                    res.setHeader('content-type', 'text/plain; charset=utf-8');
                    res.end('Missing target query parameter');
                    return;
                }
                let parsed;
                try {
                    parsed = new URL(target);
                } catch (e) {
                    res.statusCode = 400;
                    res.setHeader('content-type', 'text/plain; charset=utf-8');
                    res.end('Invalid target URL: ' + target);
                    return;
                }
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                    res.statusCode = 400;
                    res.setHeader('content-type', 'text/plain; charset=utf-8');
                    res.end('Only http/https protocol supported');
                    return;
                }

                const hopByHop = new Set([
                    'host',
                    'connection',
                    'keep-alive',
                    'proxy-authenticate',
                    'proxy-authorization',
                    'te',
                    'trailers',
                    'transfer-encoding',
                    'upgrade',
                    'origin',
                    'referer',
                    'content-length',
                    'content-encoding',
                ]);
                const fwdHeaders = {};
                for (const [k, v] of Object.entries(req.headers)) {
                    if (!hopByHop.has(k.toLowerCase())) fwdHeaders[k] = v;
                }
                fwdHeaders.host = parsed.host;

                const lib = parsed.protocol === 'https:' ? https : http;
                const proxyReq = lib.request(
                    {
                        hostname: parsed.hostname,
                        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                        path: parsed.pathname + parsed.search,
                        method: req.method,
                        headers: fwdHeaders,
                    },
                    (proxyRes) => {
                        const respHeaders = {};
                        for (const [k, v] of Object.entries(proxyRes.headers)) {
                            const lk = k.toLowerCase();
                            if (['connection', 'keep-alive', 'transfer-encoding'].includes(lk)) continue;
                            respHeaders[k] = v;
                        }
                        respHeaders['access-control-allow-origin'] = '*';
                        respHeaders['access-control-allow-credentials'] = 'true';
                        respHeaders['access-control-expose-headers'] =
                            'Content-Disposition, Content-Type, Content-Length, Content-Range';
                        respHeaders['x-proxied-by'] = 'dev-tools-cors-proxy';
                        res.writeHead(proxyRes.statusCode || 502, respHeaders);
                        proxyRes.pipe(res);
                    }
                );

                proxyReq.setTimeout(60_000, () => {
                    proxyReq.destroy(new Error('Proxy request timeout'));
                });

                proxyReq.on('error', (err) => {
                    if (res.headersSent) {
                        res.destroy(err);
                    } else {
                        res.statusCode = 502;
                        res.setHeader('content-type', 'text/plain; charset=utf-8');
                        res.setHeader('access-control-allow-origin', '*');
                        res.end('Proxy error: ' + err.message);
                    }
                });

                req.on('error', (err) => proxyReq.destroy(err));
                req.pipe(proxyReq);
            });
        },
    };
}

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

function copyTree(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
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
            const walk = (dir, pred) => {
                if (!fs.existsSync(dir)) return;
                for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                    const full = path.join(dir, e.name);
                    if (e.isDirectory()) walk(full, pred);
                    else if (pred(e.name)) {
                        map[path.relative('.', full).replace(/\\/g, '/')] = md5(full);
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

export default defineConfig(({ mode }) => ({
    base: './',
    build: {
        outDir: 'dist',
        assetsInlineLimit: 0,
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        open: true,
    },
    plugins: [
        corsProxyPlugin(),
        {
            name: 'cache-bust',
            transformIndexHtml(html) {
                return html.replace(/(src|href)="([^"]+\.(js|css))"/g, (m, attr, file) => {
                    const hash = md5(file);
                    return hash ? `${attr}="${file}?v=${hash}"` : m;
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
