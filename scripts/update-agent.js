/**
 * 服务器一键更新 Agent（零依赖，仅 Node 内置模块）
 *
 * 监听 127.0.0.1，供 Nginx 反代：
 *   GET  /healthz
 *   GET  /api/version
 *   GET  /api/status
 *   POST /api/update          Header: X-Update-Token
 *   GET  /api/update/log
 *
 * 环境变量见 .env.deploy.example
 */
'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const UPDATE_TOKEN = process.env.UPDATE_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'moon-stack-OAo/dev-tools';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const DEPLOY_MODE = (process.env.DEPLOY_MODE || 'static').toLowerCase();
const REPO_DIR = process.env.REPO_DIR || process.cwd();
const SITE_ROOT = process.env.SITE_ROOT || '/var/www/dev-tools';
const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1';
const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || '3930', 10);
const UPDATE_SCRIPT_STATIC =
    process.env.UPDATE_SCRIPT_STATIC || path.join(__dirname, 'update-static.sh');
const UPDATE_SCRIPT_DOCKER =
    process.env.UPDATE_SCRIPT_DOCKER || path.join(__dirname, 'update-docker.sh');

const MAX_LOG_LINES = 200;

/** @type {{ running: boolean, log: string[], exitCode: number|null, finishedAt: string|null, child: import('child_process').ChildProcess|null }} */
const updateState = {
    running: false,
    log: [],
    exitCode: null,
    finishedAt: null,
    child: null,
};

function appendLog(line) {
    const text = String(line).replace(/\r?\n$/, '');
    if (!text) return;
    updateState.log.push(text);
    if (updateState.log.length > MAX_LOG_LINES) {
        updateState.log = updateState.log.slice(-MAX_LOG_LINES);
    }
    process.stderr.write('[update-agent] ' + text + '\n');
}

function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
}

function sendText(res, status, message) {
    res.writeHead(status, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
    });
    res.end(message);
}

function safeEqual(a, b) {
    const ba = Buffer.from(String(a || ''), 'utf8');
    const bb = Buffer.from(String(b || ''), 'utf8');
    if (ba.length !== bb.length) {
        // 长度不同时仍做一次比较，避免短路径时序差异过大
        const dummy = Buffer.alloc(ba.length);
        crypto.timingSafeEqual(ba, dummy);
        return false;
    }
    if (ba.length === 0) return false;
    return crypto.timingSafeEqual(ba, bb);
}

function resolveVersionPaths() {
    if (process.env.VERSION_FILE) {
        return [path.resolve(process.env.VERSION_FILE)];
    }
    return [
        path.join(SITE_ROOT, 'version.json'),
        path.join(REPO_DIR, 'dist', 'version.json'),
        path.join(REPO_DIR, 'version.json'),
    ];
}

function readLocalVersion() {
    const paths = resolveVersionPaths();
    for (const p of paths) {
        try {
            if (!fs.existsSync(p)) continue;
            const raw = fs.readFileSync(p, 'utf8');
            const data = JSON.parse(raw);
            return { path: p, data };
        } catch (err) {
            appendLog('read version failed: ' + p + ' ' + (err && err.message));
        }
    }
    return { path: null, data: null };
}

function httpsGetJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(
            url,
            {
                headers: {
                    'User-Agent': 'dev-tools-update-agent',
                    Accept: 'application/vnd.github+json',
                },
                timeout: 15000,
            },
            (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error('GitHub HTTP ' + res.statusCode + ': ' + body.slice(0, 200)));
                        return;
                    }
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        reject(new Error('Invalid JSON from GitHub'));
                    }
                });
            },
        );
        req.on('timeout', () => {
            req.destroy(new Error('GitHub request timeout'));
        });
        req.on('error', reject);
    });
}

function extractLocalSha(localData) {
    if (!localData || typeof localData !== 'object') return null;
    return (
        localData.fullSha ||
        localData.sha ||
        localData.gitSha ||
        localData.commit ||
        localData.revision ||
        null
    );
}

async function handleStatus() {
    const local = readLocalVersion();
    // repo 保留 owner/name 中的 /，仅对 branch 编码
    const url =
        'https://api.github.com/repos/' + GITHUB_REPO + '/commits/' + encodeURIComponent(GITHUB_BRANCH);

    let remote = null;
    let ok = true;
    let error = null;
    try {
        const commit = await httpsGetJson(url);
        const sha = commit.sha || '';
        remote = {
            sha,
            short: sha ? sha.slice(0, 7) : '',
            date: (commit.commit && commit.commit.committer && commit.commit.committer.date) || null,
            message: (commit.commit && commit.commit.message && commit.commit.message.split('\n')[0]) || '',
        };
    } catch (err) {
        ok = false;
        error = err && err.message ? err.message : String(err);
    }

    const localSha = extractLocalSha(local.data);
    const upToDate =
        ok && remote && localSha
            ? String(localSha).slice(0, 7) === remote.short || String(localSha) === remote.sha
            : null;

    return {
        ok,
        local: local.data,
        localPath: local.path,
        remote,
        upToDate,
        checkedAt: new Date().toISOString(),
        error,
        meta: { repo: GITHUB_REPO, branch: GITHUB_BRANCH, mode: DEPLOY_MODE },
    };
}

