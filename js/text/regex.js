function regexTest() {
    const pattern = document.getElementById('regexPattern').value;
    const flags = document.getElementById('regexFlags').value;
    const text = document.getElementById('regexText').value;
    const out = document.getElementById('regexOutput');
    if (!pattern) {
        out.textContent = '请输入正则表达式';
        out.className = 'output-box error';
        return;
    }
    if (!text) {
        out.textContent = '请输入测试文本';
        out.className = 'output-box error';
        return;
    }
    try {
        const regex = new RegExp(pattern, flags);
        const matches = [];
        let match;
        let count = 0;
        regex.lastIndex = 0;
        const global = flags.includes('g');
        if (global) {
            while ((match = regex.exec(text)) !== null) {
                count++;
                const info = `[${match.index}-${regex.lastIndex}] "${match[0]}"` + (match.length > 1 ? ` groups: ${JSON.stringify(match.slice(1))}` : '');
                matches.push(info);
                if (count > 200) {
                    matches.push('... (超过 200 个匹配，已截断)');
                    break;
                }
                if (match.index === regex.lastIndex) regex.lastIndex++;
            }
        } else {
            match = regex.exec(text);
            if (match) {
                count = 1;
                const info = `[${match.index}-${match.index + match[0].length}] "${match[0]}"` + (match.length > 1 ? ` groups: ${JSON.stringify(match.slice(1))}` : '');
                matches.push(info);
            }
        }
        if (count === 0) {
            out.textContent = '无匹配结果';
            out.className = 'output-box';
        } else {
            out.textContent = `匹配数量: ${count}\n\n${matches.join('\n')}`;
            out.className = 'output-box';
        }
        setStatus(`正则匹配完成: ${count} 个结果`);
    } catch (e) {
        out.textContent = '正则表达式错误: ' + e.message;
        out.className = 'output-box error';
    }
}

// 正则语法速查表（target 为 'flags' 的分组，点击插入到标志输入框）
const REGEX_CHEAT = [
    {
        cat: '字符类', items: [
            {t: '\\d', d: '数字 [0-9]'},
            {t: '\\D', d: '非数字'},
            {t: '\\w', d: '单词字符'},
            {t: '\\W', d: '非单词字符'},
            {t: '\\s', d: '空白符'},
            {t: '\\S', d: '非空白符'},
            {t: '.', d: '任意字符(除换行)'},
            {t: '[abc]', d: '字符集合'},
            {t: '[^abc]', d: '否定集合'},
            {t: '[a-z]', d: '字符范围'},
        ]
    },
    {
        cat: '锚点', items: [
            {t: '^', d: '字符串/行首'},
            {t: '$', d: '字符串/行尾'},
            {t: '\\b', d: '单词边界'},
            {t: '\\B', d: '非单词边界'},
        ]
    },
    {
        cat: '量词', items: [
            {t: '*', d: '0 次或多次'},
            {t: '+', d: '1 次或多次'},
            {t: '?', d: '0 或 1 次'},
            {t: '{n}', d: '恰好 n 次'},
            {t: '{n,}', d: '至少 n 次'},
            {t: '{n,m}', d: 'n 到 m 次'},
        ]
    },
    {
        cat: '分组与断言', items: [
            {t: '(...)', d: '捕获组'},
            {t: '(?:...)', d: '非捕获组'},
            {t: '(?<n>...)', d: '命名捕获组'},
            {t: '|', d: '或'},
            {t: '(?=...)', d: '正向先行断言'},
            {t: '(?!...)', d: '负向先行断言'},
            {t: '(?<=...)', d: '正向后行断言'},
            {t: '(?<!...)', d: '负向后行断言'},
        ]
    },
    {
        cat: '转义特殊字符', items: [
            {t: '\\n', d: '换行'},
            {t: '\\t', d: '制表符'},
            {t: '\\r', d: '回车'},
            {t: '\\\\', d: '反斜杠'},
            {t: '\\.', d: '点号字面量'},
        ]
    },
    {
        cat: '标志', target: 'flags', items: [
            {t: 'g', d: '全局匹配'},
            {t: 'i', d: '忽略大小写'},
            {t: 'm', d: '多行模式'},
            {t: 's', d: '使 . 匹配换行'},
            {t: 'u', d: 'Unicode 模式'},
            {t: 'y', d: '粘附匹配'},
        ]
    },
];

let regexCheatInited = false;

function regexInit() {
    if (regexCheatInited) return;
    const container = document.getElementById('regexCheat');
    if (!container) return;
    container.innerHTML = '';
    REGEX_CHEAT.forEach(group => {
        const header = document.createElement('div');
        header.style.cssText = 'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:6px';
        header.textContent = group.cat;
        container.appendChild(header);
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-bottom:6px';
        group.items.forEach(item => {
            const chip = document.createElement('div');
            chip.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);cursor:pointer;transition:border-color .12s,background .12s;font-size:12px';
            chip.title = '点击插入: ' + item.t;
            chip.innerHTML = '<code style="color:var(--accent);font-family:var(--font);font-weight:600">' + escapeRegexHtml(item.t) + '</code><span style="color:var(--text-dim)">' + escapeRegexHtml(item.d) + '</span>';
            chip.addEventListener('mouseenter', function () {
                this.style.borderColor = 'var(--accent)';
                this.style.background = 'var(--glass-hover)';
            });
            chip.addEventListener('mouseleave', function () {
                this.style.borderColor = 'var(--border)';
                this.style.background = 'var(--bg-card)';
            });
            chip.addEventListener('click', () => regexInsertToken(item.t, group.target === 'flags'));
            grid.appendChild(chip);
        });
        container.appendChild(grid);
    });
    regexCheatInited = true;
}

function escapeRegexHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 在输入框光标处插入语法 token（默认插入表达式框，flags 分组插入标志框）
function regexInsertToken(token, toFlags) {
    const el = document.getElementById(toFlags ? 'regexFlags' : 'regexPattern');
    if (!el) return;
    const start = el.selectionStart != null ? el.selectionStart : el.value.length;
    const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
    el.value = el.value.slice(0, start) + token + el.value.slice(end);
    const pos = start + token.length;
    el.focus();
    try {
        el.setSelectionRange(pos, pos);
    } catch (e) {
    }
}

registerInit('regex', regexInit);
