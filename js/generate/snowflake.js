// === Snowflake ID Generator ===
// 集成三种主流分布式 ID 算法：Twitter Snowflake / 美团 Leaf / 百度 UID
// 全部使用 BigInt 保证 > 2^53 的大数精度

const SNOWFLAKE_EPOCH = 1288834974657n; // Twitter Epoch: 2010-11-04 01:42:54.657 UTC
const LEAF_EPOCH = 1577808000000n; // Leaf Epoch: 2020-01-01 00:00:00.000 UTC
const BAIDU_EPOCH = 1577808000000n; // Baidu UID Epoch: 2020-01-01 00:00:00.000 UTC

// 状态变量（闭包外模拟 Worker 单例）
let sfLastTimestamp = -1n;
let sfSequence = 0n;
let sfHistory = []; // [{ id, algorithm, timestamp, datetime, datacenterId, workerId, sequence, bizTag? }]

// 工具：格式化时间为本地字符串
function sfFormatTime(ms) {
    const d = new Date(Number(ms));
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
    );
}

// === 1. Twitter Snowflake 纯函数 ===
function snowflakeId(workerId, datacenterId, seq, ts, epoch) {
    epoch = epoch || SNOWFLAKE_EPOCH;
    workerId = BigInt(workerId || 0);
    datacenterId = BigInt(datacenterId || 0);
    seq = BigInt(seq || 0);
    ts = BigInt(ts || Date.now());
    const timestamp = ts - epoch;
    if (timestamp < 0n) throw new Error('时间戳小于 Epoch');
    if (timestamp >= 1n << 41n) throw new Error('时间戳超过 41 位');

    const id = (timestamp << 22n) | ((datacenterId & 0x1fn) << 17n) | ((workerId & 0x1fn) << 12n) | (seq & 0xfffn);
    return id;
}

// === 2. Twitter/Leaf 并发安全序列号生成 ===
function nextSnowflake(workerId, datacenterId, epoch) {
    let ts = BigInt(Date.now());

    if (ts === sfLastTimestamp) {
        sfSequence = (sfSequence + 1n) & 0xfffn;
        if (sfSequence === 0n) {
            // 当前毫秒序列号用尽，等待下一毫秒
            while (ts <= sfLastTimestamp) ts = BigInt(Date.now());
        }
    } else {
        sfSequence = 0n;
    }

    sfLastTimestamp = ts;
    return snowflakeId(workerId, datacenterId, sfSequence, ts, epoch);
}

// === 3. 美团 Leaf（结构与 Twitter 一致，bizTag 占位 DC 位） ===
function nextLeafId(bizTag, workerId) {
    return nextSnowflake(workerId || 0, bizTag || 0, LEAF_EPOCH);
}

// === 4. 百度 UID（时间戳 + 18 位随机序列，Base36 编码） ===
function baiduUid() {
    const ts = BigInt(Date.now()) - BAIDU_EPOCH;
    // 18 位随机序列，使用 crypto.getRandomValues 提升质量
    const buf = new Uint8Array(4);
    crypto.getRandomValues(buf);
    const seq = (BigInt(buf[0]) << 16n) | (BigInt(buf[1]) << 8n) | BigInt(buf[2]);
    const id = (ts << 18n) | (seq & 0x3ffffn);
    return id.toString(36);
}

// === 5. 反向解析（支持 Twitter / Leaf 64 位数字 ID） ===
function parseSnowflake(idStr, epoch) {
    epoch = epoch || SNOWFLAKE_EPOCH;
    if (!/^\d{1,20}$/.test(String(idStr).trim())) {
        throw new Error('ID 必须为纯数字（10 进制或 Base36）');
    }
    const id = BigInt(idStr);
    const timestamp = Number((id >> 22n) & 0x1ffffffffffn) + Number(epoch);
    const datacenterId = Number((id >> 17n) & 0x1fn);
    const workerId = Number((id >> 12n) & 0x1fn);
    const sequence = Number(id & 0xfffn);

    return {
        timestamp,
        datetime: new Date(timestamp).toISOString(),
        localTime: sfFormatTime(timestamp),
        datacenterId,
        workerId,
        sequence,
    };
}

// 工具：Base36 字符串转 BigInt（BigInt 构造器不支持 Base36，需手动转换）
function sfBase36ToBigInt(s) {
    let result = 0n;
    for (const ch of String(s).toLowerCase()) {
        const d = parseInt(ch, 36);
        if (isNaN(d)) throw new Error('非法 Base36 字符: ' + ch);
        result = result * 36n + BigInt(d);
    }
    return result;
}

