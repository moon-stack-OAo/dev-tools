// Nginx access log 解析 / 统计 / 过滤
// 纯函数: parseNginxLogLine / parseNginxLog / summarizeNginxLog

/**
 * 解析 combined 格式单行
 * 典型: $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
 * @param {string} line
 * @returns {object|null}
 */
function parseNginxLogLine(line) {
    if (line == null) return null;
    const raw = String(line).trim();
    if (!raw) return null;

    // 主正则：IP - user [time] "request" status bytes "referer" "ua"
    const re =
        /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})\s+(\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?(?:\s+"([^"]*)")?/;
    let m = raw.match(re);
    if (!m) {
        // 宽松：无 referer/ua
        const loose =
            /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})\s+(\S+)/;
        m = raw.match(loose);
        if (!m) return null;
    }

    const request = m[4] || '';
    const reqParts = request.match(/^(\S+)\s+(\S+)(?:\s+(\S+))?/);
    const method = reqParts ? reqParts[1] : '';
    const path = reqParts ? reqParts[2] : request;
    const protocol = reqParts && reqParts[3] ? reqParts[3] : '';

    const bytesRaw = m[6];
    const bytes = bytesRaw === '-' ? 0 : parseInt(bytesRaw, 10);
    const status = parseInt(m[5], 10);

    // 提取 path 无 query
    let urlPath = path;
    let query = '';
    const qIdx = path.indexOf('?');
    if (qIdx >= 0) {
        urlPath = path.slice(0, qIdx);
        query = path.slice(qIdx + 1);
    }

    return {
        ip: m[1],
        user: m[2] === '-' ? '' : m[2],
        time: m[3],
        request: request,
        method: method,
        path: path,
        urlPath: urlPath,
        query: query,
        protocol: protocol,
        status: status,
        bytes: isNaN(bytes) ? 0 : bytes,
        referer: m[7] === '-' ? '' : m[7] || '',
        userAgent: m[8] || '',
        raw: raw,
    };
}

/**
 * 解析多行日志
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.statusMin]
 * @param {number} [options.statusMax]
 * @param {string} [options.method]
 * @param {string} [options.ip]
 * @param {string} [options.pathContains]
 * @param {number} [options.limit] 最多返回条数
 * @returns {{entries:Array, skipped:number, totalLines:number}}
 */
function parseNginxLog(text, options) {
    options = options || {};
    const lines = String(text == null ? '' : text).split(/\r?\n/);
    const entries = [];
    let skipped = 0;
    const methodFilter = (options.method || '').toUpperCase();
    const ipFilter = (options.ip || '').trim();
    const pathFilter = (options.pathContains || '').trim();
    const statusMin = options.statusMin != null ? Number(options.statusMin) : null;
    const statusMax = options.statusMax != null ? Number(options.statusMax) : null;
    const limit = options.limit != null ? Number(options.limit) : null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const e = parseNginxLogLine(line);
        if (!e) {
            skipped++;
            continue;
        }
        if (methodFilter && e.method.toUpperCase() !== methodFilter) continue;
        if (ipFilter && e.ip.indexOf(ipFilter) < 0) continue;
        if (pathFilter && e.path.indexOf(pathFilter) < 0) continue;
        if (statusMin != null && !isNaN(statusMin) && e.status < statusMin) continue;
        if (statusMax != null && !isNaN(statusMax) && e.status > statusMax) continue;
        entries.push(e);
        if (limit != null && !isNaN(limit) && entries.length >= limit) break;
    }

    return {
        entries: entries,
        skipped: skipped,
        totalLines: lines.filter(function (l) {
            return l.trim();
        }).length,
    };
}

/**
 * 统计
 * @param {Array|object} entriesOrResult entries 数组或 parseNginxLog 结果
 * @param {object} [options]
 * @param {number} [options.topN=10]
 * @returns {object}
 */
