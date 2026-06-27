const UA_PRESETS = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    android:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    wechat: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.45(0x18002d39) NetType/WIFI Language/zh_CN',
    dingtalk:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 DingTalk/7.6.20 Language/zh-Hans CN',
    feishu: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Lark/7.30.6 ChannelName/IPA MoEngagePlugin/CHANNELID/IOS',
};

function uaparserParse() {
    const ua = document.getElementById('uaparserInput').value.trim();
    const out = document.getElementById('uaparserOutput');
    if (!ua) {
        out.textContent = '请输入 User-Agent 字符串';
        out.className = 'output-box error';
        return;
    }
    if (typeof UAParser === 'undefined') {
        out.textContent = 'UAParser 库未加载，请检查 /lib/ua-parser.min.js';
        out.className = 'output-box error';
        return;
    }
    let result;
    try {
        result = new UAParser(ua).getResult();
    } catch (e) {
        out.textContent = '解析失败: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    const lines = [];
    lines.push('=== UA 原文 ===');
    lines.push(result.ua || ua);
    lines.push('');
    lines.push('=== 浏览器 ===');
    const b = result.browser || {};
    lines.push('名称     : ' + (b.name || '(未知)'));
    lines.push('版本     : ' + (b.version || '(未知)'));
    lines.push('主版本   : ' + (b.major || '(未知)'));
    lines.push('');
    lines.push('=== 操作系统 ===');
    const os = result.os || {};
    lines.push('名称     : ' + (os.name || '(未知)'));
    lines.push('版本     : ' + (os.version || '(未知)'));
    lines.push('');
    lines.push('=== 设备 ===');
    const d = result.device || {};
    lines.push('类型     : ' + (d.type || '(未知, 默认 desktop)'));
    lines.push('厂商     : ' + (d.vendor || '(未知)'));
    lines.push('型号     : ' + (d.model || '(未知)'));
    lines.push('');
    lines.push('=== 渲染引擎 ===');
    const eng = result.engine || {};
    lines.push('名称     : ' + (eng.name || '(未知)'));
    lines.push('版本     : ' + (eng.version || '(未知)'));
    lines.push('');
    lines.push('=== CPU 架构 ===');
    const cpu = result.cpu || {};
    lines.push('架构     : ' + (cpu.architecture || '(未知)'));
    out.textContent = lines.join('\n');
    out.className = 'output-box';
    setStatus('UA 解析完成');
}

function uaparserUseCurrent() {
    const ua = navigator.userAgent || '';
    document.getElementById('uaparserInput').value = ua;
    uaparserParse();
}

function uaparserApplyPreset() {
    const key = document.getElementById('uaparserPreset').value;
    if (!key) return;
    const ua = UA_PRESETS[key];
    if (ua) {
        document.getElementById('uaparserInput').value = ua;
        uaparserParse();
    }
}
