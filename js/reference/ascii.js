const ASCII_DATA = [];
for (let i = 0; i < 128; i++) {
    const ch = i <= 0x20 || i === 0x7f ? '' : String.fromCharCode(i);
    const names = {
        0: 'NUL (空)', 1: 'SOH (标题开始)', 2: 'STX (正文开始)', 3: 'ETX (正文结束)',
        4: 'EOT (传输结束)', 5: 'ENQ (询问)', 6: 'ACK (确认)', 7: 'BEL (响铃)',
        8: 'BS (退格)', 9: 'TAB (制表符)', 10: 'LF (换行)', 11: 'VT (垂直制表)',
        12: 'FF (换页)', 13: 'CR (回车)', 14: 'SO (移出)', 15: 'SI (移入)',
        16: 'DLE (数据链路转义)', 17: 'DC1 (设备控制1)', 18: 'DC2 (设备控制2)', 19: 'DC3 (设备控制3)',
        20: 'DC4 (设备控制4)', 21: 'NAK (拒绝)', 22: 'SYN (同步空闲)', 23: 'ETB (块传输结束)',
        24: 'CAN (取消)', 25: 'EM (介质结束)', 26: 'SUB (替换)', 27: 'ESC (转义)',
        28: 'FS (文件分隔)', 29: 'GS (组分隔)', 30: 'RS (记录分隔)', 31: 'US (单元分隔)',
        32: 'SP (空格)', 127: 'DEL (删除)',
    };
    const hex = i.toString(16).toUpperCase().padStart(2, '0');
    const oct = i.toString(8).padStart(3, '0');
    const name = names[i] || '';
    ASCII_DATA.push({ dec: i, hex, oct, char: ch || (i === 32 ? ' ' : ''), name: name || (i < 32 ? '控制字符' : i === 127 ? '删除' : '') });
}

function asciiRender() {
    const container = document.getElementById('asciiContent');
    container.innerHTML = '';
    const tbl = document.createElement('div');
    tbl.style.cssText = 'font-family:var(--font);font-size:12px;overflow:auto';
    let html = '<div style="display:flex;background:var(--bg-input);font-weight:600;border-radius:4px;padding:4px 0;position:sticky;top:0">';
    html += '<span style="width:50px;padding:4px 8px">DEC</span>';
    html += '<span style="width:40px;padding:4px 8px">HEX</span>';
    html += '<span style="width:50px;padding:4px 8px">OCT</span>';
    html += '<span style="width:80px;padding:4px 8px">字符</span>';
    html += '<span style="flex:1;padding:4px 8px">说明</span>';
    html += '</div>';
    ASCII_DATA.forEach(item => {
        const isCtrl = item.dec < 32 || item.dec === 127;
        html += '<div style="display:flex;padding:3px 0;' + (item.dec % 2 === 0 ? '' : '') + '">';
        html += '<span style="width:50px;padding:2px 8px">' + item.dec + '</span>';
        html += '<span style="width:40px;padding:2px 8px;color:var(--accent2)">' + item.hex + '</span>';
        html += '<span style="width:50px;padding:2px 8px;color:var(--text-muted)">' + item.oct + '</span>';
        html += '<span style="width:80px;padding:2px 8px;' + (isCtrl ? 'color:var(--text-muted)' : '') + '">' + (item.char || '•') + '</span>';
        html += '<span style="flex:1;padding:2px 8px;color:var(--text-dim)">' + item.name + '</span>';
        html += '</div>';
    });
    html += '</div>';
    tbl.innerHTML = html;
    container.appendChild(tbl);
}
