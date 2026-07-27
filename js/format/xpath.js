// XPath 查询（浏览器 DOMParser + document.evaluate；Node 测试用 xmldom 可选回退）

const XPATH_SAMPLE_XML =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<bookstore>\n' +
    '  <book category="cooking">\n' +
    '    <title lang="en">Everyday Italian</title>\n' +
    '    <author>Giada De Laurentiis</author>\n' +
    '    <year>2005</year>\n' +
    '    <price>30.00</price>\n' +
    '  </book>\n' +
    '  <book category="children">\n' +
    '    <title lang="en">Harry Potter</title>\n' +
    '    <author>J K. Rowling</author>\n' +
    '    <year>2005</year>\n' +
    '    <price>29.99</price>\n' +
    '  </book>\n' +
    '  <book category="web">\n' +
    '    <title lang="en">Learning XML</title>\n' +
    '    <author>Erik T. Ray</author>\n' +
    '    <year>2003</year>\n' +
    '    <price>39.95</price>\n' +
    '  </book>\n' +
    '</bookstore>';

/**
 * 序列化节点为可读文本
 * @param {Node} node
 * @returns {string}
 */
function xpathNodeToString(node) {
    if (!node) return '';
    if (node.nodeType === 2) {
        // ATTRIBUTE_NODE
        return '@' + node.nodeName + '="' + String(node.nodeValue || '') + '"';
    }
    if (node.nodeType === 3 || node.nodeType === 4) {
        // TEXT / CDATA
        return String(node.nodeValue || '').trim();
    }
    if (typeof XMLSerializer !== 'undefined') {
        try {
            return new XMLSerializer().serializeToString(node);
        } catch (e) {
            /* fallthrough */
        }
    }
    if (node.outerHTML) return node.outerHTML;
    if (node.textContent != null) return String(node.textContent);
    return String(node.nodeName || '');
}

/**
 * @param {string} xmlStr
 * @param {string} expr
 * @param {Document} [doc] 可选已解析文档
 * @returns {{type:string, values:array, count:number}}
 */
function xpathEvaluate(xmlStr, expr, doc) {
    if (!expr || !String(expr).trim()) {
        throw new Error('请输入 XPath 表达式');
    }
    if (!doc) {
        if (!xmlStr || !String(xmlStr).trim()) {
            throw new Error('请输入 XML');
        }
        if (typeof DOMParser === 'undefined') {
            throw new Error('当前环境不支持 DOMParser');
        }
        const parser = new DOMParser();
        doc = parser.parseFromString(String(xmlStr), 'application/xml');
        const err = doc.querySelector('parsererror');
        if (err) {
            throw new Error('XML 解析失败: ' + (err.textContent || '').trim().slice(0, 200));
        }
    }

    if (typeof doc.evaluate !== 'function') {
        throw new Error('当前环境不支持 XPath evaluate');
    }

    let result;
    try {
        result = doc.evaluate(expr, doc, null, XPathResult.ANY_TYPE, null);
    } catch (e) {
        throw new Error('XPath 错误: ' + e.message);
    }

    const type = result.resultType;
    // NUMBER / STRING / BOOLEAN
    if (type === XPathResult.NUMBER_TYPE) {
        return { type: 'number', values: [result.numberValue], count: 1 };
    }
    if (type === XPathResult.STRING_TYPE) {
        return { type: 'string', values: [result.stringValue], count: 1 };
    }
    if (type === XPathResult.BOOLEAN_TYPE) {
        return { type: 'boolean', values: [result.booleanValue], count: 1 };
    }

    // 节点集：统一用 ORDERED_NODE_SNAPSHOT
    let snap;
    try {
        snap = doc.evaluate(expr, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    } catch (e) {
        throw new Error('XPath 错误: ' + e.message);
    }
    const values = [];
    for (let i = 0; i < snap.snapshotLength; i++) {
        values.push(xpathNodeToString(snap.snapshotItem(i)));
    }
    return { type: 'nodeset', values: values, count: values.length };
}

function xpathRun() {
    const xml = document.getElementById('xpathInput').value;
    const expr = document.getElementById('xpathExpr').value;
    const out = document.getElementById('xpathOutput');
    const countEl = document.getElementById('xpathCount');
    countEl.textContent = '';
    try {
        const r = xpathEvaluate(xml, expr);
        countEl.textContent = '（' + r.type + '，' + r.count + ' 项）';
        if (r.count === 0) {
            out.textContent = '（无匹配）';
        } else if (r.type === 'nodeset') {
            out.textContent = r.values
                .map(function (v, i) {
                    return '[' + (i + 1) + '] ' + v;
                })
                .join('\n\n');
        } else {
            out.textContent = String(r.values[0]);
        }
        out.className = 'output-box';
        setStatus('XPath 完成，' + r.count + ' 项');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function xpathLoadSample() {
    document.getElementById('xpathInput').value = XPATH_SAMPLE_XML;
    document.getElementById('xpathExpr').value = '//book[@category="web"]/title/text()';
    setStatus('已加载示例');
}

function xpathClear() {
    document.getElementById('xpathInput').value = '';
    document.getElementById('xpathOutput').textContent = '';
    document.getElementById('xpathCount').textContent = '';
    setStatus('已清空');
}

function xpathOnSampleChange() {
    const sel = document.getElementById('xpathSample');
    if (sel && sel.value) {
        document.getElementById('xpathExpr').value = sel.value;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        xpathEvaluate: xpathEvaluate,
        xpathNodeToString: xpathNodeToString,
        XPATH_SAMPLE_XML: XPATH_SAMPLE_XML,
    };
}
