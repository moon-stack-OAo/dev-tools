// 图片转 PDF
// 依赖：jspdf（懒加载，由 app.js 的 toolLibs 注入 window.jspdf）
// 功能：多张图片合成 PDF，支持页面尺寸/方向/边距/布局策略
(function () {
    'use strict';

    const MAX_IMAGES = 50;

    // ============== 纯函数（可测试） ==============

    /**
     * 从 File 读取为 DataURL
     * @param {File} file
     * @returns {Promise<string>}
     */
    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            if (!(file instanceof Blob)) {
                reject(new Error('参数必须是 File 或 Blob'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 获取图片 DataURL 的尺寸
     * @param {string} dataUrl
     * @returns {Promise<{width:number,height:number}>}
     */
    function loadImageDims(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(new Error('图片解析失败'));
            img.src = dataUrl;
        });
    }

    /**
     * 计算图片在指定页面内的绘制尺寸（保持宽高比）
     * @param {{width:number,height:number}} img
     * @param {{width:number,height:number}} page
     * @param {number} margin mm
     * @param {'contain'|'cover'} fit
     * @returns {{x:number,y:number,w:number,h:number}}
     */
    function fitImage(img, page, margin, fit) {
        const maxW = Math.max(1, page.width - margin * 2);
        const maxH = Math.max(1, page.height - margin * 2);
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        if (fit === 'cover') {
            // 覆盖：取较大比值，超出部分居中（jsPDF 允许越界绘制，仅居中即可）
            const coverRatio = Math.max(maxW / img.width, maxH / img.height);
            const cw = img.width * coverRatio;
            const ch = img.height * coverRatio;
            return { x: (page.width - cw) / 2, y: (page.height - ch) / 2, w: cw, h: ch };
        }
        return { x: (page.width - w) / 2, y: (page.height - h) / 2, w, h };
    }

    /**
     * 推断 jsPDF addImage 的格式关键字
     * @param {string} mime
     * @returns {string}
     */
    function detectFormat(mime) {
        const m = (mime || '').toLowerCase();
        if (m.includes('png')) return 'PNG';
        if (m.includes('webp')) return 'WEBP';
        if (m.includes('gif')) return 'GIF';
        return 'JPEG';
    }

    /**
     * 解析用户配置为 jsPDF 参数
     * @param {{pageSize?:string, orientation?:string, margin?:number, fit?:string}} options
     */
    function normalizeOptions(options) {
        return {
            pageSize: options.pageSize || 'a4',
            orientation: options.orientation || 'p',
            margin: Math.max(0, Math.min(50, Number(options.margin) || 0)),
            fit: options.fit === 'cover' ? 'cover' : 'contain',
        };
    }

    /**
     * 合成图片列表为 PDF Blob
     * @param {Array<{dataUrl:string, format:string, dims:{width:number,height:number}}>} images
     * @param {{pageSize?:string, orientation?:string, margin?:number, fit?:string}} options
     * @returns {Blob}
     */
    function buildPdf(images, options) {
        if (!Array.isArray(images) || images.length === 0) {
            throw new Error('图片列表为空');
        }
        const w = (typeof window !== 'undefined' ? window : global).jspdf;
        if (!w || !w.jsPDF) {
            throw new Error('jsPDF 库未加载');
        }
        const opts = normalizeOptions(options);
        const { jsPDF } = w;
        const doc = new jsPDF({
            orientation: opts.orientation,
            unit: 'mm',
            format: opts.pageSize,
        });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        images.forEach((img, idx) => {
            if (idx > 0) doc.addPage();
            const rect = fitImage(img.dims, { width: pageW, height: pageH }, opts.margin, opts.fit);
            doc.addImage(img.dataUrl, img.format, rect.x, rect.y, rect.w, rect.h, undefined, 'FAST');
        });
        return doc.output('blob');
    }

    // 暴露纯函数供测试
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            buildPdf,
            fileToDataUrl,
            loadImageDims,
            fitImage,
            detectFormat,
            normalizeOptions,
        };
    }

    // ============== UI 状态 ==============
    const state = {
        images: [], // { id, name, dataUrl, format, dims }
    };

    // ============== UI 交互（绑定到 onclick） ==============

    function itpAdd(files) {
        const arr = Array.from(files || []);
        const tasks = [];
        for (const file of arr) {
            if (state.images.length >= MAX_IMAGES) break;
            if (!file.type || !file.type.startsWith('image/')) continue;
            tasks.push(
                fileToDataUrl(file)
                    .then((dataUrl) => loadImageDims(dataUrl).then((dims) => ({ file, dataUrl, dims })))
                    .then(({ file: f, dataUrl, dims }) => {
                        state.images.push({
                            id: 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                            name: f.name,
                            dataUrl,
                            format: detectFormat(f.type),
                            dims,
                        });
                    })
            );
        }
        Promise.all(tasks).then(itpRender);
    }

    function itpRemove(id) {
        state.images = state.images.filter((img) => img.id !== id);
        itpRender();
    }

    function itpMove(id, dir) {
        const idx = state.images.findIndex((img) => img.id === id);
        const target = idx + dir;
        if (target < 0 || target >= state.images.length) return;
        [state.images[idx], state.images[target]] = [state.images[target], state.images[idx]];
        itpRender();
    }

    function itpClear() {
        if (state.images.length === 0) return;
        if (typeof confirm === 'function' && !confirm('确定清空全部图片？')) return;
        state.images = [];
        itpRender();
    }

    function itpSortByName() {
        state.images.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        itpRender();
    }

    function itpExport() {
        if (state.images.length === 0) {
            if (typeof alert === 'function') alert('请先添加图片');
            return;
        }
        const options = {
            pageSize: document.getElementById('itpPageSize').value,
            orientation: document.getElementById('itpOrient').value,
            margin: Number(document.getElementById('itpMargin').value) || 0,
            fit: document.getElementById('itpFit').value,
        };
        const btn = document.querySelector('#itpToolbar .primary');
        const oldHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 生成中…';
        // 用 setTimeout 让 UI 有机会刷新
        setTimeout(() => {
            try {
                const blob = buildPdf(state.images, options);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                a.download = `images-${stamp}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error('[imgtopdf]', err);
                if (typeof alert === 'function') alert('导出失败：' + (err.message || err));
            } finally {
                btn.disabled = false;
                btn.innerHTML = oldHtml;
            }
        }, 30);
    }

    // 暴露到 window（仅浏览器环境，Node 测试时不注册）
    if (typeof window !== 'undefined') {
        window.itpAdd = itpAdd;
        window.itpRemove = itpRemove;
        window.itpMove = itpMove;
        window.itpClear = itpClear;
        window.itpSortByName = itpSortByName;
        window.itpExport = itpExport;
    }

    function itpRender() {
        const list = document.getElementById('itpList');
        const toolbar = document.getElementById('itpToolbar');
        const stats = document.getElementById('itpStats');
        if (!list || !toolbar || !stats) return;
        if (state.images.length === 0) {
            list.innerHTML = '<div class="itp-empty">请先添加图片</div>';
            toolbar.style.display = 'none';
            return;
        }
        toolbar.style.display = 'flex';
        stats.textContent = `共 ${state.images.length} 张`;
        list.innerHTML = state.images
            .map(
                (img, i) => `
            <div class="itp-card" data-id="${img.id}">
                <div class="itp-card-thumb">
                    <img alt="${escapeHtml(img.name)}" src="${img.dataUrl}" />
                </div>
                <div class="itp-card-meta" title="${escapeHtml(img.name)}">
                    <div class="itp-card-name">${escapeHtml(img.name)}</div>
                    <div class="itp-card-dim">${img.dims.width}×${img.dims.height} · ${img.format}</div>
                </div>
                <div class="itp-card-actions">
                    <button ${i === 0 ? 'disabled' : ''} onclick="itpMove('${img.id}', -1)" title="上移">
                        <i class="bi bi-arrow-up"></i>
                    </button>
                    <button ${i === state.images.length - 1 ? 'disabled' : ''} onclick="itpMove('${img.id}', 1)" title="下移">
                        <i class="bi bi-arrow-down"></i>
                    </button>
                    <button class="itp-danger" onclick="itpRemove('${img.id}')" title="删除">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>`
            )
            .join('');
    }

    // ============== 初始化 ==============
    function init() {
        const drop = document.getElementById('itpDrop');
        const fileInput = document.getElementById('itpFile');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length) {
                    window.itpAdd(e.target.files);
                    e.target.value = '';
                }
            });
        }
        if (drop) {
            drop.addEventListener('click', (e) => {
                if (e.target.closest('.itp-card')) return;
                fileInput && fileInput.click();
            });
            ['dragenter', 'dragover'].forEach((evt) =>
                drop.addEventListener(evt, (e) => {
                    e.preventDefault();
                    drop.classList.add('itp-drop-active');
                })
            );
            ['dragleave', 'drop'].forEach((evt) =>
                drop.addEventListener(evt, (e) => {
                    e.preventDefault();
                    drop.classList.remove('itp-drop-active');
                })
            );
            drop.addEventListener('drop', (e) => {
                const files = e.dataTransfer && e.dataTransfer.files;
                if (files && files.length) window.itpAdd(files);
            });
        }

        // 粘贴板支持
        const panel = document.getElementById('panel-imgtopdf');
        if (panel) {
            panel.addEventListener('paste', (e) => {
                const items = (e.clipboardData || {}).items || [];
                const files = [];
                for (const it of items) {
                    if (it.kind === 'file') {
                        const f = it.getAsFile();
                        if (f) files.push(f);
                    }
                }
                if (files.length) {
                    e.preventDefault();
                    window.itpAdd(files);
                }
            });
        }
    }

    if (typeof registerInit === 'function') {
        registerInit('imgtopdf', init);
    }
})();
