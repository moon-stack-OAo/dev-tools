// ULID / NanoID 生成与 ULID 解析（纯 JS，无第三方依赖）

// Crockford Base32（ULID 规范，排除 I L O U）
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ULID_LOOKUP = (function () {
  const map = Object.create(null);
  for (let i = 0; i < ULID_ALPHABET.length; i++) {
    map[ULID_ALPHABET[i]] = i;
    map[ULID_ALPHABET[i].toLowerCase()] = i;
  }
  // Crockford 常见别名
  map.I = map.i = 1;
  map.L = map.l = 1;
  map.O = map.o = 0;
  return map;
})();

const NANOID_ALPHABETS = {
  default: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  "url-safe":
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-",
};

function ulidGetCrypto() {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof crypto !== "undefined") return crypto;
  throw new Error("当前环境不支持 Web Crypto");
}

function ulidRandomBytes(n) {
  const bytes = new Uint8Array(n);
  ulidGetCrypto().getRandomValues(bytes);
  return bytes;
}

/** 将时间戳（毫秒）编码为 10 位 Crockford Base32 */
function ulidEncodeTime(ms, len) {
  len = len == null ? 10 : len;
  let t = Number(ms);
  if (!Number.isFinite(t) || t < 0) throw new Error("无效时间戳");
  if (t > 0xffffffffffff) throw new Error("时间戳超过 48 位");
  let str = "";
  for (let i = len; i > 0; i--) {
    const mod = t % 32;
    str = ULID_ALPHABET[mod] + str;
    t = Math.floor(t / 32);
  }
  return str;
}

/** 生成 16 位随机 Crockford Base32（80 bit） */
function ulidEncodeRandom(len) {
  len = len == null ? 16 : len;
  const bytes = ulidRandomBytes(len);
  let str = "";
  for (let i = 0; i < len; i++) {
    str += ULID_ALPHABET[bytes[i] & 31];
  }
  return str;
}

/**
 * 生成标准 ULID（26 字符）
 * @param {number} [time=Date.now()] 毫秒时间戳
 * @returns {string}
 */
function generateUlid(time) {
  const ts = time == null ? Date.now() : Number(time);
  return ulidEncodeTime(ts, 10) + ulidEncodeRandom(16);
}

/**
 * 解析 ULID：返回时间戳（ms）与格式化时间
 * @param {string} id
 * @returns {{ id: string, timestamp: number, iso: string, localTime: string }}
 */
function parseUlid(id) {
  const raw = String(id == null ? "" : id).trim();
  if (!raw) throw new Error("ULID 为空");
  if (raw.length !== 26) throw new Error("ULID 须为 26 个字符");
  let time = 0;
  for (let i = 0; i < 10; i++) {
    const ch = raw[i];
    const v = ULID_LOOKUP[ch];
    if (v === undefined) throw new Error("非法 ULID 字符: " + ch);
    time = time * 32 + v;
  }
  for (let i = 10; i < 26; i++) {
    const ch = raw[i];
    if (ULID_LOOKUP[ch] === undefined) throw new Error("非法 ULID 字符: " + ch);
  }
  const d = new Date(time);
  if (isNaN(d.getTime())) throw new Error("无法解析时间戳");
  const pad = (n, w) => String(n).padStart(w || 2, "0");
  const localTime =
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  return {
    id: raw.toUpperCase().replace(/[ILO]/g, (c) => {
      const u = c.toUpperCase();
      if (u === "I" || u === "L") return "1";
      if (u === "O") return "0";
      return c;
    }),
    timestamp: time,
    iso: d.toISOString(),
    localTime: localTime,
  };
}

/**
 * 生成 NanoID（无偏采样）
 * @param {number} [size=21]
 * @param {string} [alphabet]
 * @returns {string}
 */
function generateNanoid(size, alphabet) {
  const len = Math.min(Math.max(parseInt(size, 10) || 21, 2), 64);
  const chars =
    alphabet && alphabet.length >= 2
      ? alphabet
      : NANOID_ALPHABETS.default;
  const n = chars.length;
  const maxValid = 256 - (256 % n);
  let result = "";
  let remaining = len;
  let attempts = 0;
  while (remaining > 0) {
    const arr = ulidRandomBytes(remaining);
    let written = 0;
    for (let i = 0; i < remaining; i++) {
      if (arr[i] < maxValid) {
        result += chars[arr[i] % n];
        written++;
      }
    }
    remaining -= written;
    attempts++;
    if (attempts > 100) break;
  }
  return result;
}

function generateNanoidByKey(size, alphabetKey) {
  const key = alphabetKey === "url-safe" ? "url-safe" : "default";
  return generateNanoid(size, NANOID_ALPHABETS[key]);
}

