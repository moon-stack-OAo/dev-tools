// === 字节单位换算 ===
// SI (1000) 与 IEC (1024) 两套进制

const BYTESIZE_SI = [
  { key: "B", label: "B", exp: 0 },
  { key: "KB", label: "KB", exp: 1 },
  { key: "MB", label: "MB", exp: 2 },
  { key: "GB", label: "GB", exp: 3 },
  { key: "TB", label: "TB", exp: 4 },
  { key: "PB", label: "PB", exp: 5 },
];

const BYTESIZE_IEC = [
  { key: "B", label: "B", exp: 0 },
  { key: "KiB", label: "KiB", exp: 1 },
  { key: "MiB", label: "MiB", exp: 2 },
  { key: "GiB", label: "GiB", exp: 3 },
  { key: "TiB", label: "TiB", exp: 4 },
  { key: "PiB", label: "PiB", exp: 5 },
];

// 别名：输入单位名 → { base: 1000|1024, exp }
const BYTESIZE_ALIASES = {
  b: { base: 1000, exp: 0 },
  byte: { base: 1000, exp: 0 },
  bytes: { base: 1000, exp: 0 },
  kb: { base: 1000, exp: 1 },
  k: { base: 1000, exp: 1 },
  mb: { base: 1000, exp: 2 },
  m: { base: 1000, exp: 2 },
  gb: { base: 1000, exp: 3 },
  g: { base: 1000, exp: 3 },
  tb: { base: 1000, exp: 4 },
  t: { base: 1000, exp: 4 },
  pb: { base: 1000, exp: 5 },
  p: { base: 1000, exp: 5 },
  kib: { base: 1024, exp: 1 },
  ki: { base: 1024, exp: 1 },
  mib: { base: 1024, exp: 2 },
  mi: { base: 1024, exp: 2 },
  gib: { base: 1024, exp: 3 },
  gi: { base: 1024, exp: 3 },
  tib: { base: 1024, exp: 4 },
  ti: { base: 1024, exp: 4 },
  pib: { base: 1024, exp: 5 },
  pi: { base: 1024, exp: 5 },
};

/**
 * 解析单位字符串
 * @param {string} unit
 * @returns {{ base: number, exp: number } | null}
 */
function bytesizeParseUnit(unit) {
  if (unit == null) return null;
  const u = String(unit).trim().toLowerCase();
  if (!u) return null;
  return BYTESIZE_ALIASES[u] || null;
}

/**
 * 将数值 + 单位换算为字节数
 * @param {string|number} value
 * @param {string} unit
 * @param {number} [forceBase] 强制进制（覆盖单位自带进制，B 除外）
 * @returns {{ ok: boolean, bytes?: number, msg?: string }}
 */
function bytesizeToBytes(value, unit, forceBase) {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) {
    return { ok: false, msg: "请输入数值" };
  }
  const num = Number(raw);
  if (!isFinite(num) || num < 0) {
    return { ok: false, msg: "请输入有效的非负数值" };
  }
  const parsed = bytesizeParseUnit(unit);
  if (!parsed) {
    return { ok: false, msg: "未知单位" };
  }
  let base = parsed.base;
  if (forceBase === 1000 || forceBase === 1024) {
    // B 的 exp=0，base 无影响；其它单位可强制切换进制
    if (parsed.exp > 0) base = forceBase;
  }
  const bytes = num * Math.pow(base, parsed.exp);
  if (!isFinite(bytes)) {
    return { ok: false, msg: "数值过大，无法换算" };
  }
  return { ok: true, bytes: bytes };
}

/**
 * 格式化数字：整数不带小数，否则最多 6 位有效小数并去尾零
 * @param {number} n
 * @returns {string}
 */
function bytesizeFormatNumber(n) {
  if (!isFinite(n)) return "NaN";
  if (n === 0) return "0";
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-12) {
    return String(Math.round(n));
  }
  // 大数用完整小数，避免科学计数法丢失可读性
  let s = n.toFixed(10).replace(/\.?0+$/, "");
  // 过小则保留更多精度
  if (s === "0" && n > 0) {
    s = n.toPrecision(12).replace(/\.?0+$/, "");
  }
  return s;
}

/**
 * 一键换算：返回全部单位结果
 * @param {string|number} value
 * @param {string} unit
 * @param {number} base 1000 或 1024
 * @returns {{ ok: boolean, bytes?: number, rows?: Array<{unit:string,value:string,bytes:number}>, msg?: string, base?: number }}
 */
function bytesizeConvert(value, unit, base) {
  const b = base === 1024 ? 1024 : 1000;
  const r = bytesizeToBytes(value, unit, b);
  if (!r.ok) return r;

  const list = b === 1024 ? BYTESIZE_IEC : BYTESIZE_SI;
  const rows = list.map((u) => {
    const v = r.bytes / Math.pow(b, u.exp);
    return {
      unit: u.label,
      value: bytesizeFormatNumber(v),
      bytes: r.bytes,
    };
  });

  return { ok: true, bytes: r.bytes, rows: rows, base: b };
}

/**
 * 生成纯文本结果（便于复制）
 * @param {{ ok: boolean, rows?: Array, base?: number, bytes?: number, msg?: string }} result
 * @returns {string}
 */
