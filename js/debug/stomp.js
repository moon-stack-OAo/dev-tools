let stompClient = null;
let stompConnected = false;
let stompSubSeq = 0;
let stompSubs = new Map();
let stompBuffer = '';
let stompHbTxTimer = null;
let stompHbRxTimer = null;
let stompLastRx = 0;

const STOMP_NULL = '\x00';
const STOMP_LF = '\n';
const STOMP_HEARTBEAT = '\n';

function stompEncode(command, headers, body) {
    let frame = command + STOMP_LF;
    headers = headers || {};
    Object.keys(headers).forEach((k) => {
        const v = headers[k];
        if (v !== undefined && v !== null && v !== '') {
            frame += k + ':' + v + STOMP_LF;
        }
    });
    frame += STOMP_LF;
    if (body) frame += body;
    frame += STOMP_NULL;
    return frame;
}

function stompParseLine(line, headers) {
    if (!line) return;
    const idx = line.indexOf(':');
    if (idx <= 0) return;
    headers[line.substring(0, idx)] = line.substring(idx + 1);
}

function stompParseFrame(raw) {
    const sep = raw.indexOf(STOMP_LF + STOMP_LF);
    let command, headerBlock, body;
    if (sep === -1) {
        const nl = raw.indexOf(STOMP_LF);
        command = nl === -1 ? raw : raw.substring(0, nl);
        headerBlock = nl === -1 ? '' : raw.substring(nl + 1);
        body = '';
    } else {
        const nl = raw.indexOf(STOMP_LF);
        command = raw.substring(0, nl);
        headerBlock = raw.substring(nl + 1, sep);
        body = raw.substring(sep + 2);
    }
    const headers = {};
    if (headerBlock) {
        headerBlock.split(STOMP_LF).forEach((line) => stompParseLine(line, headers));
    }
    return {command, headers, body};
}

function stompParseExtraHeaders(text) {
    const result = {};
    if (!text) return result;
    text.split(/\r?\n/).forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) {
            result[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
        }
    });
    return result;
}

function stompStartHeartbeat(cx, sy) {
    stompStopHeartbeat();
    stompLastRx = Date.now();
    if (cx > 0 && stompClient && stompClient.readyState === WebSocket.OPEN) {
        stompHbTxTimer = setInterval(() => {
            if (stompClient && stompClient.readyState === WebSocket.OPEN) {
                try {
                    stompClient.send(STOMP_HEARTBEAT);
                } catch (e) {
                }
            }
        }, cx);
    }
    if (sy > 0) {
        const interval = Math.max(1000, Math.floor(sy / 2));
        stompHbRxTimer = setInterval(() => {
            if (!stompClient) return;
            if (Date.now() - stompLastRx > sy * 2) {
                stompLogMsg('system', '心跳超时，关闭连接');
                try {
                    stompClient.close();
                } catch (e) {
                }
            }
        }, interval);
    }
}

function stompStopHeartbeat() {
    if (stompHbTxTimer) {
        clearInterval(stompHbTxTimer);
        stompHbTxTimer = null;
    }
    if (stompHbRxTimer) {
        clearInterval(stompHbRxTimer);
        stompHbRxTimer = null;
    }
}

function stompSetStatus(s) {
    const el = document.getElementById('stompStatus');
    if (!el) return;
    if (s === 'connected') {
        el.className = 'ws-status connected';
        el.innerHTML = '<span class="ws-dot"></span> STOMP 已连接';
    } else if (s === 'ws-open') {
        el.className = 'ws-status connected';
        el.innerHTML = '<span class="ws-dot"></span> WS 已连接 / STOMP 协商中';
    } else if (s === 'connecting') {
        el.className = 'ws-status disconnected';
        el.innerHTML = '<span class="ws-dot"></span> 连接中...';
    } else if (s === 'closed') {
        el.className = 'ws-status disconnected';
        el.innerHTML = '<span class="ws-dot"></span> 已断开';
    } else {
        el.className = 'ws-status disconnected';
        el.innerHTML = '<span class="ws-dot"></span> 未连接';
    }
}

