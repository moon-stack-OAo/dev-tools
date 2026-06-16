function ipCalcLookup() {
    const input = document.getElementById('ipInput').value.trim();
    const out = document.getElementById('ipOutput');
    if (!input) {
        out.textContent = '请输入 IP 地址';
        return;
    }
    const parts = input.split('.');
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        out.textContent = '无效 IP 地址';
        return;
    }
    const first = parseInt(parts[0]);
    let cls = 'A';
    if (first >= 1 && first <= 126) cls = 'A';
    else if (first >= 128 && first <= 191) cls = 'B';
    else if (first >= 192 && first <= 223) cls = 'C';
    else if (first >= 224 && first <= 239) cls = 'D (多播)';
    else if (first >= 240 && first <= 255) cls = 'E (保留)';
    const isPrivate = (first === 10) || (first === 172 && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31) || (first === 192 && parts[1] === '168');
    const isLoopback = first === 127;
    const result = '类别: ' + cls + '\n' + (isPrivate ? '类型: 私有地址\n' : '') + (isLoopback ? '类型: 回环地址\n' : '') + '十六进制: ' + parts.map(p => (+p).toString(16).toUpperCase().padStart(2, '0')).join('') + '\n' + '二进制: ' + parts.map(p => (+p).toString(2).padStart(8, '0')).join('.');
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
    const parts = ip.split('.');
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        out.textContent = '无效 IP 地址';
        return;
    }
    const ipNum = parts.reduce((acc, p) => (acc << 8) + parseInt(p), 0) >>> 0;
    const maskNum = ~(0xFFFFFFFF >>> mask) >>> 0;
    const netNum = (ipNum & maskNum) >>> 0;
    const broadNum = (netNum | ~maskNum) >>> 0;
    const firstUsable = mask < 31 ? netNum + 1 : netNum;
    const lastUsable = mask < 31 ? broadNum - 1 : broadNum;

    function toIp(n) {
        return [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join('.');
    }

    const total = Math.pow(2, 32 - mask);
    const usable = Math.max(0, total - 2);
    const result = '网络地址: ' + toIp(netNum) + '\n' + '广播地址: ' + toIp(broadNum) + '\n' + '可用 IP 范围: ' + toIp(firstUsable) + ' - ' + toIp(lastUsable) + '\n' + '子网掩码: ' + toIp(maskNum) + '\n' + 'CIDR: /' + mask + '\n' + '主机数: ' + usable + ' (共 ' + total + ' 个地址)';
    out.textContent = result;
}

function ipCalcAuto() {
    const input = document.getElementById('ipInput').value.trim();
    document.getElementById('ipSubnetIp').value = input;
    ipCalcSubnet();
}
