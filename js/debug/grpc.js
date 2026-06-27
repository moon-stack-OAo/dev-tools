const GRPC_STATUS_CODES = [
    {code: 0, name: 'OK', desc: '成功'},
    {code: 1, name: 'CANCELLED', desc: '操作被取消，通常是调用方主动取消'},
    {code: 2, name: 'UNKNOWN', desc: '未知错误，调用方不应直接返回此状态'},
    {code: 3, name: 'INVALID_ARGUMENT', desc: '客户端传入无效参数'},
    {code: 4, name: 'DEADLINE_EXCEEDED', desc: '操作在截止时间前未完成'},
    {code: 5, name: 'NOT_FOUND', desc: '请求的资源不存在'},
    {code: 6, name: 'ALREADY_EXISTS', desc: '要创建的资源已存在'},
    {code: 7, name: 'PERMISSION_DENIED', desc: '调用方无权限执行该操作'},
    {code: 8, name: 'RESOURCE_EXHAUSTED', desc: '资源耗尽（配额、磁盘空间等）'},
    {code: 9, name: 'FAILED_PRECONDITION', desc: '系统未处于执行该操作所需的状态'},
    {code: 10, name: 'ABORTED', desc: '操作被中止，通常是并发冲突'},
    {code: 11, name: 'OUT_OF_RANGE', desc: '操作尝试访问超出有效范围的内容'},
    {code: 12, name: 'UNIMPLEMENTED', desc: '该方法未实现或服务端不支持'},
    {code: 13, name: 'INTERNAL', desc: '服务端内部错误，不可恢复'},
    {code: 14, name: 'UNAVAILABLE', desc: '服务当前不可用（网络/维护等）'},
    {code: 15, name: 'DATA_LOSS', desc: '数据丢失或损坏（不可恢复）'},
    {code: 16, name: 'UNAUTHENTICATED', desc: '未提供有效身份认证信息'},
];