function summarizeNginxLog(entriesOrResult, options) {
    options = options || {};
    const topN = options.topN != null ? options.topN : 10;
    const entries = Array.isArray(entriesOrResult)
        ? entriesOrResult
        : (entriesOrResult && entriesOrResult.entries) || [];

    const statusCount = Object.create(null);
    const ipCount = Object.create(null);
    const urlCount = Object.create(null);
    const methodCount = Object.create(null);
    let totalBytes = 0;
    let minStatus = 999;
    let maxStatus = 0;

    entries.forEach(function (e) {
        const st = String(e.status);
        statusCount[st] = (statusCount[st] || 0) + 1;
        ipCount[e.ip] = (ipCount[e.ip] || 0) + 1;
        const u = e.urlPath || e.path;
        urlCount[u] = (urlCount[u] || 0) + 1;
        methodCount[e.method || '-'] = (methodCount[e.method || '-'] || 0) + 1;
        totalBytes += e.bytes || 0;
        if (e.status < minStatus) minStatus = e.status;
        if (e.status > maxStatus) maxStatus = e.status;
    });

    function top(map, n) {
        return Object.keys(map)
            .map(function (k) {
                return { key: k, count: map[k] };
            })
            .sort(function (a, b) {
                return b.count - a.count;
            })
            .slice(0, n);
    }

    const status2xx = entries.filter(function (e) {
        return e.status >= 200 && e.status < 300;
    }).length;
    const status3xx = entries.filter(function (e) {
        return e.status >= 300 && e.status < 400;
    }).length;
    const status4xx = entries.filter(function (e) {
        return e.status >= 400 && e.status < 500;
    }).length;
    const status5xx = entries.filter(function (e) {
        return e.status >= 500 && e.status < 600;
    }).length;

    return {
        total: entries.length,
        totalBytes: totalBytes,
        statusCount: statusCount,
        statusGroups: {
            '2xx': status2xx,
            '3xx': status3xx,
            '4xx': status4xx,
            '5xx': status5xx,
        },
        topIps: top(ipCount, topN),
        topUrls: top(urlCount, topN),
        topMethods: top(methodCount, topN),
        methodCount: methodCount,
    };
}

// ========== UI ==========

