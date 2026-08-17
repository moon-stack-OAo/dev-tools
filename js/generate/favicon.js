const faviconSizes = [16, 32, 48, 64, 180, 192, 512];

function faviconBuildHtmlLinks(map) {
    const m = map || {};
    const lines = [];
    const order = faviconSizes.slice();
    const keys = Object.keys(m)
        .map(Number)
        .filter(function (n) {
            return isFinite(n) && n > 0;
        })
        .sort(function (a, b) {
            return a - b;
        });
    const sizes = keys.length ? keys : order;
    sizes.forEach(function (size) {
        const href = m[size] != null ? String(m[size]) : 'favicon-' + size + 'x' + size + '.png';
        if (size === 180) {
            lines.push('<link rel="apple-touch-icon" sizes="180x180" href="' + href + '">');
        } else if (size === 192 || size === 512) {
            lines.push('<link rel="icon" type="image/png" sizes="' + size + 'x' + size + '" href="' + href + '">');
        } else {
            lines.push('<link rel="icon" type="image/png" sizes="' + size + 'x' + size + '" href="' + href + '">');
        }
    });
    if (!m[32] && !sizes.includes(32)) {
        lines.unshift('<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">');
    }
    return lines.join('\n');
}

function faviconSelectedSizes() {
    const box = document.getElementById('fviSizes');
    if (!box) return faviconSizes.slice();
    const checked = [];
    box.querySelectorAll('input[type="checkbox"][data-size]').forEach(function (el) {
        if (el.checked) {
            const n = Number(el.getAttribute('data-size'));
            if (isFinite(n) && n > 0) checked.push(n);
        }
    });
    return checked.length ? checked : faviconSizes.slice();
}

let _fviSource = null;
let _fviObjectUrl = null;
let _fviResults = {};

function faviconRevoke() {
    if (_fviObjectUrl) {
        URL.revokeObjectURL(_fviObjectUrl);
        _fviObjectUrl = null;
    }
    Object.keys(_fviResults).forEach(function (k) {
        const it = _fviResults[k];
        if (it && it.url) URL.revokeObjectURL(it.url);
    });
    _fviResults = {};
}

function faviconLoadFile(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        if (typeof toast === 'function') toast('请选择图片文件');
        return;
    }
    faviconRevoke();
    _fviSource = file;
    _fviObjectUrl = URL.createObjectURL(file);
    const img = document.getElementById('fviSourcePreview');
    if (img) {
        img.src = _fviObjectUrl;
        img.style.display = 'block';
    }
    const nameEl = document.getElementById('fviFileName');
    if (nameEl) {
        nameEl.textContent =
            file.name +
            (typeof formatBytes === 'function' ? ' · ' + formatBytes(file.size) : '');
    }
    faviconGenerate();
}

function faviconOnFileChange(e) {
    const files = e && e.target && e.target.files;
    if (files && files[0]) faviconLoadFile(files[0]);
    if (e && e.target) e.target.value = '';
}

function faviconScaleToBlob(img, size) {
    return new Promise(function (resolve, reject) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, size, size);
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            if (!iw || !ih) {
                reject(new Error('无法读取图片尺寸'));
                return;
            }
            const scale = Math.min(size / iw, size / ih);
            const dw = Math.round(iw * scale);
            const dh = Math.round(ih * scale);
            const dx = Math.floor((size - dw) / 2);
            const dy = Math.floor((size - dh) / 2);
            ctx.drawImage(img, dx, dy, dw, dh);
            canvas.toBlob(
                function (blob) {
                    if (!blob) {
                        reject(new Error('导出 PNG 失败'));
                        return;
                    }
                    resolve(blob);
                },
                'image/png',
            );
        } catch (err) {
            reject(err);
        }
    });
}

function faviconGenerate() {
    if (!_fviSource || !_fviObjectUrl) {
        if (typeof toast === 'function') toast('请先上传图片');
        return;
    }
    const sizes = faviconSelectedSizes();
    const img = new Image();
    img.onload = function () {
        Object.keys(_fviResults).forEach(function (k) {
            const it = _fviResults[k];
            if (it && it.url) URL.revokeObjectURL(it.url);
        });
        _fviResults = {};
        const tasks = sizes.map(function (size) {
            return faviconScaleToBlob(img, size).then(function (blob) {
                const url = URL.createObjectURL(blob);
                _fviResults[size] = { blob: blob, url: url, size: size };
            });
        });
        Promise.all(tasks)
            .then(function () {
                faviconRenderGrid();
                faviconRenderHtml();
                if (typeof setStatus === 'function') setStatus('已生成 ' + sizes.length + ' 个尺寸');
            })
            .catch(function (err) {
                if (typeof toast === 'function') toast('生成失败: ' + (err && err.message ? err.message : err));
            });
    };
    img.onerror = function () {
        if (typeof toast === 'function') toast('图片加载失败');
    };
    img.src = _fviObjectUrl;
}

