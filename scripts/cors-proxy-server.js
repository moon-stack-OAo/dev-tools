/**
 * 生产 / 预览用 CORS 代理（与 vite.config.js 中 cors-proxy 行为对齐）
 *
 * 端点：GET|POST|... /__cors_proxy?target=<encodeURIComponent(url)>
 * 监听：CORS_PROXY_HOST（默认 127.0.0.1）: CORS_PROXY_PORT（默认 3927）
 *
 * 安全：
 * - 仅 http/https target
 * - 拒绝云元数据 / link-local 等高危 SSRF
 * - 方法白名单；超时 60s
 * - 响应头 x-proxied-by: dev-tools-cors-proxy（前端探测依赖）
 *
 * 注意：公网暴露时等同「受限开放代理」，请仅内网部署或前置鉴权。
 */
"use strict";

const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const HOST = process.env.CORS_PROXY_HOST || "127.0.0.1";
const PORT = parseInt(process.env.CORS_PROXY_PORT || "3927", 10);
const TIMEOUT_MS = 60_000;

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

function isBlockedTargetHost(hostname) {
  const h = String(hostname || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (
    h === "metadata" ||
    h === "metadata.google.internal" ||
    h === "instance-data" ||
    h.endsWith(".metadata.google.internal")
  ) {
    return true;
  }
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const p = m.slice(1, 5).map(Number);
    if (p.some((n) => n > 255)) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === 0) return true;
    return false;
  }
  if (/^fe[89ab]/i.test(h)) return true;
  if (h === "fd00:ec2::254" || h.startsWith("fd00:ec2::254")) return true;
  return false;
}

function sendPlain(res, status, message, extraHeaders) {
  const headers = Object.assign(
    {
      "content-type": "text/plain; charset=utf-8",
      "x-proxied-by": "dev-tools-cors-proxy",
      "cache-control": "no-store",
    },
    extraHeaders || {},
  );
  res.writeHead(status, headers);
  res.end(message);
}

function handleProxy(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    sendPlain(res, 405, "Method not allowed: " + method);
    return;
  }

  let u;
  try {
    u = new URL(req.url || "/", "http://127.0.0.1");
  } catch (e) {
    sendPlain(res, 400, "Invalid request URL");
    return;
  }

  // 路径必须是 /__cors_proxy（nginx 反代时 path 可能带前缀，取 pathname 末段）
  if (!u.pathname.endsWith("/__cors_proxy") && u.pathname !== "/__cors_proxy") {
    sendPlain(res, 404, "Not found");
    return;
  }

  const target = u.searchParams.get("target");
  if (!target) {
    sendPlain(res, 400, "Missing target query parameter");
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch (e) {
    sendPlain(res, 400, "Invalid target URL: " + target);
    return;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    sendPlain(res, 400, "Only http/https protocol supported");
    return;
  }
  if (isBlockedTargetHost(parsed.hostname)) {
    sendPlain(
      res,
      403,
      "Target host is blocked (metadata/link-local): " + parsed.hostname,
    );
    return;
  }

  const hopByHop = new Set([
    "host",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "origin",
    "referer",
    "content-length",
    "content-encoding",
  ]);
  const fwdHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!hopByHop.has(k.toLowerCase())) fwdHeaders[k] = v;
  }
  fwdHeaders.host = parsed.host;

  const lib = parsed.protocol === "https:" ? https : http;
  const proxyReq = lib.request(
    {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: req.method,
      headers: fwdHeaders,
      timeout: TIMEOUT_MS,
    },
    (proxyRes) => {
      const respHeaders = {
        "x-proxied-by": "dev-tools-cors-proxy",
        "access-control-expose-headers":
          "Content-Disposition, Content-Type, Content-Length, Content-Range, X-Proxied-By",
        "cache-control": "no-store",
      };
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        const lk = k.toLowerCase();
        if (["connection", "keep-alive", "transfer-encoding"].includes(lk))
          continue;
        respHeaders[k] = v;
      }
      res.writeHead(proxyRes.statusCode || 502, respHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.setTimeout(TIMEOUT_MS, () => {
    proxyReq.destroy(new Error("Proxy request timeout"));
  });

  proxyReq.on("error", (err) => {
    if (res.headersSent) {
      res.destroy(err);
    } else {
      sendPlain(res, 502, "Proxy error: " + err.message);
    }
  });

  req.on("error", (err) => proxyReq.destroy(err));
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  // 健康检查
  if (req.url === "/healthz" || req.url === "/__cors_proxy/healthz") {
    sendPlain(res, 200, "ok");
    return;
  }
  handleProxy(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(
    "[cors-proxy] listening on http://" + HOST + ":" + PORT + "/__cors_proxy",
  );
});

server.on("error", (err) => {
  console.error("[cors-proxy] failed to start:", err.message);
  process.exit(1);
});
