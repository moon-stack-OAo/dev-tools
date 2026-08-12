const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LIB_DIR = path.join(__dirname, "..", "public", "lib");
const ROOT_DIR = path.join(__dirname, "..");

// 直接拷贝的库（源文件本身就是 UMD/IIFE 浏览器友好的）
const libs = [
  { src: "js-yaml/dist/js-yaml.min.js", dest: "js-yaml.min.js" },
  { src: "diff/dist/diff.min.js", dest: "diff.min.js" },
  { src: "blueimp-md5/js/md5.min.js", dest: "md5.min.js" },
  {
    src: "sql-formatter/dist/sql-formatter.min.js",
    dest: "sql-formatter.min.js",
  },
  { src: "bcryptjs/dist/bcrypt.min.js", dest: "bcrypt.min.js" },
  { src: "sm-crypto/dist/sm2.js", dest: "sm2.min.js" },
  { src: "sm-crypto/dist/sm3.js", dest: "sm3.min.js" },
  { src: "sm-crypto/dist/sm4.js", dest: "sm4.min.js" },
  { src: "ua-parser-js/dist/ua-parser.min.js", dest: "ua-parser.min.js" },
  { src: "marked/marked.min.js", dest: "marked.min.js" },
  { src: "jszip/dist/jszip.min.js", dest: "jszip.min.js" },
  { src: "jsqr/dist/jsQR.js", dest: "jsqr.min.js" },
  { src: "jspdf/dist/jspdf.umd.min.js", dest: "jspdf.min.js" },
  { src: "pdf-lib/dist/pdf-lib.min.js", dest: "pdf-lib.min.js" },
  { src: "xlsx/dist/xlsx.full.min.js", dest: "xlsx.min.js" },
];

// 需要 esbuild 打包为 IIFE 浏览器友好格式的库
const bundles = [
  {
    entry: "jsonpath-plus/dist/index-browser-umd.min.cjs",
    dest: "jsonpath.min.js",
    globalName: "JSONPath",
  },
  {
    entry: "ajv/dist/ajv.js",
    dest: "ajv.min.js",
    globalName: "Ajv",
  },
  {
    entry: "fast-xml-parser/src/fxp.js",
    dest: "fxp.min.js",
    globalName: "FXP",
  },
  {
    entry: "js-beautify/js/src/index.js",
    dest: "js-beautify.min.js",
    globalName: "Beautify",
  },
  {
    entry: "sucrase/dist/index.js",
    dest: "sucrase.min.js",
    globalName: "sucrase",
  },
  {
    entry: "qrcode/lib/browser.js",
    dest: "qrcode.min.js",
    globalName: "QRCode",
  },
  {
    // T8 X.509 证书解析：ASN.1 解码库
    entry: "asn1js/build/index.es.js",
    dest: "asn1js.min.js",
    globalName: "ASN1",
  },
  {
    // T8 X.509 证书解析：PKI/X.509 高级 API
    entry: "pkijs/build/index.es.js",
    dest: "pkijs.min.js",
    globalName: "PKI",
  },
  {
    // CodeMirror 6 封装：jsrun / pyrun 代码编辑器
    entry: "scripts/cm-editor-entry.js",
    dest: "cm-editor.min.js",
    globalName: "CMEditor",
  },
];

if (!fs.existsSync(LIB_DIR)) {
  fs.mkdirSync(LIB_DIR, { recursive: true });
}

// 直接拷贝
libs.forEach(({ src, dest }) => {
  const srcPath = path.join(ROOT_DIR, "node_modules", src);
  const destPath = path.join(LIB_DIR, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ ${dest}`);
  } else {
    console.error(`✗ 未找到 ${srcPath}，请先执行 npm install`);
    process.exit(1);
  }
});

// esbuild 打包
const esbuildBin = path.join(
  ROOT_DIR,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

/**
 * 解析 bundle 入口路径：
 * - entry 以 scripts/ 开头，或 ROOT 下已存在该相对路径 → 项目内入口
 * - 否则走 node_modules
 */
function resolveBundleEntry(entry) {
  const rootCandidate = path.isAbsolute(entry)
    ? entry
    : path.join(ROOT_DIR, entry);
  if (
    entry.startsWith("scripts/") ||
    entry.startsWith("scripts\\") ||
    fs.existsSync(rootCandidate)
  ) {
    return rootCandidate;
  }
  return path.join(ROOT_DIR, "node_modules", entry);
}

bundles.forEach(({ entry, dest, globalName }) => {
  const entryPath = resolveBundleEntry(entry);
  const destPath = path.join(LIB_DIR, dest);
  if (!fs.existsSync(entryPath)) {
    console.error(`✗ 未找到 ${entryPath}，请先执行 npm install`);
    process.exit(1);
  }
  const cmd = `"${esbuildBin}" --bundle --format=iife --global-name=${globalName} --minify --target=es2017 --outfile="${destPath}" "${entryPath}"`;
  try {
    execSync(cmd, { stdio: "pipe", cwd: ROOT_DIR });
    console.log(`✓ ${dest} (bundled)`);
  } catch (e) {
    console.error(`✗ esbuild 打包 ${entry} 失败: ${e.message}`);
    process.exit(1);
  }
});

console.log("\n依赖库已复制到 public/lib/");

// pyrun 工具说明：Pyodide（CPython→WASM 运行时）未通过 npm 安装，
// 其 ~13MB 核心文件（pyodide.js / pyodide.asm.js / pyodide.asm.wasm / pyodide-lock.json / python_stdlib.zip）
// 需手动下载到 public/lib/pyodide/。首次使用前执行：
//   powershell -ExecutionPolicy Bypass -File scripts/download-pyodide.ps1
// 脚本幂等，可重复运行。详见 README.md「本地化依赖列表」章节。
