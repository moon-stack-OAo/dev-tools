var LOREM_EN_WORDS = [
    'lorem',
    'ipsum',
    'dolor',
    'sit',
    'amet',
    'consectetur',
    'adipiscing',
    'elit',
    'sed',
    'do',
    'eiusmod',
    'tempor',
    'incididunt',
    'ut',
    'labore',
    'et',
    'dolore',
    'magna',
    'aliqua',
    'enim',
    'ad',
    'minim',
    'veniam',
    'quis',
    'nostrud',
    'exercitation',
    'ullamco',
    'laboris',
    'nisi',
    'aliquip',
    'ex',
    'ea',
    'commodo',
    'consequat',
    'duis',
    'aute',
    'irure',
    'in',
    'reprehenderit',
    'voluptate',
    'velit',
    'esse',
    'cillum',
    'fugiat',
    'nulla',
    'pariatur',
    'excepteur',
    'sint',
    'occaecat',
    'cupidatat',
    'non',
    'proident',
    'sunt',
    'culpa',
    'qui',
    'officia',
    'deserunt',
    'mollit',
    'anim',
    'id',
    'est',
    'laborum',
    'curabitur',
    'pretium',
    'tincidunt',
    'lacus',
    'suspendisse',
    'potenti',
    'nullam',
    'porta',
    'diam',
    'eu',
    'urna',
    'praesent',
    'elementum',
    'facilisis',
    'leo',
    'vel',
    'fringilla',
    'est',
    'ullamcorper',
    'eget',
    'nulla',
    'facilisi',
    'etiam',
    'dignissim',
    'diam',
    'quis',
    'enim',
    'lobortis',
    'scelerisque',
    'fermentum',
    'dui',
    'faucibus',
    'in',
    'ornare',
    'quam',
    'viverra',
    'orci',
    'sagittis',
    'eu',
    'volutpat',
    'odio',
    'facilisis',
    'mauris',
    'sit',
    'amet',
    'massa',
    'vitae',
    'tortor',
    'condimentum',
    'lacinia',
    'quis',
    'vel',
    'eros',
    'donec',
    'ac',
    'odio',
    'tempor',
    'orci',
    'dapibus',
    'ultrices',
    'in',
    'iaculis',
    'nunc',
    'sed',
    'augue',
    'lacus',
];

var LOREM_ZH_SENTENCES = [
    '这是一段用于界面布局调试的中文占位文本。',
    '在真实内容尚未就绪时，可用假文快速验证排版效果。',
    '段落长度应尽量接近真实业务文案，以便评估换行与留白。',
    '前端开发中常需要中英文混排场景，以检查字体与行高。',
    '请根据实际页面宽度调整段落数量与每段句数。',
    '占位文字不应包含敏感信息，仅用于视觉与交互验证。',
    '合理的假文能帮助产品与设计更快对齐信息层级。',
    '如果需要更长内容，可增加段落数或每段句子数。',
    '中文假文通常以完整句子为单位，读起来更自然。',
    '开发者工具箱中的 Lorem 生成器可一键复制输出。',
    '注意在窄屏设备上检查文字截断与溢出表现。',
    '标题、正文与说明文字可使用不同长度的占位内容。',
    '列表、卡片与表格单元格也适合使用短句假文。',
    '生成结果可直接粘贴到原型或静态页面中预览。',
    '保持语句通顺有助于评审时不被乱码分散注意力。',
];

function loremRandInt(min, max, rng) {
    var r = typeof rng === 'function' ? rng() : Math.random();
    if (!isFinite(r) || r < 0) r = 0;
    if (r >= 1) r = 0.999999;
    return Math.floor(r * (max - min + 1)) + min;
}

function loremPick(arr, rng) {
    if (!arr || !arr.length) return '';
    return arr[loremRandInt(0, arr.length - 1, rng)];
}

/**
 * 从词库取词（可注入 rng）
 * @param {string[]} words
 * @param {number} count
 * @param {function} [rng]
 * @returns {string[]}
 */
function loremPickWords(words, count, rng) {
    var n = Math.max(0, Math.floor(Number(count) || 0));
    var src = words && words.length ? words : LOREM_EN_WORDS;
    var out = [];
    for (var i = 0; i < n; i++) {
        out.push(loremPick(src, rng));
    }
    return out;
}