// 解析百度 UID（Base36 解码后按 18 位拆分时间戳与序列号）
function parseBaiduUid(idStr) {
    if (!/^[0-9a-z]+$/i.test(String(idStr).trim())) {
        throw new Error('百度 UID 必须是 Base36 字符串');
    }
    const id = sfBase36ToBigInt(idStr);
    const timestamp = Number((id >> 18n) + BAIDU_EPOCH);
    const sequence = Number(id & 0x3ffffn);
    return {
        timestamp,
        datetime: new Date(timestamp).toISOString(),
        localTime: sfFormatTime(timestamp),
        sequence,
    };
}

// === 6. 批量生成 ===
function sfGenerate(count) {
    const algo = document.getElementById('sfAlgorithm').value;
    const workerId = parseInt(document.getElementById('sfWorkerId').value, 10) || 0;
    const datacenterId = parseInt(document.getElementById('sfDcId').value, 10) || 0;
    const epochInput = document.getElementById('sfEpoch').value.trim();

    // 校验范围
    if (workerId < 0 || workerId > 31) {
        setStatus('Worker ID 必须在 0~31 之间');
        return;
    }
    if (datacenterId < 0 || datacenterId > 31) {
        setStatus('DataCenter ID 必须在 0~31 之间');
        return;
    }

    const list = document.getElementById('sfList');
    const newItems = [];
    const startCount = list.querySelector('[data-empty]') ? 0 : list.children.length;

    for (let i = 0; i < count; i++) {
        let id, parsed, recordId;
        if (algo === 'twitter') {
            // 自定义 epoch（可选覆盖）
            const epoch = epochInput ? BigInt(epochInput) : SNOWFLAKE_EPOCH;
            id = nextSnowflake(workerId, datacenterId, epoch);
            const idStr = id.toString();
            const p = parseSnowflake(idStr, epoch);
            parsed = {
                id: idStr,
                algorithm: 'Twitter Snowflake',
                timestamp: p.timestamp,
                datetime: p.localTime,
                datacenterId: p.datacenterId,
                workerId: p.workerId,
                sequence: p.sequence,
            };
        } else if (algo === 'leaf') {
            id = nextLeafId(datacenterId, workerId);
            const idStr = id.toString();
            const p = parseSnowflake(idStr, LEAF_EPOCH);
            parsed = {
                id: idStr,
                algorithm: '美团 Leaf',
                timestamp: p.timestamp,
                datetime: p.localTime,
                datacenterId: p.datacenterId,
                workerId: p.workerId,
                sequence: p.sequence,
            };
        } else {
            // baidu
            const idStr = baiduUid();
            const p = parseBaiduUid(idStr);
            parsed = {
                id: idStr,
                algorithm: '百度 UID',
                timestamp: p.timestamp,
                datetime: p.localTime,
                sequence: p.sequence,
            };
        }
        newItems.push(parsed);
    }

    // 反向插入到顶部（最新的在上）
    newItems.reverse().forEach((item) => {
        const div = document.createElement('div');
        div.className = 'uuid-item';
        const algoLabel = String(item.algorithm).replace(/</g, '&lt;');
        const idSafe = String(item.id).replace(/</g, '&lt;');
        const dtSafe = String(item.datetime).replace(/</g, '&lt;');
        let meta;
        if (item.algorithm === '百度 UID') {
            meta = `时间=${dtSafe} | SEQ=${item.sequence}`;
        } else {
            meta = `时间=${dtSafe} | DC=${item.datacenterId} | W=${item.workerId} | SEQ=${item.sequence}`;
        }
        div.innerHTML =
            `<div style="flex:1;min-width:0;overflow:hidden">` +
            `<div style="font-family:var(--font);color:var(--accent);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${idSafe}">${idSafe}</div>` +
            `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${algoLabel} · ${meta}</div>` +
            `</div>` +
            `<button class="sm outline" style="margin-left:8px;flex-shrink:0" data-copy="${idSafe}">复制</button>`;
        div.querySelector('[data-copy]').addEventListener('click', function () {
            safeCopy(this.getAttribute('data-copy'), '已复制 ID');
        });
        if (list.firstChild && list.firstChild.dataset && list.firstChild.dataset.empty) {
            list.innerHTML = '';
        }
        list.insertBefore(div, list.firstChild);
        sfHistory.unshift(item);
    });

    // 截断到 20 条
    while (list.children.length > 20) {
        list.removeChild(list.lastChild);
    }
    while (sfHistory.length > 20) {
        sfHistory.pop();
    }

    // 更新最新 ID 显示
    const latest = newItems[0];
    document.getElementById('sfLatest').textContent = latest.id;
    document.getElementById('sfLatestMeta').textContent = (() => {
        if (latest.algorithm === '百度 UID') {
            return `${latest.algorithm} · 时间=${latest.datetime} · SEQ=${latest.sequence}`;
        }
        return `${latest.algorithm} · 时间=${latest.datetime} · DC=${latest.datacenterId} · W=${latest.workerId} · SEQ=${latest.sequence}`;
    })();

    setStatus(`已生成 ${count} 个 ${latest.algorithm} ID`);
}

