function xmlFormat() {
    const raw = document.getElementById('xmlInput').value;
    const out = document.getElementById('xmlOutput');
    if (!raw.trim()) {
        out.textContent = '请输入 XML';
        out.className = 'output-box error';
        return;
    }
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(raw, 'text/xml');
        const errors = doc.getElementsByTagName('parsererror');
        if (errors.length) {
            throw new Error(errors[0].textContent);
        }
        const serializer = new XMLSerializer();
        const xml = serializer.serializeToString(doc);
        out.textContent = formatXmlStr(xml);
        out.className = 'output-box';
        setStatus('XML 格式化成功');
    } catch (e) {
        out.textContent = 'XML 错误: ' + e.message;
        out.className = 'output-box error';
    }
}

function formatXmlStr(xml) {
    let indent = 0;
    const lines = xml.replace(/>\s*</g, '>\n<').replace(/(\r\n|\r)/g, '\n').split('\n');
    const result = [];
    const reIndent = /^<\/\w/;
    const reDec = /^<\?/;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (reIndent.test(line) || line.startsWith('</')) indent--;
        if (i > 0 && !reDec.test(line)) result.push('  '.repeat(Math.max(0, indent)) + line);
        else result.push(line);
        if (!reIndent.test(line) && !line.startsWith('</') && !line.endsWith('/>') && !line.startsWith('<?') && !line.startsWith('<!')) indent++;
    }
    return result.join('\n');
}

function xmlCompress() {
    const raw = document.getElementById('xmlInput').value;
    const out = document.getElementById('xmlOutput');
    if (!raw.trim()) {
        out.textContent = '请输入 XML';
        out.className = 'output-box error';
        return;
    }
    out.textContent = raw.replace(/>\s+</g, '><').trim();
    out.className = 'output-box';
    setStatus('XML 压缩成功');
}

function xmlValidate() {
    const raw = document.getElementById('xmlInput').value;
    const out = document.getElementById('xmlOutput');
    if (!raw.trim()) {
        out.textContent = '请输入 XML';
        out.className = 'output-box error';
        return;
    }
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(raw, 'text/xml');
        const errors = doc.getElementsByTagName('parsererror');
        if (errors.length) {
            throw new Error(errors[0].textContent);
        }
        out.textContent = '✓ 有效的 XML';
        out.className = 'output-box';
        setStatus('XML 有效');
    } catch (e) {
        out.textContent = '✗ 无效的 XML: ' + e.message;
        out.className = 'output-box error';
    }
}
