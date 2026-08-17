var fontpreviewObjectUrl = null;
var fontpreviewFamily = '';
var fontpreviewFace = null;

var FONTPREVIEW_SAMPLE_TEXTS = {
    zh: '永和九年，岁在癸丑。天地玄黄，宇宙洪荒。\n1234567890 ABCDEFG abcdefg\nThe quick brown fox jumps over the lazy dog.',
    en: 'The quick brown fox jumps over the lazy dog.\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 !@#$%^&*()_+-=[]{}',
    mix: '汉体书写信息技术标准相容\nThe quick brown fox jumps over the lazy dog.\n0123456789 AaBbCc 永字八法',
};

var FONTPREVIEW_SUPPORTED_EXT = ['.ttf', '.otf', '.woff', '.woff2'];

/**
 * 判断文件名扩展是否支持
 * @param {string} name
 * @returns {boolean}
 */
function fontpreviewIsSupportedExt(name) {
    if (name == null || name === '') return false;
    var lower = String(name).toLowerCase();
    for (var i = 0; i < FONTPREVIEW_SUPPORTED_EXT.length; i++) {
        if (lower.endsWith(FONTPREVIEW_SUPPORTED_EXT[i])) return true;
    }
    return false;
}

/**
 * 样本文本常量
 * @param {string} [key]
 * @returns {string|object}
 */
function fontpreviewSampleTexts(key) {
    if (key == null || key === '') return FONTPREVIEW_SAMPLE_TEXTS;
    return FONTPREVIEW_SAMPLE_TEXTS[key] || FONTPREVIEW_SAMPLE_TEXTS.mix;
}

function fontpreviewRevoke() {
    if (fontpreviewObjectUrl) {
        try {
            URL.revokeObjectURL(fontpreviewObjectUrl);
        } catch (e) {
            // ignore
        }
        fontpreviewObjectUrl = null;
    }
    if (fontpreviewFace && typeof document !== 'undefined' && document.fonts) {
        try {
            document.fonts.delete(fontpreviewFace);
        } catch (e) {
            // ignore
        }
    }
    fontpreviewFace = null;
    fontpreviewFamily = '';
}

function fontpreviewApplyStyle() {
    var preview = document.getElementById('fpPreview');
    if (!preview) return;

    var sizeEl = document.getElementById('fpSize');
    var weightEl = document.getElementById('fpWeight');
    var lhEl = document.getElementById('fpLineHeight');
    var textEl = document.getElementById('fpText');

    var size = sizeEl ? Number(sizeEl.value) : 24;
    var weight = weightEl ? weightEl.value : '400';
    var lh = lhEl ? Number(lhEl.value) : 1.5;
    var text = textEl ? textEl.value : fontpreviewSampleTexts('mix');

    if (!isFinite(size) || size < 8) size = 8;
    if (size > 200) size = 200;
    if (!isFinite(lh) || lh < 0.8) lh = 0.8;
    if (lh > 3) lh = 3;

    preview.style.fontSize = size + 'px';
    preview.style.fontWeight = weight;
    preview.style.lineHeight = String(lh);
    preview.style.fontFamily = fontpreviewFamily
        ? '"' + fontpreviewFamily + '", system-ui, sans-serif'
        : 'system-ui, sans-serif';
    preview.textContent = text;

    var sizeLabel = document.getElementById('fpSizeVal');
    var lhLabel = document.getElementById('fpLhVal');
    if (sizeLabel) sizeLabel.textContent = size + 'px';
    if (lhLabel) lhLabel.textContent = String(lh);
}

function fontpreviewOnFile(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;

    if (!fontpreviewIsSupportedExt(file.name)) {
        if (typeof toast === 'function') {
            toast('请上传 ttf / otf / woff / woff2 字体文件', 'error');
        }
        if (typeof setStatus === 'function') setStatus('不支持的字体格式');
        return;
    }

    if (typeof FontFace === 'undefined') {
        if (typeof toast === 'function') toast('当前浏览器不支持 FontFace', 'error');
        return;
    }

    fontpreviewRevoke();
    fontpreviewObjectUrl = URL.createObjectURL(file);
    fontpreviewFamily = 'fp-font-' + Date.now();

    var face = new FontFace(fontpreviewFamily, 'url(' + fontpreviewObjectUrl + ')');
    fontpreviewFace = face;

    var nameEl = document.getElementById('fpFileName');
    if (nameEl) nameEl.textContent = file.name + ' (' + (typeof formatBytes === 'function' ? formatBytes(file.size) : file.size + ' B') + ')';

    face
        .load()
        .then(function (loaded) {
            if (document.fonts && document.fonts.add) {
                document.fonts.add(loaded);
            }
            fontpreviewFace = loaded;
            fontpreviewApplyStyle();
            if (typeof setStatus === 'function') setStatus('字体已加载：' + file.name);
            if (typeof toast === 'function') toast('字体加载成功');
        })
        .catch(function (err) {
            fontpreviewRevoke();
            if (nameEl) nameEl.textContent = '加载失败';
            if (typeof setStatus === 'function') setStatus('字体加载失败');
            if (typeof toast === 'function') {
                toast('字体加载失败：' + (err && err.message ? err.message : String(err)), 'error');
            }
            fontpreviewApplyStyle();
        });
}

function fontpreviewSetSample(key) {
    var textEl = document.getElementById('fpText');
    if (textEl) textEl.value = fontpreviewSampleTexts(key || 'mix');
    fontpreviewApplyStyle();
}

function fontpreviewReset() {
    var input = document.getElementById('fpFile');
    if (input) input.value = '';
    var nameEl = document.getElementById('fpFileName');
    if (nameEl) nameEl.textContent = '未选择字体';
    var sizeEl = document.getElementById('fpSize');
    var weightEl = document.getElementById('fpWeight');
    var lhEl = document.getElementById('fpLineHeight');
    var textEl = document.getElementById('fpText');
    if (sizeEl) sizeEl.value = '24';
    if (weightEl) weightEl.value = '400';
    if (lhEl) lhEl.value = '1.5';
    if (textEl) textEl.value = fontpreviewSampleTexts('mix');
    fontpreviewRevoke();
    fontpreviewApplyStyle();
    if (typeof setStatus === 'function') setStatus('已重置');
}

if (typeof registerInit === 'function') {
    registerInit('fontpreview', function () {
        var textEl = document.getElementById('fpText');
        if (textEl && !String(textEl.value).trim()) {
            textEl.value = fontpreviewSampleTexts('mix');
        }
        fontpreviewApplyStyle();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fontpreviewIsSupportedExt: fontpreviewIsSupportedExt,
        fontpreviewSampleTexts: fontpreviewSampleTexts,
        FONTPREVIEW_SAMPLE_TEXTS: FONTPREVIEW_SAMPLE_TEXTS,
        FONTPREVIEW_SUPPORTED_EXT: FONTPREVIEW_SUPPORTED_EXT,
    };
}