function loremCapitalize(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function loremEnSentence(wordCount, rng) {
    var n = wordCount != null && isFinite(Number(wordCount)) ? Math.max(3, Math.floor(Number(wordCount))) : loremRandInt(6, 14, rng);
    var words = loremPickWords(LOREM_EN_WORDS, n, rng);
    if (!words.length) return '';
    words[0] = loremCapitalize(words[0]);
    return words.join(' ') + '.';
}

function loremZhSentence(rng) {
    return loremPick(LOREM_ZH_SENTENCES, rng);
}

/**
 * 生成假文
 * @param {object} opts
 * @param {string} [opts.lang] 'en' | 'zh'
 * @param {number} [opts.paragraphs]
 * @param {number} [opts.sentences]
 * @param {number} [opts.wordsPerSentence] 英文每句词数（可选）
 * @param {function} [opts.rng]
 * @returns {string}
 */
function loremGenerate(opts) {
    var o = opts || {};
    var lang = String(o.lang || 'en').toLowerCase() === 'zh' ? 'zh' : 'en';
    var paragraphs = o.paragraphs != null && isFinite(Number(o.paragraphs)) ? Math.floor(Number(o.paragraphs)) : 3;
    var sentences = o.sentences != null && isFinite(Number(o.sentences)) ? Math.floor(Number(o.sentences)) : 4;
    var wps = o.wordsPerSentence != null && isFinite(Number(o.wordsPerSentence)) ? Math.floor(Number(o.wordsPerSentence)) : null;
    var rng = typeof o.rng === 'function' ? o.rng : null;

    paragraphs = Math.max(1, Math.min(50, paragraphs));
    sentences = Math.max(1, Math.min(40, sentences));

    var paras = [];
    for (var p = 0; p < paragraphs; p++) {
        var sents = [];
        for (var s = 0; s < sentences; s++) {
            if (lang === 'zh') {
                sents.push(loremZhSentence(rng));
            } else {
                sents.push(loremEnSentence(wps, rng));
            }
        }
        paras.push(sents.join(lang === 'zh' ? '' : ' '));
    }
    return paras.join('\n\n');
}

/**
 * 解析颜色为 #rrggbb
 * @param {string} color
 * @returns {string|null}
 */
function loremParseHexColor(color) {
    if (color == null) return null;
    var s = String(color).trim();
    if (!s) return null;
    if (s[0] === '#') {
        var hex = s.slice(1);
        if (hex.length === 3) {
            hex = hex
                .split('')
                .map(function (c) {
                    return c + c;
                })
                .join('');
        }
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return '#' + hex.toLowerCase();
    }
    var m = s.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i);
    if (m) {
        var r = Math.max(0, Math.min(255, Math.round(Number(m[1]))));
        var g = Math.max(0, Math.min(255, Math.round(Number(m[2]))));
        var b = Math.max(0, Math.min(255, Math.round(Number(m[3]))));
        var h = function (n) {
            return ('0' + n.toString(16)).slice(-2);
        };
        return '#' + h(r) + h(g) + h(b);
    }
    return null;
}

/**
 * 生成纯色占位图 data URL（需 canvas）
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {string} [opts.bg]
 * @param {string} [opts.fg]
 * @param {string} [opts.text]
 * @param {HTMLCanvasElement} [opts.canvas]
 * @returns {{ ok: boolean, dataUrl?: string, msg?: string }}
 */
function loremPlaceholderDataUrl(opts) {
    var o = opts || {};
    var w = Math.floor(Number(o.width));
    var h = Math.floor(Number(o.height));
    if (!isFinite(w) || w < 1 || !isFinite(h) || h < 1) {
        return { ok: false, msg: '宽高必须为正整数' };
    }
    w = Math.min(4000, w);
    h = Math.min(4000, h);

    var bg = loremParseHexColor(o.bg) || '#cccccc';
    var fg = loremParseHexColor(o.fg) || '#333333';
    var text = o.text != null ? String(o.text) : w + '×' + h;

    var canvas = o.canvas || null;
    if (!canvas) {
        if (typeof document === 'undefined' || !document.createElement) {
            return { ok: false, msg: '当前环境不支持 Canvas' };
        }
        canvas = document.createElement('canvas');
    }
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) {
        return { ok: false, msg: '当前环境不支持 Canvas' };
    }

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (text) {
        var fontSize = Math.max(10, Math.min(w, h) / 8);
        ctx.fillStyle = fg;
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2, w * 0.9);
    }

    try {
        return { ok: true, dataUrl: canvas.toDataURL('image/png') };
    } catch (e) {
        return { ok: false, msg: '生成失败：' + (e && e.message ? e.message : String(e)) };
    }
}

