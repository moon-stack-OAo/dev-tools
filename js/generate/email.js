const EMAIL_TEMPLATES = {
    welcome: {
        name: '欢迎邮件',
        icon: '👋',
        description: '新用户注册欢迎',
        fields: [
            {key: 'name', label: '收件人姓名', placeholder: '尊敬的用户', default: '尊敬的用户'},
            {key: 'company', label: '公司/产品名', placeholder: 'XX 科技', default: 'XX 科技'},
            {
                key: 'actionUrl',
                label: '按钮链接',
                placeholder: 'https://example.com/start',
                default: 'https://example.com/start'
            },
            {key: 'actionText', label: '按钮文案', placeholder: '立即体验', default: '立即体验'},
            {
                key: 'welcomeText',
                label: '欢迎语段落',
                type: 'textarea',
                placeholder: '感谢您注册 XX 科技，我们已为您准备好一切。',
                default: '感谢您注册 {{company}}，您的账户已激活。立即点击下方按钮开始体验完整功能。'
            },
        ],
        build: (v, t) => baseLayout({
            subject: `欢迎加入 ${v.company}`,
            preheader: `${v.name}，欢迎加入 ${v.company}`,
            primaryColor: t.primaryColor,
            body: `
                <tr><td class="title">👋 欢迎加入，${emailEscapeHtml(v.name)}！</td></tr>
                <tr><td class="content">${emailEscapeHtml(v.welcomeText).replace(/\n/g, '<br>')}</td></tr>
                <tr><td align="center" class="cta-wrap"><a href="${escapeAttr(v.actionUrl)}" class="btn">${emailEscapeHtml(v.actionText)}</a></td></tr>
                <tr><td class="content muted small">如果您没有注册 ${emailEscapeHtml(v.company)} 账户，请忽略此邮件。</td></tr>
            `
        }, t)
    },

    reset: {
        name: '密码重置',
        icon: '🔑',
        description: '密码重置请求',
        fields: [
            {key: 'name', label: '收件人姓名', placeholder: '尊敬的用户', default: '尊敬的用户'},
            {key: 'company', label: '公司/产品名', placeholder: 'XX 科技', default: 'XX 科技'},
            {
                key: 'resetUrl',
                label: '重置链接',
                placeholder: 'https://example.com/reset?token=xxx',
                default: 'https://example.com/reset?token=abc123'
            },
            {key: 'expireMinutes', label: '链接有效期（分钟）', placeholder: '60', default: '60'},
        ],
        build: (v, t) => baseLayout({
            subject: `重置您的 ${v.company} 密码`,
            preheader: `密码重置请求，链接 ${v.expireMinutes} 分钟内有效`,
            primaryColor: t.primaryColor,
            body: `
                <tr><td class="title">🔑 密码重置请求</td></tr>
                <tr><td class="content">您好，${emailEscapeHtml(v.name)}：</td></tr>
                <tr><td class="content">我们收到了您的密码重置请求。点击下方按钮重置您的密码：</td></tr>
                <tr><td align="center" class="cta-wrap"><a href="${escapeAttr(v.resetUrl)}" class="btn">重置密码</a></td></tr>
                <tr><td class="content muted small">⏱ 该链接将在 <strong>${emailEscapeHtml(v.expireMinutes)} 分钟</strong>后失效。如果您没有请求重置密码，请忽略此邮件，您的密码不会被修改。</td></tr>
            `
        }, t)
    },

    order: {
        name: '订单确认',
        icon: '🧾',
        description: '订单确认通知',
        fields: [
            {key: 'name', label: '收件人姓名', placeholder: '张三', default: '张三'},
            {key: 'company', label: '公司/产品名', placeholder: 'XX 商城', default: 'XX 商城'},
            {key: 'orderNo', label: '订单号', placeholder: '202506160001', default: '202506160001'},
            {key: 'orderDate', label: '订单日期', placeholder: '2025-06-16 10:30', default: '2025-06-16 10:30'},
            {key: 'amount', label: '订单金额', placeholder: '¥299.00', default: '¥299.00'},
            {
                key: 'orderUrl',
                label: '订单详情链接',
                placeholder: 'https://example.com/orders/202506160001',
                default: 'https://example.com/orders/202506160001'
            },
        ],
        build: (v, t) => baseLayout({
            subject: `订单 ${v.orderNo} 已确认`,
            preheader: `感谢您的订购，订单金额 ${v.amount}`,
            primaryColor: t.primaryColor,
            body: `
                <tr><td class="title">🧾 订单确认</td></tr>
                <tr><td class="content">您好，${emailEscapeHtml(v.name)}：</td></tr>
                <tr><td class="content">感谢您在 <strong>${emailEscapeHtml(v.company)}</strong> 下单，您的订单已确认。订单详情如下：</td></tr>
                <tr><td>
                    <table role="presentation" class="info-table" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr><td class="info-label">订单号</td><td class="info-val"><strong>${emailEscapeHtml(v.orderNo)}</strong></td></tr>
                        <tr><td class="info-label">下单时间</td><td class="info-val">${emailEscapeHtml(v.orderDate)}</td></tr>
                        <tr><td class="info-label">订单金额</td><td class="info-val"><span class="amount">${emailEscapeHtml(v.amount)}</span></td></tr>
                    </table>
                </td></tr>
                <tr><td align="center" class="cta-wrap"><a href="${escapeAttr(v.orderUrl)}" class="btn">查看订单详情</a></td></tr>
            `
        }, t)
    },

    event: {
        name: '活动通知',
        icon: '📅',
        description: '线上/线下活动邀请',
        fields: [
            {key: 'name', label: '收件人姓名', placeholder: '尊敬的用户', default: '尊敬的用户'},
            {key: 'eventTitle', label: '活动标题', placeholder: '2025 开发者大会', default: '2025 开发者大会'},
            {key: 'eventTime', label: '活动时间', placeholder: '2025-07-20 14:00', default: '2025-07-20 14:00'},
            {
                key: 'eventLocation',
                label: '活动地点',
                placeholder: '上海·浦东国际会议中心',
                default: '上海·浦东国际会议中心'
            },
            {
                key: 'signupUrl',
                label: '报名链接',
                placeholder: 'https://example.com/event/signup',
                default: 'https://example.com/event/signup'
            },
            {
                key: 'eventDesc',
                label: '活动简介',
                type: 'textarea',
                placeholder: '活动详情...',
                default: '本次活动汇聚业内顶尖技术专家，分享最新技术趋势与最佳实践，现场还有精美礼品与抽奖环节。'
            },
        ],
        build: (v, t) => baseLayout({
            subject: `邀请您参加 ${v.eventTitle}`,
            preheader: `${v.eventTime} @ ${v.eventLocation}`,
            primaryColor: t.primaryColor,
            body: `
                <tr><td class="title">📅 ${emailEscapeHtml(v.eventTitle)}</td></tr>
                <tr><td class="content">您好，${emailEscapeHtml(v.name)}：</td></tr>
                <tr><td class="content">${emailEscapeHtml(v.eventDesc).replace(/\n/g, '<br>')}</td></tr>
                <tr><td>
                    <table role="presentation" class="info-table" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr><td class="info-label">⏱ 时间</td><td class="info-val">${emailEscapeHtml(v.eventTime)}</td></tr>
                        <tr><td class="info-label">📍 地点</td><td class="info-val">${emailEscapeHtml(v.eventLocation)}</td></tr>
                    </table>
                </td></tr>
                <tr><td align="center" class="cta-wrap"><a href="${escapeAttr(v.signupUrl)}" class="btn">立即报名</a></td></tr>
            `
        }, t)
    },

    promo: {
        name: '营销推广',
        icon: '🎉',
        description: '促销活动 / 优惠码',
        fields: [
            {key: 'name', label: '收件人姓名', placeholder: '尊敬的用户', default: '尊敬的用户'},
            {key: 'company', label: '公司/产品名', placeholder: 'XX 商城', default: 'XX 商城'},
            {key: 'discount', label: '优惠标题', placeholder: '限时 8 折', default: '限时 8 折'},
            {key: 'promoCode', label: '优惠码', placeholder: 'SAVE20', default: 'SAVE20'},
            {key: 'expireDate', label: '过期日期', placeholder: '2025-07-31', default: '2025-07-31'},
            {
                key: 'actionUrl',
                label: '活动链接',
                placeholder: 'https://example.com/sale',
                default: 'https://example.com/sale'
            },
            {
                key: 'promoText',
                label: '活动文案',
                type: 'textarea',
                placeholder: '尊享专属优惠...',
                default: '为感谢您的支持，我们为您准备了一份专属优惠。点击下方按钮立即使用优惠码，享受限时折扣！'
            },
        ],
        build: (v, t) => baseLayout({
            subject: `🎁 ${v.discount} - 专属优惠`,
            preheader: `优惠码 ${v.promoCode}，${v.expireDate} 前有效`,
            primaryColor: t.primaryColor,
            body: `
                <tr><td class="title hero">🎉 ${emailEscapeHtml(v.discount)}</td></tr>
                <tr><td class="content">您好，${emailEscapeHtml(v.name)}：</td></tr>
                <tr><td class="content">${emailEscapeHtml(v.promoText).replace(/\n/g, '<br>')}</td></tr>
                <tr><td align="center" class="coupon-wrap">
                    <div class="coupon">优惠码：<strong>${emailEscapeHtml(v.promoCode)}</strong></div>
                </td></tr>
                <tr><td align="center" class="cta-wrap"><a href="${escapeAttr(v.actionUrl)}" class="btn">立即使用</a></td></tr>
                <tr><td class="content muted small">⏱ 本优惠码将于 ${emailEscapeHtml(v.expireDate)} 失效。</td></tr>
            `
        }, t)
    }
};

