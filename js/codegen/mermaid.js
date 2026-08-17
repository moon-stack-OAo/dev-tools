// Mermaid 在线编辑器：源码实时预览 / SVG·PNG 导出

const MERMAID_OPEN_KEY = 'devtools.mermaid.openSource';

const mermaidSampleTypes = ['flowchart', 'sequence', 'class', 'er', 'gantt', 'pie'];

const MERMAID_SAMPLES = {
    flowchart: [
        'flowchart TD',
        '    A[开始] --> B{条件?}',
        '    B -->|是| C[处理]',
        '    B -->|否| D[结束]',
        '    C --> D',
    ].join('\n'),
    sequence: [
        'sequenceDiagram',
        '    participant C as 客户端',
        '    participant S as 服务端',
        '    C->>S: 请求',
        '    S-->>C: 响应',
    ].join('\n'),
    class: [
        'classDiagram',
        '    class Animal {',
        '        +String name',
        '        +speak()',
        '    }',
        '    class Dog {',
        '        +String breed',
        '        +bark()',
        '    }',
        '    Animal <|-- Dog',
    ].join('\n'),
    er: [
        'erDiagram',
        '    USERS ||--o{ ORDERS : places',
        '    USERS {',
        '        bigint id PK',
        '        string name',
        '        string email',
        '    }',
        '    ORDERS {',
        '        bigint id PK',
        '        bigint user_id FK',
        '        decimal amount',
        '    }',
    ].join('\n'),
    gantt: [
        'gantt',
        '    title 项目计划',
        '    dateFormat  YYYY-MM-DD',
        '    section 阶段一',
        '    需求分析    :a1, 2026-01-01, 7d',
        '    设计        :a2, after a1, 5d',
        '    section 阶段二',
        '    开发        :b1, after a2, 14d',
        '    测试        :b2, after b1, 7d',
    ].join('\n'),
    pie: [
        'pie title 技术栈占比',
        '    "前端" : 35',
        '    "后端" : 40',
        '    "运维" : 15',
        '    "其他" : 10',
    ].join('\n'),
};

/**
 * @param {boolean} isLight
 * @returns {'default'|'dark'}
 */
function mermaidDefaultTheme(isLight) {
    return isLight ? 'default' : 'dark';
}

/**
 * @param {string} type
 * @returns {string}
 */
function mermaidSampleByType(type) {
    const key = String(type || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(MERMAID_SAMPLES, key)) {
        return MERMAID_SAMPLES[key];
    }
    return MERMAID_SAMPLES.flowchart;
}

/**
 * @param {string} source
 * @returns {boolean}
 */
function mermaidIsEmptySource(source) {
    return !source || !String(source).trim();
}

// ========== UI ==========

let _mmdDebounced = null;
let _mmdRenderSeq = 0;
let _mmdLastSvg = '';
let _mmdInitedApi = false;

function mmdIsLightTheme() {
    try {
        return document.documentElement.getAttribute('data-theme') === 'light';
    } catch (e) {
        return false;
    }
}

function mmdSetStatus(text, isErr) {
    const el = document.getElementById('mmdStatus');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isErr ? 'var(--danger)' : 'var(--text-dim)';
}

function mmdSetError(msg) {
    const box = document.getElementById('mmdError');
    if (!box) return;
    if (!msg) {
        box.style.display = 'none';
        box.textContent = '';
        return;
    }
    box.style.display = 'block';
    box.textContent = msg;
}

function mmdEnsureInit() {
    if (typeof mermaid === 'undefined' || !mermaid || typeof mermaid.initialize !== 'function') {
        throw new Error('Mermaid 库未加载');
    }
    const theme = mermaidDefaultTheme(mmdIsLightTheme());
    mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme,
    });
    _mmdInitedApi = true;
}

function mmdGetSource() {
    const el = document.getElementById('mmdSource');
    return el ? el.value : '';
}

function mmdSetSource(text) {
    const el = document.getElementById('mmdSource');
    if (el) el.value = text == null ? '' : String(text);
}

function mmdShowPlaceholder(html) {
    const preview = document.getElementById('mmdPreview');
    if (!preview) return;
    preview.innerHTML =
        '<div class="mmd-placeholder">' +
        (html || '<i class="bi bi-diagram-3"></i><div>请输入 Mermaid 源码后点击运行</div>') +
        '</div>';
}

async function mmdRender() {
    const source = mmdGetSource();
    const preview = document.getElementById('mmdPreview');
    if (!preview) return;

    if (mermaidIsEmptySource(source)) {
        _mmdLastSvg = '';
        mmdSetError('');
        mmdShowPlaceholder();
        mmdSetStatus('源码为空');
        return;
    }

    const seq = ++_mmdRenderSeq;
    mmdSetStatus('渲染中…');
    mmdSetError('');

    try {
        mmdEnsureInit();
        const id = 'mmd-' + Date.now() + '-' + seq;
        const result = await mermaid.render(id, source);
        if (seq !== _mmdRenderSeq) return;
        const svg = typeof result === 'string' ? result : result && result.svg ? result.svg : '';
        if (!svg) {
            throw new Error('渲染结果为空');
        }
        _mmdLastSvg = svg;
        preview.innerHTML = svg;
        const svgEl = preview.querySelector('svg');
        if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
        }
        mmdSetError('');
        mmdSetStatus('渲染成功');
    } catch (e) {
        if (seq !== _mmdRenderSeq) return;
        _mmdLastSvg = '';
        const msg = (e && e.message) || String(e);
        mmdSetError(msg);
        mmdShowPlaceholder(
            '<i class="bi bi-exclamation-triangle"></i><div>渲染失败，请检查语法</div>'
        );
        mmdSetStatus('渲染失败', true);
    }
}

