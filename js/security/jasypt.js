// Jasypt / 配置加解密
// 兼容 jasypt 默认算法 PBEWithMD5AndDES（Spring Boot 1.x / 老版本 jasypt-spring-boot 常见配置）
//
// 算法要点（与 Java javax.crypto PBEWithMD5AndDES 一致）：
// 1. 随机 8 字节 salt
// 2. 密钥派生：dk = MD5(password || salt)，再迭代 MD5(dk) 共 iterations 次（默认 1000）
//    前 8 字节为 DES key，后 8 字节为 CBC IV
// 3. DES-CBC + PKCS#7 填充
// 4. 输出 Base64(salt || ciphertext)；可选 ENC(...) 包装
//
// 注意：DES 已过时，仅用于兼容遗留配置；新项目请用 jasypt 的 PBEWITHHMACSHA512ANDAES_256 等。

const JASYPT_SALT_SIZE = 8;
const JASYPT_DEFAULT_ITERATIONS = 1000;

// ========== MD5（纯 JS，与 RFC 1321 一致）==========
const JASYPT_MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];
const JASYPT_MD5_K = new Uint32Array([
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
  0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
  0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
  0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
  0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
  0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]);

function jasyptRotl32(n, b) {
  n = n | 0;
  b = b & 31;
  return (n << b) | (n >>> (32 - b));
}

/** MD5 摘要，输入/输出均为 Uint8Array */
function jasyptMd5(bytes) {
  const len = bytes.length;
  const zeros = (56 - ((len + 1) % 64) + 64) % 64;
  const padded = new Uint8Array(len + 1 + zeros + 8);
  padded.set(bytes);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(len / 0x20000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < padded.length; i += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(i + j * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let j = 0; j < 64; j++) {
      let F;
      let g;
      if (j < 16) {
        F = (B & C) | (~B & D);
        g = j;
      } else if (j < 32) {
        F = (D & B) | (~D & C);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        F = B ^ C ^ D;
        g = (3 * j + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * j) % 16;
      }
      const t = D;
      D = C;
      C = B;
      B =
        (B +
          jasyptRotl32(
            (A + F + JASYPT_MD5_K[j] + M[g]) | 0,
            JASYPT_MD5_S[j],
          )) |
        0;
      A = t;
    }
    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0, true);
  odv.setUint32(4, b0, true);
  odv.setUint32(8, c0, true);
  odv.setUint32(12, d0, true);
  return out;
}

// ========== DES-CBC（纯 JS，FIPS 46-3 表）==========
const JASYPT_DES_IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38,
  30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8, 57, 49, 41, 33, 25, 17, 9, 1,
  59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39,
  31, 23, 15, 7,
];
const JASYPT_DES_FP = [
  40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14,
  54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60, 28,
  35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9,
  49, 17, 57, 25,
];
const JASYPT_DES_E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15,
  16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28,
  29, 28, 29, 30, 31, 32, 1,
];
const JASYPT_DES_P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32,
  27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
];
const JASYPT_DES_SBOX = [
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2,
    13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7,
    3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
  ],
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8,
    14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9,
    3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
  ],
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6,
    10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5,
    10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
  ],
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15,
    0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14,
    5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
  ],
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7,
    13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6,
    3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
  ],
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12,
    9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1,
    13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
  ],
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1,
    10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0,
    5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
  ],
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3,
    7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13,
    15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
  ],
];
const JASYPT_DES_PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35,
  27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38,
  30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
];
const JASYPT_DES_PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27,
  20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34,
  53, 46, 42, 50, 36, 29, 32,
];
const JASYPT_DES_SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

function jasyptBytesToBits(bytes) {
  const bits = new Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < 8; j++) {
      bits[i * 8 + j] = (bytes[i] >>> (7 - j)) & 1;
    }
  }
  return bits;
}

function jasyptBitsToBytes(bits) {
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i * 8 + j];
    bytes[i] = v;
  }
  return bytes;
}

function jasyptPermute(bits, table) {
  const out = new Array(table.length);
  for (let i = 0; i < table.length; i++) out[i] = bits[table[i] - 1];
  return out;
}

function jasyptLeftRotate(bits, n) {
  return bits.slice(n).concat(bits.slice(0, n));
}

function jasyptGenerateSubkeys(key8) {
  const keyBits = jasyptBytesToBits(key8);
  const pc1 = jasyptPermute(keyBits, JASYPT_DES_PC1);
  let C = pc1.slice(0, 28);
  let D = pc1.slice(28);
  const subkeys = [];
  for (let i = 0; i < 16; i++) {
    C = jasyptLeftRotate(C, JASYPT_DES_SHIFTS[i]);
    D = jasyptLeftRotate(D, JASYPT_DES_SHIFTS[i]);
    subkeys.push(jasyptPermute(C.concat(D), JASYPT_DES_PC2));
  }
  return subkeys;
}