const DEFAULT_THEME = {
    primaryColor: '#4f46e5',
    bgColor: '#f5f5f7',
    cardColor: '#ffffff',
    textColor: '#1f2937',
    mutedColor: '#6b7280',
    borderColor: '#e5e7eb',
    btnTextColor: '#ffffff',
    footerText: '此邮件由系统自动发送，请勿直接回复。',
    companyName: 'XX 科技',
    unsubscribeUrl: 'https://example.com/unsubscribe',
    logoUrl: ''
};

function emailEscapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
}

function baseLayout(opts, theme) {
    const subject = opts.subject || '';
    const preheader = opts.preheader || '';
    const primary = theme.primaryColor;
    const bg = theme.bgColor;
    const card = theme.cardColor;
    const text = theme.textColor;
    const muted = theme.mutedColor;
    const border = theme.borderColor;
    const btnFg = theme.btnTextColor;
    const logoBlock = theme.logoUrl
        ? `<tr><td align="center" class="logo-wrap"><img src="${escapeAttr(theme.logoUrl)}" alt="${escapeAttr(theme.companyName)}" class="logo"></td></tr>`
        : `<tr><td align="center" class="logo-wrap"><div class="brand">${emailEscapeHtml(theme.companyName)}</div></td></tr>`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>${emailEscapeHtml(subject)}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background: ${bg}; }
  a { color: ${primary}; text-decoration: none; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }

  .email-wrap { background: ${bg}; padding: 24px 12px; }
  .email-body { background: ${card}; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .preheader { display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${bg}; }
  .logo-wrap { padding: 24px 24px 8px; }
  .brand { font-size: 20px; font-weight: 700; color: ${primary}; letter-spacing: .5px; }
  .logo { max-width: 160px; height: auto; }
  .title { font-size: 24px; font-weight: 700; color: ${text}; padding: 16px 32px 8px; line-height: 1.3; }
  .title.hero { color: ${primary}; font-size: 28px; text-align: center; padding: 24px 32px 8px; }
  .content { font-size: 15px; line-height: 1.7; color: ${text}; padding: 8px 32px; }
  .content.muted { color: ${muted}; }
  .content.small { font-size: 13px; }
  .cta-wrap { padding: 24px 32px; }
  .btn { display: inline-block; background: ${primary}; color: ${btnFg} !important; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; }
  .info-table { margin: 12px 24px; border: 1px solid ${border}; border-radius: 6px; overflow: hidden; }
  .info-table td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid ${border}; }
  .info-table tr:last-child td { border-bottom: none; }
  .info-label { color: ${muted}; width: 100px; background: #fafafa; }
  .info-val { color: ${text}; }
  .amount { color: ${primary}; font-size: 18px; font-weight: 700; }
  .coupon-wrap { padding: 16px 32px; }
  .coupon { display: inline-block; background: #fff7ed; border: 2px dashed ${primary}; color: ${primary}; padding: 12px 24px; border-radius: 6px; font-size: 16px; letter-spacing: 1px; }
  .divider { height: 1px; background: ${border}; margin: 8px 32px; }
  .footer { padding: 24px 32px; text-align: center; font-size: 12px; color: ${muted}; }
  .footer a { color: ${muted}; text-decoration: underline; }
  .copy-hint { display: none; }

  @media only screen and (max-width: 620px) {
    .email-body { width: 100% !important; max-width: 100% !important; border-radius: 0; }
    .title { font-size: 20px !important; padding: 12px 20px 8px !important; }
    .content { padding: 8px 20px !important; font-size: 14px !important; }
    .cta-wrap { padding: 20px !important; }
    .info-table { margin: 12px 16px !important; }
    .footer { padding: 20px !important; }
  }
</style>
</head>
<body>
<span class="preheader">${emailEscapeHtml(preheader)}</span>
<table role="presentation" class="email-wrap" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td align="center">
      <table role="presentation" class="email-body" cellspacing="0" cellpadding="0" border="0" width="600">
        ${logoBlock}
        ${opts.body}
        <tr><td><div class="divider"></div></td></tr>
        <tr><td class="footer">
          ${emailEscapeHtml(theme.footerText)}<br>
          © ${new Date().getFullYear()} ${emailEscapeHtml(theme.companyName)} · <a href="${escapeAttr(theme.unsubscribeUrl)}">取消订阅</a>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function emailParseCss(cssText) {
    const rules = {};
    cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = cssText.split('}');
    blocks.forEach(block => {
        const idx = block.indexOf('{');
        if (idx < 0) return;
        const selector = block.substring(0, idx).trim();
        const body = block.substring(idx + 1).trim();
        if (!selector || !body) return;
        const decls = {};
        body.split(';').forEach(d => {
            const ci = d.indexOf(':');
            if (ci > 0) {
                const prop = d.substring(0, ci).trim().toLowerCase();
                const val = d.substring(ci + 1).trim();
                if (prop && val) decls[prop] = val;
            }
        });
        if (Object.keys(decls).length) rules[selector] = decls;
    });
    return rules;
}

function emailExtractMediaRules(cssText) {
    const medias = [];
    const re = /@media[^{]+{/g;
    let match;
    while ((match = re.exec(cssText)) !== null) {
        let depth = 1;
        const start = match.index;
        let pos = match.index + match[0].length;
        while (depth > 0 && pos < cssText.length) {
            if (cssText[pos] === '{') depth++;
            else if (cssText[pos] === '}') depth--;
            pos++;
        }
        const full = cssText.substring(start, pos);
        const body = full.substring(match[0].length, full.length - 1).trim();
        medias.push({full, body});
    }
    return medias;
}

function emailInlineCss(html) {
    const styleBlocks = [];
    const mediaBlocks = [];
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, body) => {
        const medias = emailExtractMediaRules(body);
        medias.forEach(x => {
            mediaBlocks.push(x.full);
            body = body.replace(x.full, '');
        });
        styleBlocks.push(body);
        return '';
    });

    const rules = emailParseCss(styleBlocks.join('\n'));

    html = html.replace(/<(\w+)([^>]*)>/g, (match, tag, attrs) => {
        if (['br', 'hr', 'img', 'meta', 'link', 'title', 'span'].indexOf(tag.toLowerCase()) >= 0 && tag.toLowerCase() === 'span') {
        }
        const classMatch = attrs.match(/class\s*=\s*"([^"]*)"/i);
        const idMatch = attrs.match(/id\s*=\s*"([^"]*)"/i);
        const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
        const inline = {};
        if (styleMatch) {
            styleMatch[1].split(';').forEach(d => {
                const ci = d.indexOf(':');
                if (ci > 0) inline[d.substring(0, ci).trim().toLowerCase()] = d.substring(ci + 1).trim();
            });
        }
        const apply = (sel) => {
            if (rules[sel]) Object.assign(inline, rules[sel]);
        };
        apply(tag.toLowerCase());
        if (idMatch) idMatch[1].split(/\s+/).forEach(id => apply('#' + id));
        if (classMatch) {
            const classes = classMatch[1].split(/\s+/);
            classes.forEach(c => apply('.' + c));
            if (classes.length > 1) {
                for (let i = 0; i < classes.length; i++) {
                    let combined = '.' + classes[i];
                    for (let j = i + 1; j < classes.length; j++) {
                        combined += '.' + classes[j];
                        apply(combined);
                    }
                }
            }
        }
        const styleStr = Object.keys(inline).map(k => k + ':' + inline[k]).join(';');
        let newAttrs = attrs;
        if (classMatch) newAttrs = newAttrs.replace(classMatch[0], '');
        if (styleMatch) newAttrs = newAttrs.replace(styleMatch[0], '');
        newAttrs = (newAttrs + (newAttrs.endsWith(' ') || !newAttrs ? '' : ' ') + (styleStr ? 'style="' + styleStr + '"' : '')).trim();
        return '<' + tag + (newAttrs ? ' ' + newAttrs : '') + '>';
    });

    if (mediaBlocks.length) {
        html = html.replace('</head>', '<style>' + mediaBlocks.join('\n') + '</style></head>');
    }
    return html;
}

