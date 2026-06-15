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