function jasyptDesF(R, subkey) {
  const expanded = jasyptPermute(R, JASYPT_DES_E);
  const xored = expanded.map((b, i) => b ^ subkey[i]);
  const sOut = [];
  for (let i = 0; i < 8; i++) {
    const chunk = xored.slice(i * 6, i * 6 + 6);
    const row = (chunk[0] << 1) | chunk[5];
    const col =
      (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
    let val = JASYPT_DES_SBOX[i][row * 16 + col];
    for (let j = 3; j >= 0; j--) sOut.push((val >>> j) & 1);
  }
  return jasyptPermute(sOut, JASYPT_DES_P);
}

function jasyptDesBlock(block8, subkeys, decrypt) {
  let bits = jasyptPermute(jasyptBytesToBits(block8), JASYPT_DES_IP);
  let L = bits.slice(0, 32);
  let R = bits.slice(32);
  const order = decrypt
    ? [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  for (let k = 0; k < 16; k++) {
    const i = order[k];
    const newL = R;
    const fOut = jasyptDesF(R, subkeys[i]);
    const newR = L.map((b, j) => b ^ fOut[j]);
    L = newL;
    R = newR;
  }
  return jasyptBitsToBytes(jasyptPermute(R.concat(L), JASYPT_DES_FP));
}

function jasyptPkcs7Pad(data, blockSize) {
  const pad = blockSize - (data.length % blockSize);
  const out = new Uint8Array(data.length + pad);
  out.set(data);
  out.fill(pad, data.length);
  return out;
}

function jasyptPkcs7Unpad(data) {
  if (!data.length) throw new Error("密文数据无效");
  const pad = data[data.length - 1];
  if (pad < 1 || pad > 8) throw new Error("解密失败: 填充错误（密码可能不正确）");
  for (let i = data.length - pad; i < data.length; i++) {
    if (data[i] !== pad) {
      throw new Error("解密失败: 填充错误（密码可能不正确）");
    }
  }
  return data.subarray(0, data.length - pad);
}

function jasyptDesCbcEncrypt(plain, key8, iv8) {
  const subkeys = jasyptGenerateSubkeys(key8);
  const padded = jasyptPkcs7Pad(plain, 8);
  const out = new Uint8Array(padded.length);
  let prev = iv8;
  for (let i = 0; i < padded.length; i += 8) {
    const block = new Uint8Array(8);
    for (let j = 0; j < 8; j++) block[j] = padded[i + j] ^ prev[j];
    const enc = jasyptDesBlock(block, subkeys, false);
    out.set(enc, i);
    prev = enc;
  }
  return out;
}

function jasyptDesCbcDecrypt(cipher, key8, iv8) {
  if (cipher.length === 0 || cipher.length % 8 !== 0) {
    throw new Error("密文长度无效");
  }
  const subkeys = jasyptGenerateSubkeys(key8);
  const out = new Uint8Array(cipher.length);
  let prev = iv8;
  for (let i = 0; i < cipher.length; i += 8) {
    const block = cipher.subarray(i, i + 8);
    const dec = jasyptDesBlock(block, subkeys, true);
    for (let j = 0; j < 8; j++) out[i + j] = dec[j] ^ prev[j];
    prev = block;
  }
  return jasyptPkcs7Unpad(out);
}

// ========== 编解码与密钥派生 ==========

/** Uint8Array → Base64（分块避免栈溢出） */
function jasyptBytesToBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Base64 → Uint8Array */
function jasyptBase64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * PBEWithMD5AndDES 密钥派生（PKCS#5 v1.5）
 * @param {string} password
 * @param {Uint8Array} salt 8 bytes
 * @param {number} iterations
 * @returns {{ key: Uint8Array, iv: Uint8Array }}
 */
function jasyptDeriveKeyAndIv(password, salt, iterations) {
  const pwd = new TextEncoder().encode(password);
  let dk = new Uint8Array(pwd.length + salt.length);
  dk.set(pwd);
  dk.set(salt, pwd.length);
  dk = jasyptMd5(dk);
  for (let i = 1; i < iterations; i++) {
    dk = jasyptMd5(dk);
  }
  return { key: dk.subarray(0, 8), iv: dk.subarray(8, 16) };
}

/** 去掉 ENC(...) 包装，返回纯 Base64 */
function jasyptStripEncWrapper(text) {
  const s = String(text == null ? "" : text).trim();
  const m = /^ENC\(([\s\S]*)\)$/i.exec(s);
  return m ? m[1].trim() : s;
}

/** 规范化迭代次数 */
function jasyptNormalizeIterations(iterations) {
  const n = parseInt(iterations, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("迭代次数必须为正整数");
  }
  if (n > 100000) {
    throw new Error("迭代次数过大（最大 100000）");
  }
  return n;
}

/**
 * 加密（与 jasypt StandardPBEStringEncryptor / PBEWithMD5AndDES 兼容）
 * @param {string} plaintext
 * @param {string} password
 * @param {{ iterations?: number, wrapEnc?: boolean, salt?: Uint8Array }} [options]
 * @returns {string} Base64 或 ENC(Base64)
 */
function jasyptEncrypt(plaintext, password, options) {
  if (plaintext == null || plaintext === "") {
    throw new Error("请输入明文");
  }
  if (password == null || password === "") {
    throw new Error("请输入密码");
  }
  const opts = options || {};
  const iterations = jasyptNormalizeIterations(
    opts.iterations != null ? opts.iterations : JASYPT_DEFAULT_ITERATIONS,
  );
  let salt = opts.salt;
  if (!salt) {
    salt = new Uint8Array(JASYPT_SALT_SIZE);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(salt);
    } else {
      // Node 测试回退
      for (let i = 0; i < salt.length; i++) {
        salt[i] = Math.floor(Math.random() * 256);
      }
    }
  }
  if (salt.length !== JASYPT_SALT_SIZE) {
    throw new Error("salt 必须为 8 字节");
  }
  const { key, iv } = jasyptDeriveKeyAndIv(password, salt, iterations);
  const plainBytes = new TextEncoder().encode(String(plaintext));
  const cipherBytes = jasyptDesCbcEncrypt(plainBytes, key, iv);
  const combined = new Uint8Array(JASYPT_SALT_SIZE + cipherBytes.length);
  combined.set(salt);
  combined.set(cipherBytes, JASYPT_SALT_SIZE);
  const b64 = jasyptBytesToBase64(combined);
  return opts.wrapEnc ? "ENC(" + b64 + ")" : b64;
}

/**
 * 解密
 * @param {string} ciphertext Base64 或 ENC(Base64)
 * @param {string} password
 * @param {{ iterations?: number }} [options]
 * @returns {string}
 */
function jasyptDecrypt(ciphertext, password, options) {
  if (ciphertext == null || String(ciphertext).trim() === "") {
    throw new Error("请输入密文");
  }
  if (password == null || password === "") {
    throw new Error("请输入密码");
  }
  const opts = options || {};
  const iterations = jasyptNormalizeIterations(
    opts.iterations != null ? opts.iterations : JASYPT_DEFAULT_ITERATIONS,
  );
  const b64 = jasyptStripEncWrapper(ciphertext);
  let raw;
  try {
    raw = jasyptBase64ToBytes(b64);
  } catch (e) {
    throw new Error("密文不是合法 Base64");
  }
  if (raw.length < JASYPT_SALT_SIZE + 8) {
    throw new Error("密文数据太短");
  }
  const salt = raw.subarray(0, JASYPT_SALT_SIZE);
  const data = raw.subarray(JASYPT_SALT_SIZE);
  const { key, iv } = jasyptDeriveKeyAndIv(password, salt, iterations);
  const plainBytes = jasyptDesCbcDecrypt(data, key, iv);
  return new TextDecoder().decode(plainBytes);
}

// ========== UI ==========

function jasyptEncryptUi() {
  const input = document.getElementById("jasyptInput").value;
  const pwd = document.getElementById("jasyptPwd").value;
  const iterations = document.getElementById("jasyptIterations").value;
  const wrapEnc = document.getElementById("jasyptWrapEnc").checked;
  const out = document.getElementById("jasyptOutput");
  try {
    const result = jasyptEncrypt(input, pwd, {
      iterations: iterations,
      wrapEnc: wrapEnc,
    });
    out.textContent = result;
    out.className = "output-box";
    setStatus("Jasypt 加密完成");
  } catch (e) {
    out.textContent = e && e.message ? e.message : "加密失败";
    out.className = "output-box error";
  }
}

function jasyptDecryptUi() {
  const input = document.getElementById("jasyptInput").value;
  const pwd = document.getElementById("jasyptPwd").value;
  const iterations = document.getElementById("jasyptIterations").value;
  const out = document.getElementById("jasyptOutput");
  try {
    const result = jasyptDecrypt(input, pwd, { iterations: iterations });
    out.textContent = result;
    out.className = "output-box";
    setStatus("Jasypt 解密完成");
  } catch (e) {
    out.textContent =
      e && e.message ? e.message : "解密失败: 密码错误或数据损坏";
    out.className = "output-box error";
  }
}

function jasyptClear() {
  document.getElementById("jasyptInput").value = "";
  document.getElementById("jasyptPwd").value = "";
  document.getElementById("jasyptOutput").textContent = "";
  document.getElementById("jasyptOutput").className = "output-box";
  setStatus("已清空");
}

function jasyptLoadExample() {
  document.getElementById("jasyptPwd").value = "secret";
  document.getElementById("jasyptInput").value = "jdbc:mysql://localhost:3306/demo";
  document.getElementById("jasyptIterations").value = "1000";
  document.getElementById("jasyptWrapEnc").checked = true;
  document.getElementById("jasyptOutput").textContent = "";
  document.getElementById("jasyptOutput").className = "output-box";
  setStatus("已填入示例（密码 secret，可点加密）");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    JASYPT_SALT_SIZE,
    JASYPT_DEFAULT_ITERATIONS,
    jasyptMd5,
    jasyptDeriveKeyAndIv,
    jasyptEncrypt,
    jasyptDecrypt,
    jasyptStripEncWrapper,
    jasyptNormalizeIterations,
    jasyptBytesToBase64,
    jasyptBase64ToBytes,
    jasyptDesCbcEncrypt,
    jasyptDesCbcDecrypt,
  };
}