function emailResolveVars(template, vars) {
    let html = template;
    Object.keys(vars).forEach(k => {
        const re = new RegExp('\\{\\{\\s*' + k + '\\s*\\}\\}', 'g');
        html = html.replace(re, vars[k] == null ? '' : vars[k]);
    });
    html = html.replace(/\{\{\s*\w+\s*\}\}/g, '');
    return html;
}

function emailCurrentTheme() {
    return {
        primaryColor: document.getElementById('emailPrimary').value || DEFAULT_THEME.primaryColor,
        bgColor: document.getElementById('emailBg').value || DEFAULT_THEME.bgColor,
        cardColor: document.getElementById('emailCard').value || DEFAULT_THEME.cardColor,
        textColor: document.getElementById('emailText').value || DEFAULT_THEME.textColor,
        mutedColor: document.getElementById('emailMuted').value || DEFAULT_THEME.mutedColor,
        borderColor: document.getElementById('emailBorder').value || DEFAULT_THEME.borderColor,
        btnTextColor: document.getElementById('emailBtnText').value || DEFAULT_THEME.btnTextColor,
        footerText: document.getElementById('emailFooterText').value || DEFAULT_THEME.footerText,
        companyName: document.getElementById('emailCompany').value || DEFAULT_THEME.companyName,
        unsubscribeUrl: document.getElementById('emailUnsub').value || DEFAULT_THEME.unsubscribeUrl,
        logoUrl: document.getElementById('emailLogo').value || ''
    };
}

