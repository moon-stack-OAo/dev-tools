// JSON → TypeScript interface / type
// 复用 json2code 的 jsonToCode / J2C_SAMPLE（由 toolScriptDeps 先加载）

function j2tsGetRootName() {
    const el = document.getElementById('j2tsRoot');
    return el ? el.value.trim() : '';
}

function j2tsGetTsStyle() {
    const el = document.getElementById('j2tsStyle');
    return el ? el.value : 'interface';
}

function j2tsSetOutput(text, isError) {
    const out = document.getElementById('j2tsOutput');
    if (!out) return;
    out.textContent = text || '';
    if (isError) out.classList.add('error');
    else out.classList.remove('error');
}

function j2tsGenerate() {
    if (typeof jsonToCode !== 'function') {
        j2tsSetOutput('依赖未加载：请刷新页面后重试（json2code）', true);
        return;
    }
    const input = document.getElementById('j2tsInput');
    const text = input ? input.value : '';
    const r = jsonToCode(text, 'typescript', {
        rootName: j2tsGetRootName(),
        tsStyle: j2tsGetTsStyle(),
    });
    if (!r.ok) {
        j2tsSetOutput(r.error, true);
        return;
    }
    j2tsSetOutput(r.code, false);
}

function j2tsClear() {
    const input = document.getElementById('j2tsInput');
    if (input) input.value = '';
    j2tsSetOutput('', false);
}

function j2tsLoadSample() {
    const input = document.getElementById('j2tsInput');
    if (input) {
        input.value = typeof J2C_SAMPLE === 'string' ? J2C_SAMPLE : '';
    }
    j2tsGenerate();
}

function j2tsCopy() {
    if (typeof copyText === 'function') copyText('j2tsOutput');
}

function j2tsInit() {
    const root = document.getElementById('j2tsRoot');
    if (root) {
        root.addEventListener('input', function () {
            root.dataset.userEdited = '1';
        });
    }
    const tsStyle = document.getElementById('j2tsStyle');
    if (tsStyle) {
        tsStyle.addEventListener('change', function () {
            const input = document.getElementById('j2tsInput');
            if (input && input.value.trim()) j2tsGenerate();
        });
    }
}

if (typeof window !== 'undefined') {
    window.j2tsGenerate = j2tsGenerate;
    window.j2tsClear = j2tsClear;
    window.j2tsLoadSample = j2tsLoadSample;
    window.j2tsCopy = j2tsCopy;
}

if (typeof registerInit !== 'undefined') {
    registerInit('json2ts', j2tsInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        j2tsGetRootName,
        j2tsGetTsStyle,
    };
}
