// 条形码生成：Code 128 / Code 39，纯 Canvas 绘制

/** Code 128 图案表：索引 0-106，每位为 11 模块宽窄序列（和为 11） */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const CODE128_START_A = 103;
const CODE128_START_B = 104;
const CODE128_START_C = 105;
const CODE128_STOP = 106;
const CODE128_CODE_A = 101;
const CODE128_CODE_B = 100;
const CODE128_CODE_C = 99;

/** Code 39 字符 → 9 位宽窄（1=宽,0=窄），中间有空隙 */
const CODE39_MAP = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100",
};

function code128CharValueB(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c <= 127) return c - 32;
  return -1;
}

function code128CharValueA(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 0 && c <= 95) {
    if (c < 32) return c + 64;
    return c - 32;
  }
  return -1;
}

function isDigitPair(text, i) {
  return (
    i + 1 < text.length &&
    text.charCodeAt(i) >= 48 &&
    text.charCodeAt(i) <= 57 &&
    text.charCodeAt(i + 1) >= 48 &&
    text.charCodeAt(i + 1) <= 57
  );
}

/**
 * 将文本编码为 Code 128 符号值序列（含 Start / 校验 / Stop）
 * @param {string} text
 * @returns {number[]}
 */
function encodeCode128(text) {
  if (text == null || text === "") {
    throw new Error("内容不能为空");
  }
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 127) {
      throw new Error("Code 128 仅支持 ASCII（0-127），非法字符: " + s[i]);
    }
  }

  // 全为偶数位数字 → 纯 Code C
  let allDigits = s.length >= 2 && s.length % 2 === 0;
  if (allDigits) {
    for (let i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) < 48 || s.charCodeAt(i) > 57) {
        allDigits = false;
        break;
      }
    }
  }

  const codes = [];
  let set; // 'A' | 'B' | 'C'

  if (allDigits) {
    set = "C";
    codes.push(CODE128_START_C);
    for (let i = 0; i < s.length; i += 2) {
      codes.push(parseInt(s.substr(i, 2), 10));
    }
  } else {
    // 优先 B，必要时切 C 处理数字对；控制字符用 A
    let i = 0;
    // 选起始集
    if (s.charCodeAt(0) < 32) {
      set = "A";
      codes.push(CODE128_START_A);
    } else {
      set = "B";
      codes.push(CODE128_START_B);
    }
    while (i < s.length) {
      // 连续 >=4 位数字且可成对时切到 C
      let digitRun = 0;
      while (
        i + digitRun < s.length &&
        s.charCodeAt(i + digitRun) >= 48 &&
        s.charCodeAt(i + digitRun) <= 57
      ) {
        digitRun++;
      }
      if (digitRun >= 4) {
        const use = digitRun - (digitRun % 2);
        if (set !== "C") {
          codes.push(CODE128_CODE_C);
          set = "C";
        }
        for (let j = 0; j < use; j += 2) {
          codes.push(parseInt(s.substr(i + j, 2), 10));
        }
        i += use;
        continue;
      }
      const ch = s[i];
      const cc = s.charCodeAt(i);
      if (set === "C") {
        // 离开 C
        if (cc < 32) {
          codes.push(CODE128_CODE_A);
          set = "A";
        } else {
          codes.push(CODE128_CODE_B);
          set = "B";
        }
      }
      if (set === "A") {
        if (cc >= 96 && cc <= 127) {
          codes.push(CODE128_CODE_B);
          set = "B";
          codes.push(code128CharValueB(ch));
        } else {
          const v = code128CharValueA(ch);
          if (v < 0) throw new Error("无法编码字符: " + ch);
          codes.push(v);
        }
      } else {
        // B
        if (cc < 32) {
          codes.push(CODE128_CODE_A);
          set = "A";
          codes.push(code128CharValueA(ch));
        } else {
          const v = code128CharValueB(ch);
          if (v < 0) throw new Error("无法编码字符: " + ch);
          codes.push(v);
        }
      }
      i++;
    }
  }

  // 校验位
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  checksum = checksum % 103;
  codes.push(checksum);
  codes.push(CODE128_STOP);
  return codes;
}