function emailCurrentVars() {
    const tpl = EMAIL_TEMPLATES[document.getElementById('emailTpl').value];
    const vars = {};
    tpl.fields.forEach(f => {
        const el = document.getElementById('emailVar_' + f.key);
        vars[f.key] = el ? el.value : '';
    });
    return vars;
}

function emailRender() {
    const tplId = document.getElementById('emailTpl').value;
    const tpl = EMAIL_TEMPLATES[tplId];
    const theme = emailCurrentTheme();
    const vars = emailCurrentVars();
    const html = tpl.build(vars, theme);
    const sourceEl = document.getElementById('emailSource');
    if (sourceEl) {
        sourceEl.textContent = html;
        document.getElementById('emailSize').textContent = formatBytes(html.length);
    }
    const preview = document.getElementById('emailPreview');
    const mobile = document.getElementById('emailMobile').checked;
    preview.style.width = mobile ? '375px' : '100%';
    preview.srcdoc = html;
}

function emailRenderInlined() {
    const tplId = document.getElementById('emailTpl').value;
    const tpl = EMAIL_TEMPLATES[tplId];
    const theme = emailCurrentTheme();
    const vars = emailCurrentVars();
    const html = tpl.build(vars, theme);
    const inlined = emailInlineCss(html);
    const sourceEl = document.getElementById('emailSource');
    sourceEl.textContent = inlined;
    document.getElementById('emailSize').textContent = formatBytes(inlined.length);
    document.getElementById('emailPreview').srcdoc = inlined;
}

