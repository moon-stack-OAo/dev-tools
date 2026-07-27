// Markdown 表格 / 文本树

/**
 * 解析分隔文本为二维数组
 * @param {string} text
 * @param {string} [delimiter] 默认自动：制表符 / 逗号 / |
 * @returns {string[][]}
 */
function mdtParseRows(text, delimiter) {
    if (text == null || String(text).trim() === '') {
        throw new Error('请输入表格数据');
    }
    const lines = String(text)
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map(function (l) {
            return l.trimEnd();
        })
        .filter(function (l) {
            return l.trim() !== '';
        });
    if (!lines.length) throw new Error('无有效行');

    let delim = delimiter;
    if (!delim || delim === 'auto') {
        const sample = lines[0];
        if (sample.indexOf('\t') >= 0) delim = '\t';
        else if (/^\s*\|/.test(sample) || sample.indexOf('|') >= 0) delim = '|';
        else delim = ',';
    }
    if (delim === '\\t') delim = '\t';

    return lines.map(function (line) {
        if (delim === '|') {
            let s = line.trim();
            if (s.startsWith('|')) s = s.slice(1);
            if (s.endsWith('|')) s = s.slice(0, -1);
            // 分隔行 :-- --: 跳过在上层处理
            return s.split('|').map(function (c) {
                return c.trim();
            });
        }
        if (delim === ',') {
            return mdtParseCsvLine(line);
        }
        return line.split(delim).map(function (c) {
            return c.trim();
        });
    });
}

function mdtParseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuote) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuote = false;
                }
            } else {
                cur += ch;
            }
        } else {
            if (ch === '"') {
                inQuote = true;
            } else if (ch === ',') {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
    }
    result.push(cur.trim());
    return result;
}

