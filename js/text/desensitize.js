// 数据脱敏

const DS_RULES = {
    phone: {
        name: '手机号',
        // 大陆 11 位手机
        re: /(?<!\d)(1[3-9]\d)(\d{4})(\d{4})(?!\d)/g,
        replace: function (_m, a, _b, c) {
            return a + '****' + c;
        },
    },
    idcard: {
        name: '身份证',
        re: /(?<!\d)(\d{6})(\d{8})(\d{3}[\dXx])(?!\d)/g,
        replace: function (_m, a, _b, c) {
            return a + '********' + c;
        },
    },
    bank: {
        name: '银行卡',
        re: /(?<!\d)(\d{4})(\d{8,12})(\d{4})(?!\d)/g,
        replace: function (_m, a, mid, c) {
            return a + mid.replace(/\d/g, '*') + c;
        },
    },
    email: {
        name: '邮箱',
        re: /([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
        replace: function (_m, user, domain) {
            if (user.length <= 1) {
                return '*@' + domain;
            }
            if (user.length === 2) {
                return user[0] + '*@' + domain;
            }
            return user[0] + '***' + user[user.length - 1] + '@' + domain;
        },
    },
    ipv4: {
        name: 'IPv4',
        re: /\b((?:\d{1,3}\.){3})(\d{1,3})\b/g,
        replace: function (_m, prefix) {
            return prefix + '*';
        },
    },
    name: {
        name: '中文姓名',
        // 2~4 字中文名（启发式，避免误伤长句：前后非中文）
        re: /(?<![\u4e00-\u9fff])([\u4e00-\u9fff])([\u4e00-\u9fff]{1,3})(?![\u4e00-\u9fff])/g,
        replace: function (_m, first, rest) {
            return first + rest.replace(/./g, '*');
        },
    },
};

/**
 * @param {string} text
 * @param {object} options
 * @param {string[]} [options.types] 规则 id 列表
 * @param {string} [options.mode='text'] text|json
 * @param {string[]} [options.jsonFields] JSON 模式下按字段名脱敏（支持 path 末段匹配）
 * @param {string} [options.mask='*'] 自定义掩码字符（部分规则固定 ****）
 * @returns {{text:string, hits:object}}
 */
function desensitizeText(text, options) {
    options = options || {};
    const types = options.types && options.types.length ? options.types : Object.keys(DS_RULES);
    const mode = options.mode || 'text';
    const hits = {};
    types.forEach(function (t) {
        hits[t] = 0;
    });

    if (text == null || text === '') {
        return { text: text == null ? '' : text, hits: hits };
    }

    if (mode === 'json') {
        return desensitizeJson(String(text), types, options.jsonFields || [], hits);
    }

    let out = String(text);
    types.forEach(function (type) {
        const rule = DS_RULES[type];
        if (!rule) return;
        // 重置 lastIndex
        rule.re.lastIndex = 0;
        out = out.replace(rule.re, function () {
            hits[type] = (hits[type] || 0) + 1;
            return rule.replace.apply(null, arguments);
        });
    });
    return { text: out, hits: hits };
}

function desensitizeJson(raw, types, fields, hits) {
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        // 解析失败则按纯文本
        return desensitizeText(raw, { types: types, mode: 'text' });
    }

    const fieldSet = {};
    fields.forEach(function (f) {
        if (f) fieldSet[String(f).trim().toLowerCase()] = true;
    });
    const useFieldFilter = Object.keys(fieldSet).length > 0;

    function maskString(s) {
        let out = s;
        types.forEach(function (type) {
            const rule = DS_RULES[type];
            if (!rule) return;
            rule.re.lastIndex = 0;
            out = out.replace(rule.re, function () {
                hits[type] = (hits[type] || 0) + 1;
                return rule.replace.apply(null, arguments);
            });
        });
        return out;
    }

    function walk(node, key) {
        if (node === null || node === undefined) return node;
        if (typeof node === 'string') {
            if (useFieldFilter) {
                const k = key ? String(key).toLowerCase() : '';
                if (!fieldSet[k]) return node;
            }
            return maskString(node);
        }
        if (typeof node === 'number' || typeof node === 'boolean') {
            if (useFieldFilter) {
                const k = key ? String(key).toLowerCase() : '';
                if (!fieldSet[k]) return node;
            }
            // 数字类：转字符串匹配后再尝试还原数字（仅全掩码场景保持字符串）
            const s = String(node);
            const masked = maskString(s);
            if (masked === s) return node;
            return masked;
        }
        if (Array.isArray(node)) {
            return node.map(function (item) {
                return walk(item, key);
            });
        }
        if (typeof node === 'object') {
            const o = {};
            Object.keys(node).forEach(function (k) {
                o[k] = walk(node[k], k);
            });
            return o;
        }
        return node;
    }

    const result = walk(data, null);
    return { text: JSON.stringify(result, null, 2), hits: hits };
}

function dsGetSelectedTypes() {
    const types = [];
    document.querySelectorAll('#panel-desensitize input[data-ds-type]').forEach(function (el) {
        if (el.checked) types.push(el.getAttribute('data-ds-type'));
    });
    return types;
}

function desensitizeRun() {
    const input = document.getElementById('dsInput').value;
    const out = document.getElementById('dsOutput');
    const mode = document.getElementById('dsMode').value;
    const fieldsRaw = document.getElementById('dsFields').value;
    const types = dsGetSelectedTypes();
    const fields = fieldsRaw
        .split(/[,，\s]+/)
        .map(function (s) {
            return s.trim();
        })
        .filter(Boolean);

    if (!input) {
        out.textContent = '请输入待脱敏文本';
        out.className = 'output-box error';
        return;
    }
    if (!types.length) {
        out.textContent = '请至少选择一种脱敏类型';
        out.className = 'output-box error';
        return;
    }
    try {
        const result = desensitizeText(input, {
            types: types,
            mode: mode,
            jsonFields: fields,
        });
        out.textContent = result.text;
        out.className = 'output-box';
        const parts = Object.keys(result.hits)
            .filter(function (k) {
                return result.hits[k] > 0;
            })
            .map(function (k) {
                return (DS_RULES[k] ? DS_RULES[k].name : k) + ':' + result.hits[k];
            });
        setStatus(parts.length ? '脱敏完成（' + parts.join(', ') + '）' : '脱敏完成（无匹配）');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function desensitizeLoadSample() {
    document.getElementById('dsMode').value = 'json';
    document.getElementById('dsFields').value = 'phone,idCard,email,name';
    document.getElementById('dsInput').value = JSON.stringify(
        {
            name: '张三',
            phone: '13812345678',
            idCard: '110101199001011234',
            email: 'zhangsan@example.com',
            bankCard: '6222021234567890123',
            ip: '192.168.1.100',
            note: '联系人李四，手机 13987654321',
        },
        null,
        2,
    );
    setStatus('已加载示例');
}

function desensitizeClear() {
    document.getElementById('dsInput').value = '';
    document.getElementById('dsOutput').textContent = '';
    setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        desensitizeText: desensitizeText,
        DS_RULES: DS_RULES,
    };
}