function faviconRenderGrid() {
    const grid = document.getElementById('fviGrid');
    if (!grid) return;
    const sizes = Object.keys(_fviResults)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });
    if (!sizes.length) {
        grid.innerHTML = '<span style="color:var(--text-dim)">上传图片后生成预览</span>';
        return;
    }
    const parts = [];
    sizes.forEach(function (size) {
        const it = _fviResults[size];
        parts.push(
            '<div class="fvi-card">' +
                '<img src="' +
                escapeHtml(it.url) +
                '" width="' +
                size +
                '" height="' +
                size +
                '" alt="' +
                size +
                '">' +
                '<div class="fvi-card-label">' +
                size +
                '×' +
                size +
                '</div>' +
                '<button type="button" class="outline fvi-dl-one" data-size="' +
                size +
                '" onclick="faviconDownloadOne(' +
                size +
                ')">下载</button>' +
                '</div>',
        );
    });
    grid.innerHTML = parts.join('');
}

function faviconRenderHtml() {
    const out = document.getElementById('fviHtml');
    if (!out) return;
    const map = {};
    Object.keys(_fviResults).forEach(function (k) {
        const size = Number(k);
        map[size] = 'favicon-' + size + 'x' + size + '.png';
    });
    if (!Object.keys(map).length) {
        out.value = '';
        return;
    }
    out.value = faviconBuildHtmlLinks(map);
}

function faviconDownloadOne(size) {
    const it = _fviResults[size];
    if (!it || !it.blob) {
        if (typeof toast === 'function') toast('请先生成该尺寸');
        return;
    }
    const name = 'favicon-' + size + 'x' + size + '.png';
    if (typeof downloadBlob === 'function') {
        downloadBlob(name, it.blob);
    } else {
        const a = document.createElement('a');
        a.href = it.url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    if (typeof toast === 'function') toast('已下载 ' + name);
}

function faviconDownloadAll() {
    const sizes = Object.keys(_fviResults).map(Number);
    if (!sizes.length) {
        if (typeof toast === 'function') toast('请先生成 Favicon');
        return;
    }
    sizes
        .sort(function (a, b) {
            return a - b;
        })
        .forEach(function (size, i) {
            setTimeout(function () {
                faviconDownloadOne(size);
            }, i * 200);
        });
}

function faviconCopyHtml() {
    const el = document.getElementById('fviHtml');
    const t = el ? el.value : '';
    if (!t) {
        if (typeof toast === 'function') toast('无 HTML 可复制');
        return;
    }
    if (typeof safeCopy === 'function') safeCopy(t, '已复制 link 标签');
}

function faviconClear() {
    faviconRevoke();
    _fviSource = null;
    const img = document.getElementById('fviSourcePreview');
    if (img) {
        img.removeAttribute('src');
        img.style.display = 'none';
    }
    const nameEl = document.getElementById('fviFileName');
    if (nameEl) nameEl.textContent = '未选择文件';
    const grid = document.getElementById('fviGrid');
    if (grid) grid.innerHTML = '<span style="color:var(--text-dim)">上传图片后生成预览</span>';
    const html = document.getElementById('fviHtml');
    if (html) html.value = '';
    if (typeof setStatus === 'function') setStatus('已清空');
}

function faviconInit() {
    const drop = document.getElementById('fviDrop');
    const file = document.getElementById('fviFile');
    if (!drop || !file) return;
    drop.addEventListener('click', function () {
        file.click();
    });
    drop.addEventListener('dragover', function (e) {
        e.preventDefault();
        drop.classList.add('dragover');
    });
    drop.addEventListener('dragleave', function () {
        drop.classList.remove('dragover');
    });
    drop.addEventListener('drop', function (e) {
        e.preventDefault();
        drop.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            faviconLoadFile(e.dataTransfer.files[0]);
        }
    });
    file.addEventListener('change', faviconOnFileChange);
}

if (typeof registerInit === 'function') {
    registerInit('favicon', faviconInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        faviconSizes,
        faviconBuildHtmlLinks,
    };
}