function emailCopySource() {
    const text = document.getElementById('emailSource').textContent;
    safeCopy(text, '已复制 HTML (' + formatBytes(text.length) + ')');
}

function emailCopyInlined() {
    const tplId = document.getElementById('emailTpl').value;
    const tpl = EMAIL_TEMPLATES[tplId];
    const theme = emailCurrentTheme();
    const vars = emailCurrentVars();
    const html = tpl.build(vars, theme);
    const inlined = emailInlineCss(html);
    safeCopy(inlined, '已复制内联 CSS 的 HTML (' + formatBytes(inlined.length) + ')');
}

function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function emailLoadTemplate() {
    const tplId = document.getElementById('emailTpl').value;
    const tpl = EMAIL_TEMPLATES[tplId];
    const container = document.getElementById('emailVars');
    container.innerHTML = '';
    tpl.fields.forEach(f => {
        const div = document.createElement('div');
        div.className = 'mb-8';
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = f.label;
        div.appendChild(label);
        let input;
        if (f.type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
            input.style.minHeight = '60px';
        } else {
            input = document.createElement('input');
            input.type = 'text';
        }
        input.id = 'emailVar_' + f.key;
        input.placeholder = f.placeholder || '';
        input.value = f.default || '';
        div.appendChild(input);
        container.appendChild(div);
    });
    emailRender();
}

function emailInit() {
    const sel = document.getElementById('emailTpl');
    if (!sel) return;
    if (!sel.options.length) {
        Object.keys(EMAIL_TEMPLATES).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = EMAIL_TEMPLATES[id].icon + ' ' + EMAIL_TEMPLATES[id].name;
            sel.appendChild(opt);
        });
    }
    if (!sel.value) sel.value = 'welcome';
    emailLoadTemplate();
}
