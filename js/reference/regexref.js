const REGEX_REF = [
    {
        cat: '数字', items: [
            {pattern: '^\\d+$', desc: '纯数字'},
            {pattern: '^\\d{6}$', desc: '6 位数字'},
            {pattern: '^\\d{11}$', desc: '11 位数字 (手机号)'},
            {pattern: '^\\d{15,18}$', desc: '15-18 位数字 (身份证)'},
            {pattern: '^-?\\d+(\\.\\d+)?$', desc: '整数或小数'},
            {pattern: '^\\d{1,3}(\\.\\d{1,3}){3}$', desc: 'IP 地址'},
            {pattern: '^[+-]?\\d+$', desc: '整数 (含正负)'},
            {pattern: '^\\d+(\\.\\d{1,2})?$', desc: '金额 (两位小数)'},
        ]
    },
    {
        cat: '字母', items: [
            {pattern: '^[a-zA-Z]+$', desc: '纯英文字母'},
            {pattern: '^[A-Z]+$', desc: '大写字母'},
            {pattern: '^[a-z]+$', desc: '小写字母'},
            {pattern: '^[a-zA-Z0-9]+$', desc: '字母+数字'},
            {pattern: '^[a-zA-Z0-9_]+$', desc: '字母+数字+下划线'},
            {pattern: '^[a-zA-Z0-9_\\-]+$', desc: '字母数字下划线连字符'},
        ]
    },
    {
        cat: '中文', items: [
            {pattern: '^[\\u4e00-\\u9fa5]+$', desc: '纯中文'},
            {pattern: '^[\\u4e00-\\u9fa5]{2,4}$', desc: '2-4 个中文 (姓名)'},
            {pattern: '[\\u4e00-\\u9fa5]', desc: '是否包含中文'},
        ]
    },
    {
        cat: '常用格式', items: [
            {pattern: '^1[3-9]\\d{9}$', desc: '手机号 (中国大陆)'},
            {pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$', desc: 'Email'},
            {pattern: '^https?://[\\w./?&=#%-]+$', desc: 'URL'},
            {pattern: '^\\d{17}[\\dXx]$', desc: '身份证 (18 位)'},
            {pattern: '^\\d{6}$', desc: '邮政编码'},
            {pattern: '^\\d{4}-\\d{1,2}-\\d{1,2}$', desc: '日期 (YYYY-MM-DD)'},
            {pattern: '^\\d{4}-\\d{1,2}-\\d{1,2} \\d{1,2}:\\d{2}$', desc: '日期时间'},
            {pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', desc: '时间 (HH:mm)'},
        ]
    },
    {
        cat: 'Java 相关', items: [
            {pattern: '^[a-z_$][a-zA-Z0-9_$]*$', desc: 'Java 变量名'},
            {pattern: '^[A-Z][a-zA-Z0-9_]*$', desc: 'Java 类名 (PascalCase)'},
            {pattern: '^[a-z]+([A-Z][a-z]*)*$', desc: 'camelCase'},
            {pattern: '^[a-z]+(_[a-z]+)*$', desc: 'snake_case'},
            {pattern: '^(com|org|net)\\.\\w+(\\.\\w+)+$', desc: 'Java 包名'},
        ]
    },
    {
        cat: '其他', items: [
            {pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$', desc: '十六进制颜色'},
            {pattern: '^[\\w\\s]+$', desc: '单词 + 空格'},
            {pattern: '^[\\s\\S]*$', desc: '任意字符 (含换行)'},
            {pattern: '^\\s*$', desc: '空行或空白'},
        ]
    },
];

// 使用全局 safeCopy()（定义于 app.js）

function regexRefRender() {
    const container = document.getElementById('regexRefContent');
    if (!container) return;
    container.innerHTML = '';
    REGEX_REF.forEach(group => {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${group.cat}</div>`;
        group.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            card.innerHTML = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.pattern.replace(/</g, '&lt;')}</code><span class="ref-cmd-desc">${item.desc}</span><button class="sm outline" onclick="safeCopy('${item.pattern.replace(/'/g, "\\'")}')">复制</button></div>`;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
}

registerInit('regexref', regexRefRender);