/**
 * Code 128 符号值 → 二进制条空序列（1=条,0=空），模块单位
 * @param {number[]} codes
 * @returns {string} 由 '1'/'0' 组成
 */
function code128ToModules(codes) {
  let bits = "";
  for (let i = 0; i < codes.length; i++) {
    const p = CODE128_PATTERNS[codes[i]];
    if (!p) throw new Error("无效 Code 128 符号: " + codes[i]);
    let bar = true;
    for (let j = 0; j < p.length; j++) {
      const n = parseInt(p[j], 10);
      bits += (bar ? "1" : "0").repeat(n);
      bar = !bar;
    }
  }
  // 终止符后静区由绘制时 margin 处理；Stop 图案已含终止杠
  return bits;
}

/**
 * 编码 Code 39 → 模块串（1=条,0=空）
 * @param {string} text
 * @returns {{ modules: string, display: string }}
 */
function encodeCode39(text) {
  if (text == null || text === "") {
    throw new Error("内容不能为空");
  }
  const raw = String(text).toUpperCase();
  let body = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "*") continue; // 起止符由算法添加
    if (!CODE39_MAP[ch]) {
      throw new Error("Code 39 不支持字符: " + text[i] + "（仅 A-Z 0-9 -.$/+% 空格）");
    }
    body += ch;
  }
  if (!body) throw new Error("内容不能为空");
  const full = "*" + body + "*";
  let modules = "";
  for (let i = 0; i < full.length; i++) {
    if (i > 0) modules += "0"; // 字符间 1 窄空
    const pattern = CODE39_MAP[full[i]];
    let bar = true;
    for (let j = 0; j < pattern.length; j++) {
      const wide = pattern[j] === "1";
      const w = wide ? 3 : 1;
      modules += (bar ? "1" : "0").repeat(w);
      bar = !bar;
    }
  }
  return { modules, display: body };
}

/**
 * 编码入口
 * @param {string} text
 * @param {'code128'|'code39'} format
 * @returns {{ modules: string, display: string, format: string, codes?: number[] }}
 */
function barcodeEncode(text, format) {
  const fmt = (format || "code128").toLowerCase();
  if (fmt === "code39") {
    const r = encodeCode39(text);
    return { modules: r.modules, display: r.display, format: "code39" };
  }
  if (fmt === "code128") {
    const codes = encodeCode128(text);
    return {
      modules: code128ToModules(codes),
      display: String(text),
      format: "code128",
      codes,
    };
  }
  throw new Error("不支持的码制: " + format);
}

/**
 * 在 canvas 上绘制条形码
 * @param {HTMLCanvasElement} canvas
 * @param {string} modules
 * @param {object} opts
 */
function barcodeDraw(canvas, modules, opts) {
  opts = opts || {};
  const moduleWidth = Math.max(1, opts.moduleWidth || 2);
  const barHeight = Math.max(20, opts.height || 80);
  const margin = Math.max(0, opts.margin || 10);
  const showText = opts.showText !== false;
  const fg = opts.fg || "#000000";
  const bg = opts.bg || "#ffffff";
  const text = opts.text || "";
  const textHeight = showText && text ? 18 : 0;
  const gap = showText && text ? 6 : 0;

  const width = margin * 2 + modules.length * moduleWidth;
  const height = margin * 2 + barHeight + gap + textHeight;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = fg;
  let x = margin;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === "1") {
      ctx.fillRect(x, margin, moduleWidth, barHeight);
    }
    x += moduleWidth;
  }
  if (showText && text) {
    ctx.fillStyle = fg;
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(text, width / 2, margin + barHeight + gap);
  }
}

// ---------- UI ----------

let barcodeCurrentDataUrl = null;