function mdtEscapeCell(s) {
    return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

/**
 * CSV/TSV/| 文本 → Markdown 表格
 * @param {string} text
 * @param {object} [options]
 * @param {string} [options.delimiter='auto']
 * @param {string|string[]} [options.align] left|center|right 或每列对齐
 * @param {boolean} [options.header=true]
 * @returns {string}
 */
function csvToMdTable(text, options) {
    const opts = options || {};
    let rows = mdtParseRows(text, opts.delimiter);
    // 过滤 markdown 分隔行
    rows = rows.filter(function (r) {
        return !r.every(function (c) {
            return /^:?-+:?$/.test(String(c).trim());
        });
    });
    if (!rows.length) throw new Error('无有效数据行');

    const colCount = Math.max.apply(
        null,
        rows.map(function (r) {
            return r.length;
        }),
    );
    rows = rows.map(function (r) {
        const copy = r.slice();
        while (copy.length < colCount) copy.push('');
        return copy;
    });

    const header = opts.header !== false;
    let alignList = [];
    if (Array.isArray(opts.align)) {
        alignList = opts.align;
    } else if (typeof opts.align === 'string' && opts.align) {
        alignList = [];
        for (let i = 0; i < colCount; i++) alignList.push(opts.align);
    } else {
        alignList = [];
        for (let i = 0; i < colCount; i++) alignList.push('left');
    }

    function alignSep(a) {
        if (a === 'center') return ':---:';
        if (a === 'right') return '---:';
        return ':---';
    }

    const lines = [];
    if (header) {
        const head = rows[0].map(mdtEscapeCell);
        lines.push('| ' + head.join(' | ') + ' |');
        lines.push(
            '| ' +
                alignList
                    .slice(0, colCount)
                    .map(function (a, i) {
                        return alignSep(alignList[i] || 'left');
                    })
                    .join(' | ') +
                ' |',
        );
        for (let i = 1; i < rows.length; i++) {
            lines.push('| ' + rows[i].map(mdtEscapeCell).join(' | ') + ' |');
        }
    } else {
        // 无表头：生成空表头
        const empty = [];
        for (let i = 0; i < colCount; i++) empty.push('列' + (i + 1));
        lines.push('| ' + empty.join(' | ') + ' |');
        lines.push(
            '| ' +
                alignList
                    .slice(0, colCount)
                    .map(function (a, i) {
                        return alignSep(alignList[i] || 'left');
                    })
                    .join(' | ') +
                ' |',
        );
        rows.forEach(function (r) {
            lines.push('| ' + r.map(mdtEscapeCell).join(' | ') + ' |');
        });
    }
    return lines.join('\n');
}

/**
 * Markdown 表格 → CSV
 * @param {string} md
 * @param {object} [options]
 * @param {string} [options.delimiter=',']
 * @returns {string}
 */
function mdTableToCsv(md, options) {
    const opts = options || {};
    const delim = opts.delimiter === '\\t' || opts.delimiter === 'tab' ? '\t' : opts.delimiter || ',';
    if (md == null || String(md).trim() === '') {
        throw new Error('请输入 Markdown 表格');
    }
    const lines = String(md)
        .split(/\r?\n/)
        .map(function (l) {
            return l.trim();
        })
        .filter(function (l) {
            return l && l.indexOf('|') >= 0;
        });
    if (!lines.length) throw new Error('未找到表格行');

    const rows = [];
    lines.forEach(function (line) {
        let s = line;
        if (s.startsWith('|')) s = s.slice(1);
        if (s.endsWith('|')) s = s.slice(0, -1);
        const cells = s.split('|').map(function (c) {
            return c.trim().replace(/\\\|/g, '|');
        });
        // 跳过对齐分隔行
        if (cells.every(function (c) {
            return /^:?-+:?$/.test(c);
        })) {
            return;
        }
        rows.push(cells);
    });
    if (!rows.length) throw new Error('无有效数据行');

    return rows
        .map(function (r) {
            return r
                .map(function (c) {
                    if (delim === '\t') return c.replace(/\t/g, ' ');
                    if (/[",\r\n]/.test(c)) {
                        return '"' + c.replace(/"/g, '""') + '"';
                    }
                    return c;
                })
                .join(delim);
        })
        .join('\n');
}

/**
 * 缩进文本 / 路径列表 → 树形字符画
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.indent=2] 空格缩进宽度（当用空格缩进时）
 * @param {'indent'|'path'} [options.mode='auto']
 * @returns {string}
 */
function textToTree(text, options) {
    const opts = options || {};
    if (text == null || String(text).trim() === '') {
        throw new Error('请输入文本');
    }
    const rawLines = String(text)
        .split(/\r?\n/)
        .map(function (l) {
            return l.replace(/\t/g, '    ');
        })
        .filter(function (l) {
            return l.trim() !== '';
        });
    if (!rawLines.length) throw new Error('无有效行');

    let mode = opts.mode || 'auto';
    if (mode === 'auto') {
        const pathLike = rawLines.filter(function (l) {
            return /[\\/]/.test(l.trim()) && !/^\s/.test(l);
        }).length;
        mode = pathLike >= Math.ceil(rawLines.length * 0.5) ? 'path' : 'indent';
    }

    let nodes;
    if (mode === 'path') {
        nodes = mdtPathsToNodes(rawLines);
    } else {
        nodes = mdtIndentToNodes(rawLines, opts.indent || 2);
    }
    return mdtRenderTree(nodes);
}

function mdtPathsToNodes(lines) {
    const root = { name: '', children: [] };
    lines.forEach(function (line) {
        let p = line.trim().replace(/\\/g, '/');
        // 去掉盘符 ./
        p = p.replace(/^[a-zA-Z]:/, '');
        p = p.replace(/^\.\//, '');
        const parts = p.split('/').filter(Boolean);
        let cur = root;
        parts.forEach(function (part) {
            let child = cur.children.find(function (c) {
                return c.name === part;
            });
            if (!child) {
                child = { name: part, children: [] };
                cur.children.push(child);
            }
            cur = child;
        });
    });
    return root.children;
}

function mdtIndentToNodes(lines, indentWidth) {
    const root = [];
    const stack = [{ level: -1, children: root }];
    lines.forEach(function (line) {
        const m = line.match(/^(\s*)(.*)$/);
        const spaces = m[1].replace(/\t/g, '    ').length;
        const name = m[2].trim();
        if (!name) return;
        const level = Math.floor(spaces / indentWidth);
        const node = { name: name, children: [] };
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }
        stack[stack.length - 1].children.push(node);
        stack.push({ level: level, children: node.children });
    });
    return root;
}

function mdtRenderTree(nodes) {
    const lines = [];
    function walk(list, prefix, isRoot) {
        list.forEach(function (node, idx) {
            const last = idx === list.length - 1;
            const branch = last ? '└─ ' : '├─ ';
            const linePrefix = isRoot ? '' : prefix;
            lines.push(linePrefix + branch + node.name);
            if (node.children && node.children.length) {
                const childPrefix = linePrefix + (last ? '   ' : '│  ');
                walk(node.children, childPrefix, false);
            }
        });
    }
    walk(nodes, '', true);
    return lines.join('\n');
}

// === UI ===

function mdtCsvToMd() {
    const input = document.getElementById('mdtInput').value;
    const delim = document.getElementById('mdtDelim').value;
    const align = document.getElementById('mdtAlign').value;
    const out = document.getElementById('mdtOutput');
    try {
        const r = csvToMdTable(input, { delimiter: delim, align: align });
        out.textContent = r;
        out.className = 'output-box';
        if (typeof setStatus === 'function') setStatus('已生成 Markdown 表格');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function mdtMdToCsv() {
    const input = document.getElementById('mdtInput').value;
    const delim = document.getElementById('mdtDelim').value;
    const out = document.getElementById('mdtOutput');
    try {
        const d = delim === '|' ? ',' : delim;
        const r = mdTableToCsv(input, { delimiter: d === 'auto' ? ',' : d });
        out.textContent = r;
        out.className = 'output-box';
        if (typeof setStatus === 'function') setStatus('已转为 CSV');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function mdtToTree() {
    const input = document.getElementById('mdtInput').value;
    const mode = document.getElementById('mdtTreeMode').value;
    const out = document.getElementById('mdtOutput');
    try {
        const r = textToTree(input, { mode: mode });
        out.textContent = r;
        out.className = 'output-box';
        if (typeof setStatus === 'function') setStatus('已生成文本树');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function mdtLoadSample() {
    document.getElementById('mdtInput').value =
        'name,age,city\nAlice,28,Shanghai\nBob,31,Beijing\nCharlie,25,Guangzhou';
    document.getElementById('mdtDelim').value = ',';
    mdtCsvToMd();
}

function mdtLoadTreeSample() {
    document.getElementById('mdtInput').value =
        'src/main/java/App.java\nsrc/main/java/util/Helper.java\nsrc/test/java/AppTest.java\nREADME.md';
    document.getElementById('mdtTreeMode').value = 'path';
    mdtToTree();
}

function mdtClear() {
    document.getElementById('mdtInput').value = '';
    document.getElementById('mdtOutput').textContent = '';
    document.getElementById('mdtOutput').className = 'output-box';
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        csvToMdTable: csvToMdTable,
        mdTableToCsv: mdTableToCsv,
        textToTree: textToTree,
        mdtParseRows: mdtParseRows,
    };
}