function stompLogFrame(dir, command, headers, body) {
    const log = document.getElementById('stompLog');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'ws-msg ' + (dir === 'out' ? 'out' : 'in');
    const time = new Date().toLocaleTimeString();
    const prefix = dir === 'out' ? '▶' : '◀';
    let html = `<span class="time">${time}</span>${prefix} <b>${escapeHtml(command)}</b>`;
    Object.keys(headers).forEach((k) => {
        html += `<br>&nbsp;&nbsp;<span class="stomp-h-key">${escapeHtml(k)}</span>: <span class="stomp-h-val">${escapeHtml(headers[k])}</span>`;
    });
    if (body) {
        html += `<br>&nbsp;&nbsp;<span class="stomp-body">${escapeHtml(body)}</span>`;
    }
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function stompLogMsg(type, content) {
    const log = document.getElementById('stompLog');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'ws-msg system';
    const time = new Date().toLocaleTimeString();
    div.innerHTML = `<span class="time">${time}</span>● ${escapeHtml(content)}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function stompRenderSubs() {
    const list = document.getElementById('stompSubList');
    if (!list) return;
    if (stompSubs.size === 0) {
        list.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:6px 0">暂无订阅</div>';
        return;
    }
    list.innerHTML = '';
    stompSubs.forEach((dest, id) => {
        const div = document.createElement('div');
        div.className = 'stomp-sub-item';
        div.innerHTML = `<span class="stomp-sub-id">${escapeHtml(id)}</span><span class="stomp-sub-dest">${escapeHtml(dest)}</span><button class="outline sm" onclick="stompUnsubscribe('${id}')">取消</button>`;
        list.appendChild(div);
    });
}

function stompHandleIncoming(data) {
    stompBuffer += data;
    let idx;
    while ((idx = stompBuffer.indexOf(STOMP_NULL)) !== -1) {
        const raw = stompBuffer.substring(0, idx);
        stompBuffer = stompBuffer.substring(idx + 1);
        if (!raw) continue;
        const frame = stompParseFrame(raw);
        stompLogFrame('in', frame.command, frame.headers, frame.body);
        stompDispatch(frame);
    }
}

function stompDispatch(frame) {
    switch (frame.command) {
        case 'CONNECTED': {
            stompConnected = true;
            stompSetStatus('connected');
            const hb = (frame.headers['heart-beat'] || '0,0').split(',');
            const sy = parseInt(hb[1], 10) || 0;
            const txInput = document.getElementById('stompTx').value || '0,0';
            const txParts = txInput.split(',');
            const tx = parseInt(txParts[0], 10) || 0;
            stompStartHeartbeat(tx, sy);
            stompLogMsg(
                'system',
                'STOMP 已握手 (version=' +
                (frame.headers['version'] || '?') +
                ', session=' +
                (frame.headers['session'] || '-') +
                ')'
            );
            break;
        }
        case 'MESSAGE': {
            const sub = frame.headers['subscription'] || '-';
            const dest = frame.headers['destination'] || '';
            const ct = frame.headers['content-type'] || '';
            let body = frame.body || '';
            let pretty = body;
            if (ct.indexOf('json') >= 0) {
                try {
                    pretty = JSON.stringify(JSON.parse(body), null, 2);
                } catch (e) {
                }
            }
            stompLogMsg('msg', '订阅 ' + sub + ' · ' + dest + (ct ? ' [' + ct + ']' : '') + '\n' + pretty);
            break;
        }
        case 'ERROR': {
            const msg = frame.headers.message || frame.body || 'Unknown error';
            stompLogMsg('error', 'ERROR: ' + msg);
            try {
                stompClient && stompClient.close();
            } catch (e) {
            }
            break;
        }
        case 'RECEIPT': {
            stompLogMsg('system', 'RECEIPT ' + (frame.headers['receipt-id'] || ''));
            break;
        }
        default:
            break;
    }
}

function stompConnect() {
    const url = document.getElementById('stompUrl').value.trim();
    if (!url) {
        toast('请输入 WebSocket URL');
        return;
    }
    if (stompClient) stompDisconnect();
    stompBuffer = '';
    stompSubs.clear();
    stompRenderSubs();
    stompSetStatus('connecting');
    try {
        stompClient = new WebSocket(url);
    } catch (e) {
        toast('连接失败: ' + e.message);
        stompSetStatus('idle');
        return;
    }
    stompClient.onopen = () => {
        stompSetStatus('ws-open');
        stompLogMsg('system', 'WebSocket 已建立，发送 STOMP CONNECT');
        const headers = {
            'accept-version': '1.2',
            host: document.getElementById('stompHost').value.trim() || 'localhost',
            'heart-beat': document.getElementById('stompTx').value.trim() || '0,0',
        };
        const extra = stompParseExtraHeaders(document.getElementById('stompConnHeaders').value);
        Object.assign(headers, extra);
        const frame = stompEncode('CONNECT', headers);
        stompLogFrame('out', 'CONNECT', headers, '');
        try {
            stompClient.send(frame);
        } catch (e) {
            toast('发送失败: ' + e.message);
        }
    };
    stompClient.onmessage = (e) => {
        stompLastRx = Date.now();
        stompHandleIncoming(typeof e.data === 'string' ? e.data : '');
    };
    stompClient.onclose = (e) => {
        stompStopHeartbeat();
        stompSetStatus('closed');
        if (e && e.code !== 1000) {
            stompLogMsg('system', '连接已断开 (code:' + e.code + ')');
        } else {
            stompLogMsg('system', '连接已断开');
        }
        stompClient = null;
        stompConnected = false;
    };
    stompClient.onerror = () => {
        stompLogMsg('system', '连接错误');
    };
}

function stompDisconnect() {
    stompStopHeartbeat();
    if (stompClient) {
        if (stompConnected) {
            try {
                const frame = stompEncode('DISCONNECT', {receipt: 'bye'});
                stompLogFrame('out', 'DISCONNECT', {receipt: 'bye'}, '');
                stompClient.send(frame);
            } catch (e) {
            }
        }
        try {
            stompClient.close();
        } catch (e) {
        }
        stompClient = null;
    }
    stompConnected = false;
    stompSetStatus('closed');
    stompSubs.clear();
    stompRenderSubs();
}

function stompSubscribe() {
    if (!stompConnected || !stompClient) {
        toast('STOMP 未连接');
        return;
    }
    const dest = document.getElementById('stompSubDest').value.trim();
    if (!dest) {
        toast('请输入 destination');
        return;
    }
    const id = 'sub-' + ++stompSubSeq;
    const ackMode = document.getElementById('stompSubAck').value;
    const headers = {id, destination: dest};
    if (ackMode && ackMode !== 'auto') headers.ack = ackMode;
    const frame = stompEncode('SUBSCRIBE', headers);
    stompClient.send(frame);
    stompLogFrame('out', 'SUBSCRIBE', headers, '');
    stompSubs.set(id, dest);
    stompRenderSubs();
}

function stompUnsubscribe(id) {
    if (!stompConnected || !stompClient) return;
    const frame = stompEncode('UNSUBSCRIBE', {id});
    stompClient.send(frame);
    stompLogFrame('out', 'UNSUBSCRIBE', {id}, '');
    stompSubs.delete(id);
    stompRenderSubs();
}

function stompSend() {
    if (!stompConnected || !stompClient) {
        toast('STOMP 未连接');
        return;
    }
    const dest = document.getElementById('stompSendDest').value.trim();
    if (!dest) {
        toast('请输入 destination');
        return;
    }
    const body = document.getElementById('stompSendBody').value;
    const headers = {destination: dest};
    const ct = document.getElementById('stompSendCt').value;
    if (ct) headers['content-type'] = ct;
    const extra = stompParseExtraHeaders(document.getElementById('stompSendHeaders').value);
    Object.assign(headers, extra);
    const frame = stompEncode('SEND', headers, body);
    stompClient.send(frame);
    stompLogFrame('out', 'SEND', headers, body);
}

function stompAckOrNack(action) {
    if (!stompConnected || !stompClient) {
        toast('STOMP 未连接');
        return;
    }
    const id = document.getElementById('stompAckId').value.trim();
    const msgId = document.getElementById('stompAckMsgId').value.trim();
    if (!id || !msgId) {
        toast('请填写 sub-id 和 message-id');
        return;
    }
    const headers = {id, 'message-id': msgId};
    if (action === 'nack') headers['nack'] = '';
    const frame = stompEncode(action === 'nack' ? 'NACK' : 'ACK', headers);
    stompClient.send(frame);
    stompLogFrame('out', action === 'nack' ? 'NACK' : 'ACK', headers, '');
}

function stompClear() {
    const log = document.getElementById('stompLog');
    if (log) log.innerHTML = '';
}
