let ws = null;

function wsConnect() {
    const url = document.getElementById('wsUrl').value.trim();
    if (!url) {
        toast('请输入 WebSocket URL');
        return;
    }
    if (ws) wsDisconnect();
    try {
        ws = new WebSocket(url);
    } catch (e) {
        toast('连接失败: ' + e.message);
        return;
    }
    const status = document.getElementById('wsStatus');
    ws.onopen = () => {
        status.className = 'ws-status connected';
        status.innerHTML = '<span class="ws-dot"></span> 已连接';
        wsLogMsg('system', '已连接到 ' + url);
        setStatus('WebSocket 已连接');
    };
    ws.onmessage = (e) => {
        wsLogMsg('in', e.data);
    };
    ws.onclose = (e) => {
        status.className = 'ws-status disconnected';
        status.innerHTML = '<span class="ws-dot"></span> 已断开 (code:' + e.code + ')';
        wsLogMsg('system', '连接已断开 (code:' + e.code + ')');
        setStatus('WebSocket 已断开');
        ws = null;
    };
    ws.onerror = () => {
        wsLogMsg('system', '连接错误');
        setStatus('WebSocket 错误');
    };
}

function wsDisconnect() {
    if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
    }
    document.getElementById('wsStatus').className = 'ws-status disconnected';
    document.getElementById('wsStatus').innerHTML = '<span class="ws-dot"></span> 未连接';
    setStatus('WebSocket 已断开');
}

function wsSend() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        toast('未连接');
        return;
    }
    const msg = document.getElementById('wsMsg').value;
    if (!msg) return;
    ws.send(msg);
    wsLogMsg('out', msg);
    document.getElementById('wsMsg').value = '';
}

function wsLogMsg(type, content) {
    const log = document.getElementById('wsLog');
    const div = document.createElement('div');
    div.className = 'ws-msg ' + type;
    const time = new Date().toLocaleTimeString();
    const prefix = type === 'in' ? '◀' : type === 'out' ? '▶' : '●';
    div.innerHTML = `<span class="time">${time}</span>${prefix} ${escapeHtml(content)}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function wsClear() {
    document.getElementById('wsLog').innerHTML = '';
}
