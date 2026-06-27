function jsonToPojo() {
    const input = document.getElementById('j2pInput').value;
    const className = document.getElementById('j2pClass').value.trim() || 'GeneratedClass';
    const lombok = document.getElementById('j2pLombok').checked;
    const out = document.getElementById('j2pOutput');
    if (!input) {
        out.textContent = '请输入 JSON';
        return;
    }
    let obj;
    try {
        obj = JSON.parse(input);
    } catch (e) {
        out.textContent = 'JSON 解析失败: ' + e.message;
        return;
    }
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        out.textContent = '请输入 JSON 对象 (非数组)';
        return;
    }
    const imports = new Set();
    const fields = [];
    for (const [key, val] of Object.entries(obj)) {
        fields.push({name: key, type: inferType(key, val, imports)});
    }
    let code = '';
    if (lombok) code += 'import lombok.Data;\n';
    const sorted = [...imports].sort();
    sorted.forEach((i) => (code += 'import ' + i + ';\n'));
    if (sorted.length || lombok) code += '\n';
    if (lombok) code += '@Data\n';
    code += 'public class ' + className + ' {\n\n';
    fields.forEach((f) => {
        code += '    private ' + f.type + ' ' + f.name + ';\n';
    });
    code += '\n}';
    out.textContent = code;
}

function inferType(key, val, imports) {
    if (val === null) return 'String';
    if (typeof val === 'string') return 'String';
    if (typeof val === 'number') return Number.isInteger(val) ? 'Integer' : 'Double';
    if (typeof val === 'boolean') return 'Boolean';
    if (Array.isArray(val)) {
        imports.add('java.util.List');
        if (val.length > 0) {
            const itemType = inferType(key + 'Item', val[0], imports);
            return 'List<' + itemType + '>';
        }
        return 'List<?>';
    }
    if (typeof val === 'object') {
        imports.add('java.util.Map');
        return 'Map<String, Object>';
    }
    return 'String';
}
