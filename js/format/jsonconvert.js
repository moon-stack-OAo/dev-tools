// JSON / XML / YAML 互转

function jsonconvertGetFxps() {
    if (typeof FXP === 'undefined') {
        toast('FXP 库未加载');
        return null;
    }
    return {
        XMLParser: FXP.XMLParser,
        XMLBuilder: FXP.XMLBuilder
    };
}

function jsonconvertGetYaml() {
    if (typeof jsyaml === 'undefined') {
        toast('js-yaml 库未加载');
        return null;
    }
    return jsyaml;
}

// === JSON → XML ===
function jsonToXml(obj, rootName, attrPrefix) {
    const fxp = jsonconvertGetFxps();
    if (!fxp) throw new Error('FXP 库未加载');
    const builder = new fxp.XMLBuilder({
        attributeNamePrefix: attrPrefix || '@_',
        ignoreAttributes: false,
        format: true,
        indentBy: '  ',
        suppressEmptyNode: false
    });
    const wrap = {};
    wrap[rootName || 'root'] = obj;
    return builder.build(wrap);
}

// === XML → JSON ===
function xmlToJson(xmlStr, attrPrefix) {
    const fxp = jsonconvertGetFxps();
    if (!fxp) throw new Error('FXP 库未加载');
    const parser = new fxp.XMLParser({
        attributeNamePrefix: attrPrefix || '@_',
        ignoreAttributes: false,
        parseAttributeValue: false,
        trimValues: true,
        parseTagValue: false
    });
    const parsed = parser.parse(xmlStr);
    // 去掉根节点，保留内部对象
    const keys = Object.keys(parsed);
    if (keys.length === 1) return parsed[keys[0]];
    return parsed;
}

// === JSON ↔ YAML ===
function _objToYaml(obj) {
    const yaml = jsonconvertGetYaml();
    if (!yaml) throw new Error('js-yaml 库未加载');
    return yaml.dump(obj, {indent: 2, lineWidth: -1, noCompatMode: true});
}

function yamlToJsonObj(str) {
    const yaml = jsonconvertGetYaml();
    if (!yaml) throw new Error('js-yaml 库未加载');
    return yaml.load(str);
}

// === 顶层转换 ===
function jsonconvertRun() {
    const from = document.getElementById('jsonconvertFrom').value;
    const to = document.getElementById('jsonconvertTo').value;
    const root = document.getElementById('jsonconvertRoot').value || 'root';
    const attrPrefix = document.getElementById('jsonconvertAttrPrefix').value || '@_';
    const raw = document.getElementById('jsonconvertInput').value;
    const out = document.getElementById('jsonconvertOutput');

    if (!raw.trim()) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    if (from === to) {
        out.textContent = '源格式与目标格式相同，无需转换';
        out.className = 'output-box';
        return;
    }

    let intermediate = null;
    try {
        // 先转成中间对象
        if (from === 'json') {
            intermediate = JSON.parse(raw);
        } else if (from === 'xml') {
            intermediate = xmlToJson(raw, attrPrefix);
        } else if (from === 'yaml') {
            intermediate = yamlToJsonObj(raw);
        }
    } catch (e) {
        out.textContent = '输入解析错误 (' + from.toUpperCase() + '): ' + e.message;
        out.className = 'output-box error';
        return;
    }

    try {
        let result;
        if (to === 'json') {
            result = JSON.stringify(intermediate, null, 2);
        } else if (to === 'xml') {
            result = jsonToXml(intermediate, root, attrPrefix);
        } else if (to === 'yaml') {
            result = _objToYaml(intermediate);
        }
        out.textContent = result;
        out.className = 'output-box';
        setStatus(from.toUpperCase() + ' → ' + to.toUpperCase() + ' 转换成功');
    } catch (e) {
        out.textContent = '输出生成错误 (' + to.toUpperCase() + '): ' + e.message;
        out.className = 'output-box error';
    }
}

function jsonconvertBeautify() {
    const to = document.getElementById('jsonconvertTo').value;
    const out = document.getElementById('jsonconvertOutput');
    const txt = out.textContent;
    if (!txt.trim()) {
        toast('没有输出可美化');
        return;
    }
    try {
        if (to === 'json') {
            const obj = JSON.parse(txt);
            out.textContent = JSON.stringify(obj, null, 2);
        } else if (to === 'yaml') {
            const obj = yamlToJsonObj(txt);
            out.textContent = _objToYaml(obj);
        } else if (to === 'xml') {
            const fxp = jsonconvertGetFxps();
            if (!fxp) return;
            const obj = xmlToJson(txt, document.getElementById('jsonconvertAttrPrefix').value || '@_');
            out.textContent = jsonToXml(obj, document.getElementById('jsonconvertRoot').value || 'root',
                document.getElementById('jsonconvertAttrPrefix').value || '@_');
        }
        setStatus('美化完成');
    } catch (e) {
        toast('美化失败: ' + e.message);
    }
}

function jsonconvertClear() {
    document.getElementById('jsonconvertInput').value = '';
    document.getElementById('jsonconvertOutput').textContent = '';
    setStatus('已清空');
}

function jsonconvertSwap() {
    const fromEl = document.getElementById('jsonconvertFrom');
    const toEl = document.getElementById('jsonconvertTo');
    const tmp = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = tmp;
    setStatus('已交换方向');
}