// PDF 合并与拆分
// 依赖：pdf-lib（懒加载，由 app.js 的 toolLibs 注入 window.PDFLib）
// 功能：多文件合并为一个 PDF，或按页码范围从单个 PDF 抽取/拆分页面。
(function () {
  "use strict";

  const MAX_FILES = 50;

  // ============== 纯函数（可测试） ==============

  /**
   * 解析页码范围字符串为 1-based 区间数组（含起止）
   * 例：'1-3,5,7-9' → [[1,3], [5,5], [7,9]]；'  ' → []
   * @param {string} input
   * @returns {Array<[number, number]>}
   */
  function parsePageRanges(input) {
    if (input === null || input === undefined) return [];
    if (typeof input !== "string") return [];
    const text = input.trim();
    if (!text) return [];
    const segments = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ranges = [];
    for (const seg of segments) {
      const m = seg.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) throw new Error(`无效的页码段："${seg}"`);
      const start = Number(m[1]);
      const end = m[2] === undefined ? start : Number(m[2]);
      if (start < 1) throw new Error(`页码必须从 1 开始："${seg}"`);
      if (end < start) throw new Error(`结束页不能小于起始页："${seg}"`);
      ranges.push([start, end]);
    }
    return ranges;
  }

  /**
   * 将 1-based 区间数组展开为页码数组（含边界、去重、过滤越界）
   * @param {Array<[number, number]>} ranges
   * @param {number} totalPages
   * @returns {number[]} 0-based 页码数组
   */
  function expandRanges(ranges, totalPages) {
    if (!Array.isArray(ranges)) throw new Error("ranges 必须是数组");
    if (!Number.isInteger(totalPages) || totalPages < 1) {
      throw new Error("totalPages 必须为正整数");
    }
    const seen = new Set();
    const out = [];
    for (const [s, e] of ranges) {
      const start = Math.max(1, s);
      const end = Math.min(totalPages, e);
      if (end < start) continue;
      for (let p = start; p <= end; p++) {
        if (!seen.has(p)) {
          seen.add(p);
          out.push(p - 1);
        }
      }
    }
    return out;
  }

  /**
   * 合并多个 PDF（Uint8Array）为单个 PDF 的 Uint8Array
   * @param {Uint8Array[]} pdfBytesList
   * @returns {Promise<Uint8Array>}
   */
  async function mergePdfs(pdfBytesList) {
    if (!Array.isArray(pdfBytesList) || pdfBytesList.length === 0) {
      throw new Error("PDF 列表为空");
    }
    const w = (typeof window !== "undefined" ? window : global).PDFLib;
    if (!w || !w.PDFDocument) throw new Error("pdf-lib 库未加载");
    const out = await w.PDFDocument.create();
    for (let i = 0; i < pdfBytesList.length; i++) {
      const bytes = pdfBytesList[i];
      if (!(bytes instanceof Uint8Array)) {
        throw new Error(`第 ${i + 1} 项不是有效的 PDF 字节数据`);
      }
      const src = await w.PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    return out.save();
  }

  /**
   * 按页码范围从单个 PDF 抽取页面，生成新的 PDF
   * @param {Uint8Array} pdfBytes
   * @param {Array<[number, number]>} ranges 1-based 区间
   * @returns {Promise<Uint8Array>}
   */
  async function splitPdf(pdfBytes, ranges) {
    if (!(pdfBytes instanceof Uint8Array)) throw new Error("PDF 字节数据无效");
    if (!Array.isArray(ranges) || ranges.length === 0) {
      throw new Error("页码范围为空");
    }
    const w = (typeof window !== "undefined" ? window : global).PDFLib;
    if (!w || !w.PDFDocument) throw new Error("pdf-lib 库未加载");
    const src = await w.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const total = src.getPageCount();
    const indices = expandRanges(ranges, total);
    if (indices.length === 0) throw new Error("没有有效的页码落在文档范围内");
    const out = await w.PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    return out.save();
  }

  /**
   * 按逗号分段，每段独立生成一个 PDF（拆分为多文件场景）
   * @param {Uint8Array} pdfBytes
   * @param {Array<[number, number]>} ranges 1-based 区间
   * @returns {Promise<Uint8Array[]>}
   */
  async function splitPdfMultiple(pdfBytes, ranges) {
    if (!Array.isArray(ranges) || ranges.length === 0) {
      throw new Error("页码范围为空");
    }
    const w = (typeof window !== "undefined" ? window : global).PDFLib;
    if (!w || !w.PDFDocument) throw new Error("pdf-lib 库未加载");
    const src = await w.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const total = src.getPageCount();
    const results = [];
    for (const [s, e] of ranges) {
      const start = Math.max(1, s);
      const end = Math.min(total, e);
      if (end < start) continue;
      const indices = [];
      for (let p = start; p <= end; p++) indices.push(p - 1);
      const out = await w.PDFDocument.create();
      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));
      results.push(await out.save());
    }
    if (results.length === 0) throw new Error("没有有效的页码落在文档范围内");
    return results;
  }

  /**
   * 获取 PDF 字节数据的页数（用于 UI 展示）
   * @param {Uint8Array} pdfBytes
   * @returns {Promise<number>}
   */
  async function getPageCount(pdfBytes) {
    if (!(pdfBytes instanceof Uint8Array)) throw new Error("PDF 字节数据无效");
    const w = (typeof window !== "undefined" ? window : global).PDFLib;
    if (!w || !w.PDFDocument) throw new Error("pdf-lib 库未加载");
    const src = await w.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    return src.getPageCount();
  }

  // 暴露纯函数供测试
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      parsePageRanges,
      expandRanges,
      mergePdfs,
      splitPdf,
      splitPdfMultiple,
      getPageCount,
    };
  }

  // ============== UI 状态 ==============
  const mergeState = { files: [] }; // { id, name, bytes }
  const splitState = { file: null, pageCount: 0 }; // { name, bytes }

  // ============== 工具函数 ==============

  // readFileAsBytes / formatBytes / downloadBlob 由 js/utils.js 提供（ADR PR-1.3）
  if (typeof readFileAsBytes !== "function" && typeof require === "function") {
    try {
      require("../utils.js");
    } catch (e) {}
  }

  function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  }

  function triggerDownload(blob, filename) {
    downloadBlob(filename, blob);
  }

  function newId() {
    return "pm-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  // ============== 合并模式 UI ==============

  function pmMergeAdd(files) {
    const arr = Array.from(files || []);
    const tasks = [];
    for (const file of arr) {
      if (mergeState.files.length >= MAX_FILES) break;
      const lower = (file.name || "").toLowerCase();
      if (!file.type?.includes("pdf") && !lower.endsWith(".pdf")) continue;
      tasks.push(
        readFileAsBytes(file).then((bytes) => {
          mergeState.files.push({
            id: newId(),
            name: file.name,
            size: file.size,
            bytes,
          });
        }),
      );
    }
    Promise.all(tasks).then(pmMergeRender);
  }

  function pmMergeRemove(id) {
    mergeState.files = mergeState.files.filter((f) => f.id !== id);
    pmMergeRender();
  }

  function pmMergeMove(id, dir) {
    const idx = mergeState.files.findIndex((f) => f.id === id);
    const target = idx + dir;
    if (target < 0 || target >= mergeState.files.length) return;
    [mergeState.files[idx], mergeState.files[target]] = [
      mergeState.files[target],
      mergeState.files[idx],
    ];
    pmMergeRender();
  }

  function pmMergeClear() {
    if (mergeState.files.length === 0) return;
    if (typeof confirm === "function" && !confirm("确定清空全部 PDF？")) return;
    mergeState.files = [];
    pmMergeRender();
  }

  function pmMergeSortByName() {
    mergeState.files.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    pmMergeRender();
  }

  function pmMergeRender() {
    const list = document.getElementById("pmMergeList");
    const toolbar = document.getElementById("pmMergeToolbar");
    const stats = document.getElementById("pmMergeStats");
    if (!list || !toolbar || !stats) return;
    if (mergeState.files.length === 0) {
      list.innerHTML = '<div class="pm-empty">请先添加 PDF 文件</div>';
      toolbar.style.display = "none";
      return;
    }
    toolbar.style.display = "flex";
    const totalSize = mergeState.files.reduce((s, f) => s + (f.size || 0), 0);
    stats.textContent = `共 ${mergeState.files.length} 个 · ${formatBytes(totalSize)}`;
    list.innerHTML = mergeState.files
      .map(
        (f, i) => `
            <div class="pm-card" data-id="${f.id}">
                <div class="pm-card-icon">
                    <i class="bi bi-file-earmark-pdf"></i>
                </div>
                <div class="pm-card-meta" title="${escapeHtml(f.name)}">
                    <div class="pm-card-name">${escapeHtml(f.name)}</div>
                    <div class="pm-card-dim">${formatBytes(f.size || 0)}</div>
                </div>
                <div class="pm-card-actions">
                    <button ${i === 0 ? "disabled" : ""} onclick="pmMergeMove('${f.id}', -1)" title="上移">
                        <i class="bi bi-arrow-up"></i>
                    </button>
                    <button ${i === mergeState.files.length - 1 ? "disabled" : ""} onclick="pmMergeMove('${f.id}', 1)" title="下移">
                        <i class="bi bi-arrow-down"></i>
                    </button>
                    <button class="pm-danger" onclick="pmMergeRemove('${f.id}')" title="删除">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>`,
      )
      .join("");
  }

  function pmMergeExport() {
    if (mergeState.files.length === 0) {
      toast("请先添加 PDF 文件");
      return;
    }
    const btn = document.querySelector("#pmMergeToolbar .primary");
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 合并中…';
    setTimeout(async () => {
      try {
        const bytesList = mergeState.files.map((f) => f.bytes);
        const out = await mergePdfs(bytesList);
        const blob = new Blob([out], { type: "application/pdf" });
        triggerDownload(blob, `merged-${timestamp()}.pdf`);
      } catch (err) {
        console.error("[pdfmerge:merge]", err);
        toast("合并失败：" + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    }, 30);
  }

  // ============== 拆分模式 UI ==============

  async function pmSplitPick(file) {
    if (!file) return;
    const lower = (file.name || "").toLowerCase();
    if (!file.type?.includes("pdf") && !lower.endsWith(".pdf")) {
      toast("请选择 PDF 文件");
      return;
    }
    const meta = document.getElementById("pmSplitMeta");
    if (meta) meta.textContent = "加载中…";
    try {
      const bytes = await readFileAsBytes(file);
      const count = await getPageCount(bytes);
      splitState.file = { name: file.name, bytes };
      splitState.pageCount = count;
      if (meta) meta.textContent = `${file.name} · 共 ${count} 页`;
      const ranges = document.getElementById("pmSplitRanges");
      if (ranges && !ranges.value) ranges.value = `1-${count}`;
    } catch (err) {
      console.error("[pdfmerge:split-pick]", err);
      toast("读取 PDF 失败：" + (err.message || err));
      if (meta) meta.textContent = "未选择文件";
      splitState.file = null;
      splitState.pageCount = 0;
    }
  }

  function pmSplitFillAll() {
    if (splitState.pageCount < 1) {
      toast("请先选择 PDF 文件");
      return;
    }
    const ranges = document.getElementById("pmSplitRanges");
    if (ranges) ranges.value = `1-${splitState.pageCount}`;
  }

  function pmSplitReset() {
    const ranges = document.getElementById("pmSplitRanges");
    if (ranges) ranges.value = "";
    splitState.file = null;
    splitState.pageCount = 0;
    const meta = document.getElementById("pmSplitMeta");
    if (meta) meta.textContent = "未选择文件";
    const fileInput = document.getElementById("pmSplitFile");
    if (fileInput) fileInput.value = "";
  }

  function pmSplitExport() {
    if (!splitState.file) {
      toast("请先选择 PDF 文件");
      return;
    }
    const rangesInput = document.getElementById("pmSplitRanges").value;
    let ranges;
    try {
      ranges = parsePageRanges(rangesInput);
    } catch (err) {
      toast(err.message || String(err));
      return;
    }
    if (ranges.length === 0) {
      toast("请填写页码范围");
      return;
    }
    const reverse = document.getElementById("pmSplitReverse").checked;
    const btn = document.querySelector("#pmViewSplit .primary");
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> 拆分中…';
    setTimeout(async () => {
      try {
        const baseName = splitState.file.name.replace(/\.pdf$/i, "");
        if (reverse) {
          const outs = await splitPdfMultiple(splitState.file.bytes, ranges);
          outs.forEach((bytes, i) => {
            const blob = new Blob([bytes], { type: "application/pdf" });
            triggerDownload(
              blob,
              `${baseName}-part${i + 1}-${timestamp()}.pdf`,
            );
          });
        } else {
          const out = await splitPdf(splitState.file.bytes, ranges);
          const blob = new Blob([out], { type: "application/pdf" });
          triggerDownload(blob, `${baseName}-split-${timestamp()}.pdf`);
        }
      } catch (err) {
        console.error("[pdfmerge:split]", err);
        toast("拆分失败：" + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    }, 30);
  }

  // ============== Tab 切换 ==============

  function pmSwitchTab(name) {
    document.querySelectorAll(".pm-tab").forEach((el) => {
      el.classList.toggle("active", el.dataset.tab === name);
    });
    document.querySelectorAll(".pm-view").forEach((el) => {
      el.classList.remove("pm-view-active");
    });
    const target = name === "merge" ? "pmViewMerge" : "pmViewSplit";
    const v = document.getElementById(target);
    if (v) v.classList.add("pm-view-active");
  }

  // 暴露到 window（仅浏览器环境，Node 测试时不注册）
  if (typeof window !== "undefined") {
    window.pmMergeAdd = pmMergeAdd;
    window.pmMergeRemove = pmMergeRemove;
    window.pmMergeMove = pmMergeMove;
    window.pmMergeClear = pmMergeClear;
    window.pmMergeSortByName = pmMergeSortByName;
    window.pmMergeExport = pmMergeExport;
    window.pmSplitPick = pmSplitPick;
    window.pmSplitFillAll = pmSplitFillAll;
    window.pmSplitReset = pmSplitReset;
    window.pmSplitExport = pmSplitExport;
    window.pmSwitchTab = pmSwitchTab;
  }

  // ============== 初始化 ==============
  function init() {
    // Tab 切换
    document.querySelectorAll("#panel-pdfmerge .pm-tab").forEach((el) => {
      el.addEventListener("click", () => pmSwitchTab(el.dataset.tab));
    });

    // 合并：文件选择 + 拖拽
    const mergeFile = document.getElementById("pmMergeFile");
    const mergeDrop = document.getElementById("pmMergeDrop");
    if (mergeFile) {
      mergeFile.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length) {
          window.pmMergeAdd(e.target.files);
          e.target.value = "";
        }
      });
    }
    if (mergeDrop) {
      mergeDrop.addEventListener("click", (e) => {
        if (e.target.closest(".pm-card")) return;
        mergeFile && mergeFile.click();
      });
      ["dragenter", "dragover"].forEach((evt) =>
        mergeDrop.addEventListener(evt, (e) => {
          e.preventDefault();
          mergeDrop.classList.add("pm-drop-active");
        }),
      );
      ["dragleave", "drop"].forEach((evt) =>
        mergeDrop.addEventListener(evt, (e) => {
          e.preventDefault();
          mergeDrop.classList.remove("pm-drop-active");
        }),
      );
      mergeDrop.addEventListener("drop", (e) => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) window.pmMergeAdd(files);
      });
    }

    // 拆分：文件选择
    const splitFile = document.getElementById("pmSplitFile");
    if (splitFile) {
      splitFile.addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) window.pmSplitPick(f);
      });
    }
  }

  if (typeof registerInit === "function") {
    registerInit("pdfmerge", init);
  }
})();