function bytesizeResultText(result) {
  if (!result || !result.ok) {
    return (result && result.msg) || "换算失败";
  }
  const mode = result.base === 1024 ? "1024 (IEC)" : "1000 (SI)";
  const lines = ["进制: " + mode, "字节数: " + bytesizeFormatNumber(result.bytes) + " B", ""];
  result.rows.forEach((row) => {
    lines.push(row.value + " " + row.unit);
  });
  return lines.join("\n");
}

// === UI ===
function bytesizeGetBase() {
  const el = document.getElementById("bsBase");
  if (!el) return 1024;
  return el.value === "1000" ? 1000 : 1024;
}

function bytesizeSyncUnitOptions() {
  const base = bytesizeGetBase();
  const sel = document.getElementById("bsUnit");
  if (!sel) return;
  const prev = sel.value;
  const list = base === 1024 ? BYTESIZE_IEC : BYTESIZE_SI;
  sel.innerHTML = list
    .map((u) => '<option value="' + u.key + '">' + u.label + "</option>")
    .join("");
  // 尽量保留同级单位：KB↔KiB 等
  const map = {
    B: "B",
    KB: "KiB",
    MB: "MiB",
    GB: "GiB",
    TB: "TiB",
    PB: "PiB",
    KiB: "KB",
    MiB: "MB",
    GiB: "GB",
    TiB: "TB",
    PiB: "PB",
  };
  const want = map[prev] || prev;
  if (list.some((u) => u.key === want)) {
    sel.value = want;
  } else if (list.some((u) => u.key === prev)) {
    sel.value = prev;
  }
}

function bytesizeRender() {
  const input = document.getElementById("bsInput");
  const unitEl = document.getElementById("bsUnit");
  const out = document.getElementById("bsResult");
  const textOut = document.getElementById("bsResultText");
  if (!input || !unitEl || !out) return;

  const value = input.value;
  const unit = unitEl.value;
  const base = bytesizeGetBase();

  if (!String(value).trim()) {
    out.className = "output-box";
    out.innerHTML = '<span style="color:var(--text-dim)">请输入数值</span>';
    if (textOut) textOut.textContent = "";
    return;
  }

  const r = bytesizeConvert(value, unit, base);

  if (!r.ok) {
    out.className = "output-box error";
    out.innerHTML = r.msg || "换算失败";
    if (textOut) textOut.textContent = r.msg || "换算失败";
    return;
  }

  const modeLabel = base === 1024 ? "1024 进制 (IEC)" : "1000 进制 (SI)";
  const parts = [];
  parts.push(
    '<div style="color:var(--text-dim);font-size:12px;margin-bottom:8px">' +
      modeLabel +
      " · 精确字节数 <b style=\"color:var(--text)\">" +
      bytesizeFormatNumber(r.bytes) +
      " B</b></div>",
  );
  parts.push(
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">',
  );
  r.rows.forEach((row) => {
    const isSource =
      row.unit.toLowerCase() === unit.toLowerCase() ||
      (unit === "B" && row.unit === "B");
    parts.push(
      '<div style="padding:8px 10px;border-radius:6px;border:1px solid ' +
        (isSource ? "rgba(34,197,94,0.4)" : "var(--border)") +
        ";background:" +
        (isSource ? "rgba(34,197,94,0.08)" : "transparent") +
        '">' +
        '<div style="font-size:11px;color:var(--text-dim);margin-bottom:2px">' +
        row.unit +
        "</div>" +
        '<div style="font-weight:600;font-size:15px;word-break:break-all">' +
        row.value +
        "</div></div>",
    );
  });
  parts.push("</div>");

  out.className = "output-box";
  out.innerHTML = parts.join("");
  if (textOut) textOut.textContent = bytesizeResultText(r);
  if (typeof setStatus === "function") setStatus("字节换算完成");
}

function bytesizeOnBaseChange() {
  bytesizeSyncUnitOptions();
  bytesizeRender();
}

function bytesizeClear() {
  const input = document.getElementById("bsInput");
  if (input) input.value = "";
  const out = document.getElementById("bsResult");
  if (out) {
    out.className = "output-box";
    out.innerHTML = '<span style="color:var(--text-dim)">请输入数值</span>';
  }
  const textOut = document.getElementById("bsResultText");
  if (textOut) textOut.textContent = "";
  if (typeof setStatus === "function") setStatus("已清空");
}

function bytesizeLoadExample() {
  const input = document.getElementById("bsInput");
  const unitEl = document.getElementById("bsUnit");
  const baseEl = document.getElementById("bsBase");
  if (baseEl) baseEl.value = "1024";
  bytesizeSyncUnitOptions();
  if (input) input.value = "1.5";
  if (unitEl) unitEl.value = "GiB";
  bytesizeRender();
}

if (typeof registerInit === "function") {
  registerInit("bytesize", function () {
    bytesizeSyncUnitOptions();
    bytesizeRender();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    bytesizeParseUnit,
    bytesizeToBytes,
    bytesizeConvert,
    bytesizeFormatNumber,
    bytesizeResultText,
    BYTESIZE_SI,
    BYTESIZE_IEC,
  };
}