function grpcSwitchTab(tab, name) {
    document.querySelectorAll('#panel-grpc .tab-bar .tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('#panel-grpc .tab-content').forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('grpc-tab-' + name).classList.add('active');
}

function grpcAddMeta(key, val) {
    const container = document.getElementById('grpcMetaList');
    const row = document.createElement('div');
    row.className = 'api-kv-row';
    const k = (key || '').replace(/"/g, '&quot;');
    const v = (val || '').replace(/"/g, '&quot;');
    row.innerHTML = `<input type="text" placeholder="Metadata Key (如 authorization)" value="${k}"><input type="text" placeholder="Value" value="${v}"><button class="outline sm" onclick="this.parentElement.remove()" title="删除">&#10005;</button>`;
    container.appendChild(row);
}

function grpcCollectMeta() {
    const result = [];
    document.querySelectorAll('#grpcMetaList .api-kv-row').forEach((row) => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const val = inputs[1].value;
        if (key) result.push([key, val]);
    });
    return result;
}

function grpcShellQuote(s) {
    if (s === undefined || s === null) return "''";
    const str = String(s);
    if (str === '') return "''";
    if (!/[^A-Za-z0-9_\-./:=?&%@,+]/.test(str)) return str;
    return "'" + str.replace(/'/g, "'\\''") + "'";
}

function grpcBase64Encode(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return '';
    }
}

function grpcBuildMeta() {
    const out = document.getElementById('grpcMetaOutput');
    const endpoint = document.getElementById('grpcEndpoint').value.trim();
    const contentType = document.getElementById('grpcCt').value;
    const meta = grpcCollectMeta();

    if (!endpoint) {
        out.textContent = '请输入目标服务地址';
        out.className = 'output-box error';
        toast('请输入目标服务地址');
        return;
    }

    const lines = [];
    lines.push(`# gRPC ${meta.length ? 'call' : '健康检查'} 命令`);
    lines.push(`curl -X POST ${grpcShellQuote(endpoint)} \\`);
    lines.push(`  -H ${grpcShellQuote('Content-Type: ' + contentType)} \\`);
    lines.push(`  -H ${grpcShellQuote('TE: trailers')} \\`);
    if (meta.length) {
        lines.push(`  -H ${grpcShellQuote('Accept: */*')} \\`);
        meta.forEach(([k, v]) => {
            const lower = k.toLowerCase();
            if (lower === 'grpc-metadata-bin' || lower.endsWith('-bin')) {
                lines.push(`  -H ${grpcShellQuote(k + ': ' + v)} \\`);
            } else {
                const encoded = grpcBase64Encode(v);
                lines.push(`  -H ${grpcShellQuote(k + ': ' + v)} \\`);
                if (encoded && !/^[A-Za-z0-9+/=]*$/.test(v)) {
                    lines.push(`  -H ${grpcShellQuote(lower + '-bin: ' + encoded)} \\`);
                }
            }
        });
    }
    lines.push(`  --data-binary ''`);

    out.textContent = lines.join('\n').replace(/ \\\n$/, '');
    out.className = 'output-box';
    setStatus('已生成 gRPC 调用命令');
}

function grpcParsePb() {
    const input = document.getElementById('grpcPbInput').value.trim();
    const out = document.getElementById('grpcPbOutput');
    if (!input) {
        out.textContent = '请输入 Base64 字符串';
        out.className = 'output-box error';
        return;
    }
    let bytes;
    try {
        const clean = input.replace(/\s+/g, '');
        const bin = atob(clean);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch (e) {
        out.textContent = 'Base64 解码失败: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    out.textContent = grpcDecodeProtobuf(bytes);
    out.className = 'output-box';
    setStatus('Protobuf 解析完成 (' + bytes.length + ' 字节)');
}

function grpcParsePbHex() {
    const input = document.getElementById('grpcPbInput').value.trim();
    const out = document.getElementById('grpcPbOutput');
    if (!input) {
        out.textContent = '请输入 Hex 字符串';
        out.className = 'output-box error';
        return;
    }
    const clean = input.replace(/\s+/g, '');
    if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
        out.textContent = 'Hex 字符串格式无效 (需偶数长度)';
        out.className = 'output-box error';
        return;
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    out.textContent = grpcDecodeProtobuf(bytes);
    out.className = 'output-box';
    setStatus('Protobuf (Hex) 解析完成 (' + bytes.length + ' 字节)');
}

function grpcReadVarint(bytes, pos) {
    let value = 0;
    let shift = 0;
    let count = 0;
    while (pos < bytes.length && count < 10) {
        const b = bytes[pos++];
        value |= (b & 0x7f) << shift;
        count++;
        if ((b & 0x80) === 0) return [value, pos];
        shift += 7;
    }
    return [value, pos];
}

function grpcBytesToAscii(bytes) {
    let s = '';
    let printable = true;
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b < 32 && b !== 9 && b !== 10 && b !== 13) printable = false;
        if (b >= 32 && b < 127) s += String.fromCharCode(b);
        else if (b === 9) s += '\\t';
        else if (b === 10) s += '\\n';
        else if (b === 13) s += '\\r';
        else s += '\\x' + b.toString(16).padStart(2, '0');
    }
    return {text: s, printable};
}

function grpcTryUtf8(bytes) {
    try {
        const dec = new TextDecoder('utf-8', {fatal: true});
        return dec.decode(bytes);
    } catch (e) {
        return null;
    }
}

const WIRE_TYPES = {
    0: 'Varint',
    1: 'Fixed64',
    2: 'Length-delimited',
    3: 'StartGroup (deprecated)',
    4: 'EndGroup (deprecated)',
    5: 'Fixed32',
};

function grpcDecodeProtobuf(bytes) {
    const lines = [];
    lines.push('总字节数: ' + bytes.length);
    lines.push(
        'Hex 预览: ' +
        Array.from(bytes.slice(0, 64))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ') +
        (bytes.length > 64 ? ' ...' : '')
    );
    lines.push('---');
    let pos = 0;
    let idx = 0;
    while (pos < bytes.length) {
        const startPos = pos;
        const [tag, newPos] = grpcReadVarint(bytes, pos);
        if (newPos === pos) break;
        pos = newPos;
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x07;

        if (wireType === 0) {
            const [val, np] = grpcReadVarint(bytes, pos);
            pos = np;
            lines.push(
                `#${++idx} field=${fieldNumber} type=varint  value=${val} (0x${val.toString(16)})  bytes=${startPos}-${pos}`
            );
        } else if (wireType === 1) {
            if (pos + 8 > bytes.length) {
                lines.push(`#${++idx} field=${fieldNumber} type=fixed64  [截断]`);
                break;
            }
            let v = 0n;
            for (let i = 0; i < 8; i++) v |= BigInt(bytes[pos + i]) << BigInt(i * 8);
            const dv = bytes[pos] & 0x80 ? v.toString() : Number(v).toString();
            pos += 8;
            lines.push(`#${++idx} field=${fieldNumber} type=fixed64 value=${dv}  bytes=${startPos}-${pos}`);
        } else if (wireType === 2) {
            const [len, np] = grpcReadVarint(bytes, pos);
            pos = np;
            if (pos + len > bytes.length) {
                lines.push(
                    `#${++idx} field=${fieldNumber} type=length-delimited  [截断: 需要 ${len} 字节, 剩余 ${bytes.length - pos}]`
                );
                break;
            }
            const slice = bytes.slice(pos, pos + len);
            const utf8 = grpcTryUtf8(slice);
            const ascii = grpcBytesToAscii(slice);
            const hex =
                Array.from(slice.slice(0, 32))
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join(' ') + (slice.length > 32 ? ' ...' : '');
            const maybeNested = len > 0 && ascii.printable === false && utf8 === null;
            lines.push(
                `#${++idx} field=${fieldNumber} type=length-delimited length=${len}  bytes=${startPos}-${pos + len}`
            );
            if (utf8 !== null) {
                lines.push(
                    '    UTF-8 : "' + utf8.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"'
                );
            }
            lines.push('    ASCII: "' + ascii.text + '"');
            lines.push('    HEX  : ' + hex);
            if (maybeNested) {
                lines.push('    [提示] 看起来像嵌套 message，可尝试递归解析');
            }
            pos += len;
        } else if (wireType === 5) {
            if (pos + 4 > bytes.length) {
                lines.push(`#${++idx} field=${fieldNumber} type=fixed32  [截断]`);
                break;
            }
            const v = (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0;
            pos += 4;
            lines.push(
                `#${++idx} field=${fieldNumber} type=fixed32 value=${v} (0x${v.toString(16)})  bytes=${startPos}-${pos}`
            );
        } else {
            lines.push(
                `#${++idx} field=${fieldNumber} wire_type=${wireType} (${WIRE_TYPES[wireType] || 'unknown'}) 无法解析，停止`
            );
            break;
        }
    }
    if (pos < bytes.length) {
        lines.push(`--- (剩余 ${bytes.length - pos} 字节未解析)`);
    }
    return lines.join('\n');
}

function grpcRenderStatusTable() {
    const tbody = document.getElementById('grpcStatusTbody');
    if (!tbody) return;
    tbody.innerHTML = GRPC_STATUS_CODES.map(
        (c) => `<tr><td>${c.code}</td><td>${c.name}</td><td>${c.desc}</td></tr>`
    ).join('');
}

function grpcInit() {
    if (document.getElementById('grpcMetaList') && !document.querySelector('#grpcMetaList .api-kv-row')) {
        grpcAddMeta('authorization', 'Bearer xxx');
        grpcAddMeta('x-request-id', '');
    }
    grpcRenderStatusTable();
}

registerInit('grpc', grpcInit);