function pickUpdateScript() {
    if (DEPLOY_MODE === 'docker') return UPDATE_SCRIPT_DOCKER;
    return UPDATE_SCRIPT_STATIC;
}

function startUpdate() {
    const script = pickUpdateScript();
    if (!fs.existsSync(script)) {
        return { ok: false, status: 500, message: '更新脚本不存在: ' + script };
    }

    updateState.running = true;
    updateState.log = [];
    updateState.exitCode = null;
    updateState.finishedAt = null;

    appendLog('start update mode=' + DEPLOY_MODE + ' script=' + script);

    const env = Object.assign({}, process.env, {
        REPO_DIR,
        SITE_ROOT,
        GITHUB_REPO,
        GITHUB_BRANCH,
        DEPLOY_MODE,
        BRANCH: GITHUB_BRANCH,
        // CI 产物模式（update-static / update-docker 读取）
        DIST_RELEASE_TAG: process.env.DIST_RELEASE_TAG || 'latest-dist',
        DIST_ASSET_NAME: process.env.DIST_ASSET_NAME || 'dev-tools-dist.tar.gz',
        DIST_DOWNLOAD_URL: process.env.DIST_DOWNLOAD_URL || '',
        DOCKER_IMAGE: process.env.DOCKER_IMAGE || 'ghcr.io/' + GITHUB_REPO,
        DOCKER_TAG: process.env.DOCKER_TAG || 'main',
        DOCKER_CONTAINER: process.env.DOCKER_CONTAINER || 'dev-tools',
        DOCKER_HOST_PORT: process.env.DOCKER_HOST_PORT || '8080',
    });

    const child = spawn('bash', [script], {
        env,
        cwd: REPO_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    updateState.child = child;

    const onData = (buf) => {
        String(buf)
            .split(/\r?\n/)
            .forEach((line) => appendLog(line));
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (err) => {
        appendLog('spawn error: ' + (err && err.message));
        updateState.running = false;
        updateState.exitCode = -1;
        updateState.finishedAt = new Date().toISOString();
        updateState.child = null;
    });

    child.on('close', (code) => {
        appendLog('finished exitCode=' + code);
        updateState.running = false;
        updateState.exitCode = code;
        updateState.finishedAt = new Date().toISOString();
        updateState.child = null;
    });

    return { ok: true, status: 202, message: '更新已开始' };
}

function parseUrl(req) {
    try {
        return new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
    } catch {
        return null;
    }
}

async function onRequest(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    const u = parseUrl(req);
    if (!u) {
        sendText(res, 400, 'bad request');
        return;
    }
    const pathname = u.pathname.replace(/\/+$/, '') || '/';

    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'access-control-allow-methods': 'GET, POST, OPTIONS',
            'access-control-allow-headers': 'Content-Type, X-Update-Token',
            'access-control-max-age': '86400',
        });
        res.end();
        return;
    }

    try {
        if (method === 'GET' && (pathname === '/healthz' || pathname === '/health')) {
            sendText(res, 200, 'ok');
            return;
        }

        if (method === 'GET' && pathname === '/api/version') {
            const local = readLocalVersion();
            if (!local.data) {
                sendJson(res, 404, { ok: false, error: 'version.json not found', tried: resolveVersionPaths() });
                return;
            }
            sendJson(res, 200, { ok: true, path: local.path, version: local.data });
            return;
        }

        if (method === 'GET' && pathname === '/api/status') {
            const status = await handleStatus();
            sendJson(res, status.ok ? 200 : 502, status);
            return;
        }

        if (method === 'GET' && pathname === '/api/update/log') {
            sendJson(res, 200, {
                running: updateState.running,
                log: updateState.log.join('\n'),
                exitCode: updateState.exitCode,
                finishedAt: updateState.finishedAt,
            });
            return;
        }

        if (method === 'POST' && pathname === '/api/update') {
            if (!UPDATE_TOKEN) {
                sendJson(res, 503, { ok: false, error: 'UPDATE_TOKEN 未配置，拒绝更新' });
                return;
            }
            const token = req.headers['x-update-token'] || '';
            if (!safeEqual(token, UPDATE_TOKEN)) {
                sendJson(res, 401, { ok: false, error: 'unauthorized' });
                return;
            }
            if (updateState.running) {
                sendJson(res, 409, { ok: false, error: '更新正在进行中' });
                return;
            }
            const result = startUpdate();
            sendJson(res, result.status, { ok: result.ok, message: result.message });
            return;
        }

        sendJson(res, 404, { ok: false, error: 'not found' });
    } catch (err) {
        appendLog('request error: ' + (err && err.stack ? err.stack : err));
        sendJson(res, 500, { ok: false, error: 'internal error' });
    }
}

const server = http.createServer((req, res) => {
    onRequest(req, res);
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
    process.stderr.write(
        '[update-agent] listening http://' +
            LISTEN_HOST +
            ':' +
            LISTEN_PORT +
            ' mode=' +
            DEPLOY_MODE +
            ' repo=' +
            GITHUB_REPO +
            '@' +
            GITHUB_BRANCH +
            '\n',
    );
});

server.on('error', (err) => {
    process.stderr.write('[update-agent] server error: ' + err.message + '\n');
    process.exit(1);
});