function mmdOnSourceInput() {
    const auto = document.getElementById('mmdAuto');
    if (!auto || !auto.checked) return;
    if (_mmdDebounced) _mmdDebounced();
}

function mmdLoadSample() {
    const sel = document.getElementById('mmdSample');
    const type = sel ? sel.value : 'flowchart';
    mmdSetSource(mermaidSampleByType(type));
    mmdRender();
    setStatus('已加载 ' + type + ' 示例');
}

function mmdCopySource() {
    const source = mmdGetSource();
    if (mermaidIsEmptySource(source)) {
        toast('源码为空', 'error');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(source, '源码已复制');
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(source).then(
            function () {
                toast('源码已复制');
            },
            function () {
                toast('复制失败', 'error');
            }
        );
    }
}

function mmdDownloadSvg() {
    if (!_mmdLastSvg) {
        toast('请先成功渲染后再导出', 'error');
        return;
    }
    const blob = new Blob([_mmdLastSvg], { type: 'image/svg+xml;charset=utf-8' });
    if (typeof downloadBlob === 'function') {
        downloadBlob('mermaid.svg', blob);
        setStatus('已下载 SVG');
    } else {
        toast('downloadBlob 不可用', 'error');
    }
}

function mmdDownloadPng() {
    if (!_mmdLastSvg) {
        toast('请先成功渲染后再导出', 'error');
        return;
    }
    const svg = _mmdLastSvg;
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = function () {
        try {
            let w = img.naturalWidth || img.width || 800;
            let h = img.naturalHeight || img.height || 600;
            if (!w || !h) {
                w = 800;
                h = 600;
            }
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(w * scale));
            canvas.height = Math.max(1, Math.round(h * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                toast('Canvas 不可用', 'error');
                URL.revokeObjectURL(url);
                return;
            }
            const isLight = mmdIsLightTheme();
            ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                function (pngBlob) {
                    URL.revokeObjectURL(url);
                    if (!pngBlob) {
                        toast('PNG 导出失败', 'error');
                        return;
                    }
                    if (typeof downloadBlob === 'function') {
                        downloadBlob('mermaid.png', pngBlob);
                        setStatus('已下载 PNG');
                    }
                },
                'image/png'
            );
        } catch (e) {
            URL.revokeObjectURL(url);
            toast('PNG 导出失败: ' + ((e && e.message) || String(e)), 'error');
        }
    };
    img.onerror = function () {
        URL.revokeObjectURL(url);
        toast('SVG 转图片失败', 'error');
    };
    img.src = url;
}

function mmdReadOpenSource() {
    try {
        const raw = sessionStorage.getItem(MERMAID_OPEN_KEY);
        if (raw == null || raw === '') return null;
        sessionStorage.removeItem(MERMAID_OPEN_KEY);
        return raw;
    } catch (e) {
        return null;
    }
}

/** 读取 sessionStorage 中的外部源码并渲染（可被 ddlmermaid 二次打开时调用） */
function mmdApplyOpenSource() {
    const external = mmdReadOpenSource();
    if (external == null || !String(external).trim()) return false;
    mmdSetSource(external);
    mmdRender();
    return true;
}

function mmdInit() {
    const src = document.getElementById('mmdSource');
    const sample = document.getElementById('mmdSample');
    if (sample && !sample.options.length) {
        mermaidSampleTypes.forEach(function (t) {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            sample.appendChild(opt);
        });
    }

    if (typeof debounce === 'function') {
        _mmdDebounced = debounce(mmdRender, 350);
    } else {
        let timer = null;
        _mmdDebounced = function () {
            if (timer) clearTimeout(timer);
            timer = setTimeout(mmdRender, 350);
        };
    }

    if (src) {
        src.addEventListener('input', mmdOnSourceInput);
        src.addEventListener('change', mmdOnSourceInput);
    }

    if (!mmdApplyOpenSource()) {
        if (src && !src.value.trim()) {
            mmdSetSource(mermaidSampleByType('flowchart'));
            if (sample) sample.value = 'flowchart';
        }
        mmdSetStatus('就绪（首次加载库可能较慢）');
        mmdRender();
    } else {
        mmdSetStatus('已载入外部源码');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mermaidDefaultTheme: mermaidDefaultTheme,
        mermaidSampleByType: mermaidSampleByType,
        mermaidSampleTypes: mermaidSampleTypes,
        mermaidIsEmptySource: mermaidIsEmptySource,
    };
}

if (typeof registerInit !== 'undefined') {
    registerInit('mermaid', mmdInit);
}