function loremSwitchTab(tab) {
    var textPanel = document.getElementById('lrTabText');
    var imgPanel = document.getElementById('lrTabImg');
    var btnText = document.getElementById('lrBtnText');
    var btnImg = document.getElementById('lrBtnImg');
    var isText = tab !== 'img';
    if (textPanel) textPanel.style.display = isText ? '' : 'none';
    if (imgPanel) imgPanel.style.display = isText ? 'none' : '';
    if (btnText) {
        btnText.className = isText ? 'sm' : 'sm outline';
    }
    if (btnImg) {
        btnImg.className = isText ? 'sm outline' : 'sm';
    }
}

function loremGenerateUI() {
    var langEl = document.getElementById('lrLang');
    var paraEl = document.getElementById('lrParagraphs');
    var sentEl = document.getElementById('lrSentences');
    var out = document.getElementById('lrOutput');
    if (!out) return;

    var lang = langEl ? langEl.value : 'en';
    var paragraphs = paraEl ? Number(paraEl.value) : 3;
    var sentences = sentEl ? Number(sentEl.value) : 4;
    var text = loremGenerate({ lang: lang, paragraphs: paragraphs, sentences: sentences });
    out.value = text;
    if (typeof setStatus === 'function') setStatus('已生成假文');
}

function loremCopyText() {
    var out = document.getElementById('lrOutput');
    if (!out) return;
    if (typeof copyText === 'function') {
        copyText('lrOutput');
    } else if (typeof safeCopy === 'function') {
        safeCopy(out.value);
    }
}

function loremGenPlaceholder() {
    var wEl = document.getElementById('lrWidth');
    var hEl = document.getElementById('lrHeight');
    var bgEl = document.getElementById('lrBg');
    var fgEl = document.getElementById('lrFg');
    var textEl = document.getElementById('lrPhText');
    var imgEl = document.getElementById('lrPhImg');
    var urlEl = document.getElementById('lrPhUrl');
    if (!imgEl) return;

    var r = loremPlaceholderDataUrl({
        width: wEl ? Number(wEl.value) : 320,
        height: hEl ? Number(hEl.value) : 180,
        bg: bgEl ? bgEl.value : '#cccccc',
        fg: fgEl ? fgEl.value : '#333333',
        text: textEl ? textEl.value : '',
    });

    if (!r.ok) {
        imgEl.removeAttribute('src');
        imgEl.alt = r.msg || '生成失败';
        if (urlEl) urlEl.value = '';
        if (typeof setStatus === 'function') setStatus(r.msg || '生成失败');
        if (typeof toast === 'function') toast(r.msg || '生成失败', 'error');
        return;
    }

    imgEl.src = r.dataUrl;
    imgEl.alt = '占位图';
    if (urlEl) urlEl.value = r.dataUrl;
    if (typeof setStatus === 'function') setStatus('占位图已生成');
}

function loremDownloadPlaceholder() {
    var urlEl = document.getElementById('lrPhUrl');
    var dataUrl = urlEl ? urlEl.value : '';
    if (!dataUrl) {
        loremGenPlaceholder();
        urlEl = document.getElementById('lrPhUrl');
        dataUrl = urlEl ? urlEl.value : '';
    }
    if (!dataUrl) return;

    var wEl = document.getElementById('lrWidth');
    var hEl = document.getElementById('lrHeight');
    var w = wEl ? wEl.value : 'w';
    var h = hEl ? hEl.value : 'h';
    var name = 'placeholder-' + w + 'x' + h + '.png';

    if (typeof downloadBlob === 'function') {
        try {
            var bin = atob(dataUrl.split(',')[1] || '');
            var arr = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            downloadBlob(new Blob([arr], { type: 'image/png' }), name);
            return;
        } catch (e) {
            // fallback
        }
    }
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
}

function loremClear() {
    var out = document.getElementById('lrOutput');
    if (out) out.value = '';
    var imgEl = document.getElementById('lrPhImg');
    if (imgEl) {
        imgEl.removeAttribute('src');
        imgEl.alt = '尚未生成';
    }
    var urlEl = document.getElementById('lrPhUrl');
    if (urlEl) urlEl.value = '';
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof registerInit === 'function') {
    registerInit('lorem', function () {
        loremSwitchTab('text');
        loremGenerateUI();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loremGenerate: loremGenerate,
        loremPickWords: loremPickWords,
        loremParseHexColor: loremParseHexColor,
        loremPlaceholderDataUrl: loremPlaceholderDataUrl,
        LOREM_EN_WORDS: LOREM_EN_WORDS,
        LOREM_ZH_SENTENCES: LOREM_ZH_SENTENCES,
    };
}
