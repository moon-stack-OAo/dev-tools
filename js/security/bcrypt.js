// bcrypt 加密 / 验证
// 依赖：dcodeIO.bcrypt（由 /lib/bcrypt.min.js 提供，UMD 暴露）

/** 规范化并校验 cost（4~14），非法则抛错 */
function bcryptNormalizeRounds(rounds) {
  const r = parseInt(rounds, 10);
  const n = Number.isFinite(r) ? r : 10;
  if (n < 4 || n > 14) {
    throw new Error("cost 必须在 4~14 之间");
  }
  return n;
}

/** 校验哈希输入，返回规范化后的明文与哈希 */
function bcryptValidateVerifyInput(pwd, hash) {
  const h = hash == null ? "" : String(hash).trim();
  if (!pwd || !h) {
    throw new Error("请输入明文和哈希值");
  }
  return { pwd: String(pwd), hash: h };
}

/** 纯函数：生成 bcrypt 哈希（需注入 bcrypt 实现，如 dcodeIO.bcrypt / bcryptjs） */
function bcryptHashSync(pwd, rounds, bcryptImpl) {
  if (!pwd) {
    throw new Error("请输入明文密码");
  }
  if (!bcryptImpl || typeof bcryptImpl.hashSync !== "function") {
    throw new Error("bcrypt 库未加载");
  }
  const r = bcryptNormalizeRounds(rounds);
  return bcryptImpl.hashSync(String(pwd), r);
}

/** 纯函数：校验密码与哈希是否匹配 */
function bcryptCompareSync(pwd, hash, bcryptImpl) {
  if (!bcryptImpl || typeof bcryptImpl.compareSync !== "function") {
    throw new Error("bcrypt 库未加载");
  }
  const input = bcryptValidateVerifyInput(pwd, hash);
  return bcryptImpl.compareSync(input.pwd, input.hash);
}

async function bcryptHash() {
  const pwd = document.getElementById("bcryptPwd").value;
  const roundsRaw = document.getElementById("bcryptRounds").value;
  const out = document.getElementById("bcryptOutput");
  try {
    const rounds = bcryptNormalizeRounds(roundsRaw);
    const impl = typeof dcodeIO !== "undefined" ? dcodeIO.bcrypt : null;
    setStatus("正在计算（cost=" + rounds + "）...");
    // 让 UI 有机会刷新
    await new Promise((r) => setTimeout(r, 10));
    const hash = bcryptHashSync(pwd, rounds, impl);
    out.textContent = hash;
    out.className = "output-box";
    setStatus("bcrypt 哈希已生成");
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    out.textContent =
      msg.indexOf("cost") >= 0 || msg.indexOf("明文") >= 0 || msg.indexOf("库") >= 0
        ? msg
        : "生成失败: " + msg;
    out.className = "output-box error";
  }
}

function bcryptVerify() {
  const pwd = document.getElementById("bcryptVerifyPwd").value;
  const hash = document.getElementById("bcryptVerifyHash").value;
  const out = document.getElementById("bcryptVerifyOutput");
  try {
    const ok = bcryptCompareSync(
      pwd,
      hash,
      typeof dcodeIO !== "undefined" ? dcodeIO.bcrypt : null,
    );
    out.textContent = ok ? "✓ 匹配" : "✗ 不匹配";
    out.className = "output-box" + (ok ? "" : " error");
    out.style.color = ok ? "var(--accent)" : "var(--danger)";
    setStatus(ok ? "密码匹配" : "密码不匹配");
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    out.textContent =
      msg.indexOf("明文") >= 0 || msg.indexOf("库") >= 0 ? msg : "验证失败: " + msg;
    out.className = "output-box error";
  }
}

function bcryptClear() {
  document.getElementById("bcryptPwd").value = "";
  document.getElementById("bcryptOutput").textContent = "";
  document.getElementById("bcryptVerifyPwd").value = "";
  document.getElementById("bcryptVerifyHash").value = "";
  document.getElementById("bcryptVerifyOutput").textContent = "";
  setStatus("已清空");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    bcryptNormalizeRounds: bcryptNormalizeRounds,
    bcryptValidateVerifyInput: bcryptValidateVerifyInput,
    bcryptHashSync: bcryptHashSync,
    bcryptCompareSync: bcryptCompareSync,
  };
}