// === UI ===

function ulidTypeChange() {
  const type = (document.getElementById("ulidType") || {}).value || "ulid";
  const opts = document.getElementById("ulidNanoOpts");
  if (opts) opts.style.display = type === "nanoid" ? "inline-flex" : "none";
}

function genUlid() {
  const type = (document.getElementById("ulidType") || {}).value || "ulid";
  const count = Math.min(
    Math.max(
      parseInt((document.getElementById("ulidCount") || {}).value, 10) || 1,
      1,
    ),
    100,
  );
  const list = document.getElementById("ulidList");
  if (!list) return;
  const empty = list.querySelector(".uuid-empty");
  if (empty) empty.remove();

  let nanoLen = 21;
  let alphaKey = "default";
  if (type === "nanoid") {
    nanoLen = Math.min(
      Math.max(
        parseInt((document.getElementById("ulidNanoLen") || {}).value, 10) ||
          21,
        2,
      ),
      64,
    );
    alphaKey =
      (document.getElementById("ulidNanoAlpha") || {}).value || "default";
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const id =
      type === "nanoid"
        ? generateNanoidByKey(nanoLen, alphaKey)
        : generateUlid();
    const badge = type === "nanoid" ? "NANO" : "ULID";
    const badgeCls =
      type === "nanoid" ? "uuid-badge-nanoid" : "uuid-badge-ulid";
    const div = document.createElement("div");
    div.className = "uuid-item";
    const safeId =
      typeof escapeHtml === "function" ? escapeHtml(id) : String(id);
    div.innerHTML =
      `<span class="uuid-badge ${badgeCls}">${badge}</span>` +
      `<span class="uuid-val">${safeId}</span>` +
      `<button class="sm outline" onclick="copyText(this.parentElement.querySelector('.uuid-val'))">复制</button>`;
    frag.appendChild(div);
  }
  list.insertBefore(frag, list.firstChild);
  while (list.children.length > 50) list.removeChild(list.lastChild);
  const copyAllBtn = document.getElementById("ulidCopyAllBtn");
  if (copyAllBtn) copyAllBtn.style.display = "";
  setStatus(
    type === "nanoid"
      ? `已生成 ${count} 个 NanoID（长度 ${nanoLen}）`
      : `已生成 ${count} 个 ULID`,
  );
}

function ulidClear() {
  const list = document.getElementById("ulidList");
  if (list) {
    list.innerHTML =
      '<div class="uuid-empty">点击「生成」按钮创建 ULID / NanoID</div>';
  }
  const copyAllBtn = document.getElementById("ulidCopyAllBtn");
  if (copyAllBtn) copyAllBtn.style.display = "none";
  const out = document.getElementById("ulidParseOutput");
  if (out) {
    out.textContent = "请粘贴 ULID 后点击「解析」";
    out.className = "output-box";
  }
  const inp = document.getElementById("ulidParseInput");
  if (inp) inp.value = "";
  setStatus("已清空");
}

function ulidCopyAll() {
  const spans = document.querySelectorAll("#ulidList .uuid-item .uuid-val");
  if (!spans.length) return;
  const text = Array.from(spans)
    .map((s) => s.textContent)
    .join("\n");
  safeCopy(text, `已复制 ${spans.length} 个 ID`);
}

function ulidParseInput() {
  const inp = document.getElementById("ulidParseInput");
  const out = document.getElementById("ulidParseOutput");
  if (!out) return;
  const raw = (inp && inp.value) || "";
  try {
    const p = parseUlid(raw);
    out.textContent =
      `ULID=${p.id}\n` +
      `时间戳(ms)=${p.timestamp}\n` +
      `UTC=${p.iso}\n` +
      `本地=${p.localTime}`;
    out.className = "output-box";
    setStatus("ULID 解析完成");
  } catch (e) {
    out.textContent = "解析失败：" + (e && e.message ? e.message : String(e));
    out.className = "output-box error";
    setStatus("ULID 解析失败");
  }
}

if (typeof window !== "undefined") {
  window.generateUlid = generateUlid;
  window.parseUlid = parseUlid;
  window.generateNanoid = generateNanoid;
  window.generateNanoidByKey = generateNanoidByKey;
  window.genUlid = genUlid;
  window.ulidClear = ulidClear;
  window.ulidCopyAll = ulidCopyAll;
  window.ulidParseInput = ulidParseInput;
  window.ulidTypeChange = ulidTypeChange;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ULID_ALPHABET,
    NANOID_ALPHABETS,
    generateUlid,
    parseUlid,
    generateNanoid,
    generateNanoidByKey,
    ulidEncodeTime,
  };
}