// === 7. 清空历史 ===
function sfClear() {
    document.getElementById('sfList').innerHTML =
        '<div data-empty style="color:var(--text-dim);font-size:13px;padding:8px 0">点击按钮生成 ID</div>';
    document.getElementById('sfLatest').textContent = '-';
    document.getElementById('sfLatestMeta').textContent = '尚未生成';
    sfHistory = [];
    setStatus('已清空历史');
}

// === 8. 复制全部 ===
function sfCopyAll() {
    if (sfHistory.length === 0) {
        setStatus('历史为空，无可复制内容');
        return;
    }
    const text = sfHistory.map((h) => h.id).join('\n');
    safeCopy(text, `已复制 ${sfHistory.length} 个 ID`);
}

// === 9. 导出 CSV ===
function sfExportCSV() {
    if (sfHistory.length === 0) {
        setStatus('历史为空，无可导出内容');
        return;
    }
    const header = 'Algorithm,ID,Timestamp(ms),Datetime(ISO),LocalTime,DatacenterID,WorkerID,Sequence\n';
    const rows = sfHistory
        .map((h) => {
            const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
            return [
                esc(h.algorithm),
                esc(h.id),
                esc(h.timestamp),
                esc(new Date(h.timestamp).toISOString()),
                esc(h.datetime),
                esc(h.datacenterId == null ? '' : h.datacenterId),
                esc(h.workerId == null ? '' : h.workerId),
                esc(h.sequence == null ? '' : h.sequence),
            ].join(',');
        })
        .join('\n');
    // 加 BOM 让 Excel 正确识别 UTF-8
    const csv = '\uFEFF' + header + rows;
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snowflake-ids-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`已导出 ${sfHistory.length} 条到 CSV`);
}

// === 10. 反向解析（UI 入口） ===
function sfParseInput() {
    const raw = document.getElementById('sfParseInput').value.trim();
    const out = document.getElementById('sfParseOutput');
    if (!raw) {
        out.textContent = '请输入要解析的 ID';
        out.className = 'output-box error';
        return;
    }
    // 自动识别算法：纯数字 → Twitter/Leaf；字母+数字 → 百度 UID
    let algo;
    if (/^[0-9]+$/.test(raw)) {
        // 优先按用户下拉算法解析
        const pick = document.getElementById('sfAlgorithm').value;
        algo = pick === 'leaf' ? 'leaf' : 'twitter';
    } else {
        algo = 'baidu';
    }

    try {
        let p;
        if (algo === 'baidu') {
            p = parseBaiduUid(raw);
            out.textContent =
                `算法=百度 UID\n` +
                `时间戳(毫秒)=${p.timestamp}\n` +
                `UTC=${p.datetime}\n` +
                `本地=${p.localTime}\n` +
                `序列号=${p.sequence}`;
        } else {
            const epoch = algo === 'leaf' ? LEAF_EPOCH : SNOWFLAKE_EPOCH;
            p = parseSnowflake(raw, epoch);
            out.textContent =
                `算法=${algo === 'leaf' ? '美团 Leaf' : 'Twitter Snowflake'}\n` +
                `时间戳(毫秒)=${p.timestamp}\n` +
                `UTC=${p.datetime}\n` +
                `本地=${p.localTime}\n` +
                `DataCenter ID=${p.datacenterId}\n` +
                `Worker ID=${p.workerId}\n` +
                `序列号=${p.sequence}`;
        }
        out.className = 'output-box';
        setStatus('反向解析完成');
    } catch (e) {
        out.textContent = '解析失败：' + e.message;
        out.className = 'output-box error';
    }
}

// === 11. 暴露到 window（按项目约定无 ES Module） ===
window.snowflakeId = snowflakeId;
window.nextSnowflake = nextSnowflake;
window.parseSnowflake = parseSnowflake;
window.baiduUid = baiduUid;
window.sfGenerate = sfGenerate;
window.sfClear = sfClear;
window.sfCopyAll = sfCopyAll;
window.sfExportCSV = sfExportCSV;
window.sfParseInput = sfParseInput;