function barcodeGenerate() {
  const input = document.getElementById("barcodeInput");
  const canvas = document.getElementById("barcodeCanvas");
  const meta = document.getElementById("barcodeMeta");
  if (!input || !canvas || !meta) return;
  const text = input.value;
  if (!text || !text.trim()) {
    meta.textContent = "请输入内容";
    meta.style.color = "var(--danger)";
    barcodeCurrentDataUrl = null;
    return;
  }
  const format = (document.getElementById("barcodeFormat") || {}).value || "code128";
  const height = Math.max(
    40,
    Math.min(240, parseInt((document.getElementById("barcodeHeight") || {}).value, 10) || 80),
  );
  const moduleWidth = Math.max(
    1,
    Math.min(6, parseInt((document.getElementById("barcodeModule") || {}).value, 10) || 2),
  );
  const margin = Math.max(
    0,
    Math.min(40, parseInt((document.getElementById("barcodeMargin") || {}).value, 10) || 10),
  );
  const showText = ((document.getElementById("barcodeShowText") || {}).value || "1") === "1";
  const fg = (document.getElementById("barcodeFg") || {}).value || "#000000";
  const bg = (document.getElementById("barcodeBg") || {}).value || "#ffffff";

  try {
    const encoded = barcodeEncode(text.trim(), format);
    barcodeDraw(canvas, encoded.modules, {
      moduleWidth,
      height,
      margin,
      showText,
      fg,
      bg,
      text: encoded.display,
    });
    barcodeCurrentDataUrl = canvas.toDataURL("image/png");
    meta.style.color = "var(--text-muted)";
    meta.textContent =
      `${encoded.format.toUpperCase()} · ${canvas.width}×${canvas.height} · 模块 ${encoded.modules.length} · 文本长度 ${encoded.display.length}`;
    if (typeof setStatus === "function") setStatus("条形码生成成功");
  } catch (e) {
    meta.textContent = "生成失败: " + (e && e.message ? e.message : String(e));
    meta.style.color = "var(--danger)";
    barcodeCurrentDataUrl = null;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = 1;
      canvas.height = 1;
      ctx.clearRect(0, 0, 1, 1);
    }
  }
}

function barcodeDownload() {
  if (!barcodeCurrentDataUrl) {
    if (typeof toast === "function") toast("请先生成条形码");
    return;
  }
  const a = document.createElement("a");
  a.href = barcodeCurrentDataUrl;
  a.download = "barcode.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof toast === "function") toast("已下载 barcode.png");
}

async function barcodeCopyImage() {
  if (!barcodeCurrentDataUrl) {
    if (typeof toast === "function") toast("请先生成条形码");
    return;
  }
  const canvas = document.getElementById("barcodeCanvas");
  if (!navigator.clipboard || !window.ClipboardItem) {
    if (typeof toast === "function") toast("当前浏览器不支持图片复制");
    return;
  }
  try {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    if (typeof toast === "function") toast("图片已复制到剪贴板");
  } catch (e) {
    if (typeof toast === "function") toast("复制图片失败: " + e.message);
  }
}

function barcodeClear() {
  const input = document.getElementById("barcodeInput");
  const canvas = document.getElementById("barcodeCanvas");
  const meta = document.getElementById("barcodeMeta");
  if (input) input.value = "";
  if (meta) {
    meta.textContent = "";
    meta.style.color = "var(--text-muted)";
  }
  if (canvas) {
    canvas.width = 1;
    canvas.height = 1;
  }
  barcodeCurrentDataUrl = null;
  if (typeof setStatus === "function") setStatus("已清空");
}

if (typeof registerInit === "function") {
  registerInit("barcode", function () {});
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    encodeCode128,
    code128ToModules,
    encodeCode39,
    barcodeEncode,
    CODE128_START_A,
    CODE128_START_B,
    CODE128_START_C,
    CODE128_STOP,
    CODE39_MAP,
  };
}
