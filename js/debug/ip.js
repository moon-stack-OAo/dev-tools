// 将 32 位无符号整数转为 IPv4 字符串
function numToIp(n) {
    n = n >>> 0;
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

// 解析 IPv4，成功返回四段数字数组，失败返回 null
function parseIpv4(ip) {
    if (ip == null) return null;
    const parts = String(ip).trim().split('.');
    if (parts.length !== 4) return null;
    const nums = [];
    for (let i = 0; i < 4; i++) {
        if (!/^\d+$/.test(parts[i])) return null;
        const n = parseInt(parts[i], 10);
        if (isNaN(n) || n < 0 || n > 255) return null;
        // 禁止前导零以外的非法形式时仍接受 "010" 等纯数字
        nums.push(n);
    }
    return nums;
}

function ipIsPrivate(ip) {
    const parts = parseIpv4(ip);
    if (!parts) return false;
    const first = parts[0];
    const second = parts[1];
    return (
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
    );
}

function ipIsLoopback(ip) {
    const parts = parseIpv4(ip);
    if (!parts) return false;
    return parts[0] === 127;
}

function ipClassify(ip) {
    const parts = parseIpv4(ip);
    if (!parts) {
        return { ok: false, msg: '无效 IP 地址' };
    }
    const first = parts[0];
    let cls = 'A';
    if (first >= 1 && first <= 126) cls = 'A';
    else if (first >= 128 && first <= 191) cls = 'B';
    else if (first >= 192 && first <= 223) cls = 'C';
    else if (first >= 224 && first <= 239) cls = 'D (多播)';
    else if (first >= 240 && first <= 255) cls = 'E (保留)';
    else if (first === 0) cls = 'A';
    const hex = parts.map((p) => p.toString(16).toUpperCase().padStart(2, '0')).join('');
    const bin = parts.map((p) => p.toString(2).padStart(8, '0')).join('.');
    return {
        ok: true,
        class: cls,
        isPrivate: ipIsPrivate(ip),
        isLoopback: ipIsLoopback(ip),
        hex: hex,
        bin: bin,
    };
}

function ipSubnetCalc(ip, mask) {
    const parts = parseIpv4(ip);
    if (!parts) {
        return { ok: false, msg: '无效 IP 地址' };
    }
    const m = typeof mask === 'number' ? mask : parseInt(mask, 10);
    if (isNaN(m) || m < 0 || m > 32) {
        return { ok: false, msg: '请输入有效掩码 (0-32)' };
    }
    const ipNum = parts.reduce((acc, p) => (acc << 8) + p, 0) >>> 0;
    // JS 位移量按 5 位取模：>>> 32 / << 32 等价 0，mask=0/32 需特判
    const maskNum = m === 0 ? 0 : m === 32 ? 0xffffffff : (~(0xffffffff >>> m) >>> 0);
    const netNum = (ipNum & maskNum) >>> 0;
    const broadNum = (netNum | ~maskNum) >>> 0;
    const firstUsable = m < 31 ? netNum + 1 : netNum;
    const lastUsable = m < 31 ? broadNum - 1 : broadNum;
    const total = Math.pow(2, 32 - m);
    const usable = m >= 31 ? 0 : Math.max(0, total - 2);
    return {
        ok: true,
        network: numToIp(netNum),
        broadcast: numToIp(broadNum),
        firstUsable: numToIp(firstUsable >>> 0),
        lastUsable: numToIp(lastUsable >>> 0),
        mask: numToIp(maskNum),
        cidr: '/' + m,
        total: total,
        usable: usable,
    };
}

function ipCalcLookup() {
    const input = document.getElementById('ipInput').value.trim();
    const out = document.getElementById('ipOutput');
    if (!input) {
        out.textContent = '请输入 IP 地址';
        return;
    }
    const r = ipClassify(input);
    if (!r.ok) {
        out.textContent = r.msg || '无效 IP 地址';
        return;
    }
    let result = '类别: ' + r.class + '\n';
    if (r.isPrivate) result += '类型: 私有地址\n';
    if (r.isLoopback) result += '类型: 回环地址\n';
    result += '十六进制: ' + r.hex + '\n二进制: ' + r.bin;
    out.textContent = result;
}

function ipCalcSubnet() {
    const ip = document.getElementById('ipSubnetIp').value.trim();
    const mask = parseInt(document.getElementById('ipSubnetMask').value);
    const out = document.getElementById('ipSubnetOutput');
    if (!ip || isNaN(mask) || mask < 0 || mask > 32) {
        out.textContent = '请输入有效 IP 和掩码 (0-32)';
        return;
    }
    const r = ipSubnetCalc(ip, mask);
    if (!r.ok) {
        out.textContent = r.msg || '无效 IP 地址';
        return;
    }
    out.textContent =
        '网络地址: ' +
        r.network +
        '\n' +
        '广播地址: ' +
        r.broadcast +
        '\n' +
        '可用 IP 范围: ' +
        r.firstUsable +
        ' - ' +
        r.lastUsable +
        '\n' +
        '子网掩码: ' +
        r.mask +
        '\n' +
        'CIDR: ' +
        r.cidr +
        '\n' +
        '主机数: ' +
        r.usable +
        ' (共 ' +
        r.total +
        ' 个地址)';
}

function ipCalcAuto() {
    const input = document.getElementById('ipInput').value.trim();
    document.getElementById('ipSubnetIp').value = input;
    ipCalcSubnet();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ipClassify,
        ipSubnetCalc,
        ipIsPrivate,
        ipIsLoopback,
        numToIp,
    };
}