function nxlParse() {
    const input = document.getElementById('nxlInput').value;
    const out = document.getElementById('nxlOutput');
    const statsEl = document.getElementById('nxlStats');
    try {
        const opts = {
            method: document.getElementById('nxlMethod').value,
            ip: document.getElementById('nxlIp').value,
            pathContains: document.getElementById('nxlPath').value,
            statusMin: document.getElementById('nxlStatusMin').value || null,
            statusMax: document.getElementById('nxlStatusMax').value || null,
            limit: parseInt(document.getElementById('nxlLimit').value, 10) || 500,
        };
        const result = parseNginxLog(input, opts);
        const summary = summarizeNginxLog(result, { topN: 10 });

        // 表格
        let html = '';
        if (!result.entries.length) {
            html = '<div class="nxl-empty">无匹配日志行</div>';
        } else {
            html =
                '<table class="nxl-table"><thead><tr>' +
                '<th>IP</th><th>Time</th><th>Method</th><th>Path</th><th>Status</th><th>Bytes</th>' +
                '</tr></thead><tbody>';
            result.entries.forEach(function (e) {
                const stClass =
                    e.status >= 500
                        ? 'nxl-st-5'
                        : e.status >= 400
                          ? 'nxl-st-4'
                          : e.status >= 300
                            ? 'nxl-st-3'
                            : 'nxl-st-2';
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(e.ip) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(e.time) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(e.method) +
                    '</td>' +
                    '<td class="nxl-path" title="' +
                    escapeHtml(e.path) +
                    '">' +
                    escapeHtml(e.path) +
                    '</td>' +
                    '<td class="' +
                    stClass +
                    '">' +
                    e.status +
                    '</td>' +
                    '<td>' +
                    e.bytes +
                    '</td>' +
                    '</tr>';
            });
            html += '</tbody></table>';
        }
        out.innerHTML = html;

        // 统计
        let sh =
            '<div class="nxl-stat-grid">' +
            '<div class="nxl-stat"><div class="nxl-stat-v">' +
            summary.total +
            '</div><div class="nxl-stat-l">匹配行</div></div>' +
            '<div class="nxl-stat"><div class="nxl-stat-v">' +
            summary.statusGroups['2xx'] +
            '</div><div class="nxl-stat-l">2xx</div></div>' +
            '<div class="nxl-stat"><div class="nxl-stat-v">' +
            summary.statusGroups['4xx'] +
            '</div><div class="nxl-stat-l">4xx</div></div>' +
            '<div class="nxl-stat"><div class="nxl-stat-v">' +
            summary.statusGroups['5xx'] +
            '</div><div class="nxl-stat-l">5xx</div></div>' +
            '<div class="nxl-stat"><div class="nxl-stat-v">' +
            formatBytes(summary.totalBytes) +
            '</div><div class="nxl-stat-l">流量</div></div>' +
            '</div>';

        sh += '<div class="nxl-tops"><div><strong>Top IP</strong><ul>';
        summary.topIps.forEach(function (t) {
            sh +=
                '<li>' +
                escapeHtml(t.key) +
                ' <span class="nxl-cnt">' +
                t.count +
                '</span></li>';
        });
        sh += '</ul></div><div><strong>Top URL</strong><ul>';
        summary.topUrls.forEach(function (t) {
            sh +=
                '<li title="' +
                escapeHtml(t.key) +
                '">' +
                escapeHtml(t.key) +
                ' <span class="nxl-cnt">' +
                t.count +
                '</span></li>';
        });
        sh += '</ul></div></div>';

        if (result.skipped) {
            sh +=
                '<div class="nxl-skip">跳过无法解析 ' +
                result.skipped +
                ' 行 / 非空 ' +
                result.totalLines +
                ' 行</div>';
        }
        statsEl.innerHTML = sh;
        setStatus('解析 ' + summary.total + ' 条（跳过 ' + result.skipped + '）');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        statsEl.innerHTML = '';
        setStatus('解析失败');
    }
}

function nxlClear() {
    document.getElementById('nxlInput').value = '';
    document.getElementById('nxlOutput').innerHTML = '';
    document.getElementById('nxlStats').innerHTML = '';
    setStatus('已清空');
}

function nxlLoadSample() {
    document.getElementById('nxlInput').value = [
        '192.168.1.10 - - [14/Aug/2026:10:00:01 +0800] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"',
        '192.168.1.10 - - [14/Aug/2026:10:00:02 +0800] "GET /api/users/1 HTTP/1.1" 200 456 "-" "Mozilla/5.0"',
        '10.0.0.5 - - [14/Aug/2026:10:00:03 +0800] "POST /api/login HTTP/1.1" 401 89 "https://app.example.com" "curl/8.0"',
        '10.0.0.5 - - [14/Aug/2026:10:00:04 +0800] "POST /api/login HTTP/1.1" 200 210 "https://app.example.com" "curl/8.0"',
        '203.0.113.8 - - [14/Aug/2026:10:00:05 +0800] "GET /static/app.js HTTP/1.1" 304 0 "-" "Mozilla/5.0"',
        '203.0.113.8 - - [14/Aug/2026:10:00:06 +0800] "GET /api/orders?page=1 HTTP/1.1" 500 32 "-" "Mozilla/5.0"',
        '192.168.1.10 - - [14/Aug/2026:10:00:07 +0800] "DELETE /api/users/9 HTTP/1.1" 204 0 "-" "Mozilla/5.0"',
        'bad line that should be skipped',
    ].join('\n');
    setStatus('已加载示例');
}

if (typeof registerInit !== 'undefined') {
    registerInit('nginxlog', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseNginxLogLine: parseNginxLogLine,
        parseNginxLog: parseNginxLog,
        summarizeNginxLog: summarizeNginxLog,
    };
}
