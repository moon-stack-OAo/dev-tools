// 密码强度检测（纯本地，不上传）

const PWD_STRENGTH_LEVELS = [
  { key: "empty", label: "未输入", min: -1 },
  { key: "weak", label: "弱", min: 0 },
  { key: "medium", label: "中", min: 40 },
  { key: "strong", label: "强", min: 60 },
  { key: "very-strong", label: "很强", min: 80 },
];

const PWD_COMMON_WEAK = [
  "password",
  "password1",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwertyuiop",
  "abc123",
  "abcd1234",
  "admin",
  "admin123",
  "root",
  "letmein",
  "welcome",
  "iloveyou",
  "monkey",
  "dragon",
  "master",
  "login",
  "passw0rd",
  "p@ssw0rd",
  "p@ssword",
  "111111",
  "000000",
  "666666",
  "888888",
  "654321",
  "1qaz2wsx",
  "qazwsx",
  "asdfgh",
  "zxcvbn",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "shadow",
  "michael",
  "jennifer",
  "superman",
  "batman",
  "trustno1",
  "hello",
  "charlie",
  "aa123456",
  "password!",
  "pass123",
  "test",
  "test123",
  "guest",
  "user",
  "default",
  "changeme",
];

const PWD_SEQ_PATTERNS = [
  "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba",
  "0123456789",
  "9876543210",
  "qwertyuiop",
  "poiuytrewq",
  "asdfghjkl",
  "lkjhgfdsa",
  "zxcvbnm",
  "mnbvcxz",
];

function pwdHasUpper(s) {
  return /[A-Z]/.test(s);
}

function pwdHasLower(s) {
  return /[a-z]/.test(s);
}

function pwdHasDigit(s) {
  return /[0-9]/.test(s);
}

function pwdHasSpecial(s) {
  return /[^A-Za-z0-9]/.test(s);
}

function pwdIsCommonWeak(s) {
  const lower = String(s).toLowerCase();
  if (PWD_COMMON_WEAK.indexOf(lower) >= 0) return true;
  for (let i = 0; i < PWD_COMMON_WEAK.length; i++) {
    const w = PWD_COMMON_WEAK[i];
    if (w.length >= 4 && lower.indexOf(w) >= 0) return true;
  }
  return false;
}

/** 是否包含连续键盘/字母/数字序列（长度 >= 3） */
function pwdHasSequential(s) {
  const lower = String(s).toLowerCase();
  if (lower.length < 3) return false;
  for (let p = 0; p < PWD_SEQ_PATTERNS.length; p++) {
    const seq = PWD_SEQ_PATTERNS[p];
    for (let i = 0; i <= seq.length - 3; i++) {
      if (lower.indexOf(seq.slice(i, i + 3)) >= 0) return true;
    }
  }
  // 通用升序/降序（如 abc / cba / 123 / 321）
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return true;
    if (a - b === 1 && b - c === 1) return true;
  }
  return false;
}

/** 是否包含连续重复字符（如 aaa / 111，长度 >= 3） */
function pwdHasRepeated(s) {
  return /(.)\1{2,}/.test(String(s));
}

function pwdScoreToLevel(score) {
  if (score < 0) return PWD_STRENGTH_LEVELS[0];
  let level = PWD_STRENGTH_LEVELS[1];
  for (let i = 1; i < PWD_STRENGTH_LEVELS.length; i++) {
    if (score >= PWD_STRENGTH_LEVELS[i].min) level = PWD_STRENGTH_LEVELS[i];
  }
  return level;
}

/**
 * 评估密码强度（纯函数，可单测）
 * @param {string} password
 * @returns {{
 *   score: number,
 *   level: string,
 *   label: string,
 *   checks: Array<{id:string,label:string,pass:boolean,weight:number}>,
 *   suggestions: string[],
 *   length: number
 * }}
 */
function evaluatePasswordStrength(password) {
  const pwd = password == null ? "" : String(password);
  const len = pwd.length;

  if (!len) {
    return {
      score: 0,
      level: "empty",
      label: "未输入",
      checks: [],
      suggestions: ["请输入待检测的密码"],
      length: 0,
    };
  }

  const checks = [
    {
      id: "len8",
      label: "长度 ≥ 8",
      pass: len >= 8,
      weight: 15,
    },
    {
      id: "len12",
      label: "长度 ≥ 12",
      pass: len >= 12,
      weight: 10,
    },
    {
      id: "len16",
      label: "长度 ≥ 16",
      pass: len >= 16,
      weight: 10,
    },
    {
      id: "upper",
      label: "包含大写字母",
      pass: pwdHasUpper(pwd),
      weight: 12,
    },
    {
      id: "lower",
      label: "包含小写字母",
      pass: pwdHasLower(pwd),
      weight: 12,
    },
    {
      id: "digit",
      label: "包含数字",
      pass: pwdHasDigit(pwd),
      weight: 12,
    },
    {
      id: "special",
      label: "包含特殊字符",
      pass: pwdHasSpecial(pwd),
      weight: 14,
    },
    {
      id: "not-common",
      label: "非常见弱密码",
      pass: !pwdIsCommonWeak(pwd),
      weight: 15,
    },
    {
      id: "no-seq",
      label: "无连续字符序列",
      pass: !pwdHasSequential(pwd),
      weight: 10,
    },
    {
      id: "no-repeat",
      label: "无连续重复字符",
      pass: !pwdHasRepeated(pwd),
      weight: 10,
    },
  ];

  let score = 0;
  for (let i = 0; i < checks.length; i++) {
    if (checks[i].pass) score += checks[i].weight;
  }

  // 长度额外加分（18+ 再给一点，上限 100）
  if (len >= 20) score += 5;
  else if (len >= 18) score += 3;

  // 常见弱密码直接压到弱区间
  if (pwdIsCommonWeak(pwd)) {
    score = Math.min(score, 25);
  }

  // 过短强制弱
  if (len < 6) {
    score = Math.min(score, 20);
  }

  score = Math.max(0, Math.min(100, score));
  const levelInfo = pwdScoreToLevel(score);

  const suggestions = [];
  if (len < 8) suggestions.push("将密码加长到至少 8 位");
  else if (len < 12) suggestions.push("建议长度至少 12 位以提升安全性");
  else if (len < 16) suggestions.push("可进一步加长到 16 位以上");
  if (!pwdHasUpper(pwd)) suggestions.push("加入大写字母（A-Z）");
  if (!pwdHasLower(pwd)) suggestions.push("加入小写字母（a-z）");
  if (!pwdHasDigit(pwd)) suggestions.push("加入数字（0-9）");
  if (!pwdHasSpecial(pwd)) suggestions.push("加入特殊字符（如 !@#$%^&*）");
  if (pwdIsCommonWeak(pwd)) suggestions.push("避免使用常见弱密码或字典词");
  if (pwdHasSequential(pwd)) suggestions.push("避免连续序列（如 abc、123、qwe）");
  if (pwdHasRepeated(pwd)) suggestions.push("避免连续重复字符（如 aaa、111）");
  if (suggestions.length === 0) {
    suggestions.push("强度良好，请妥善保管，勿在多处复用");
  }

  return {
    score: score,
    level: levelInfo.key,
    label: levelInfo.label,
    checks: checks,
    suggestions: suggestions,
    length: len,
  };
}

function pwdStrengthRender(result) {
  const scoreEl = document.getElementById("pwdstrengthScore");
  const labelEl = document.getElementById("pwdstrengthLabel");
  const barEl = document.getElementById("pwdstrengthBar");
  const checksEl = document.getElementById("pwdstrengthChecks");
  const tipsEl = document.getElementById("pwdstrengthTips");
  if (!scoreEl || !labelEl || !barEl || !checksEl || !tipsEl) return;

  scoreEl.textContent = result.level === "empty" ? "—" : String(result.score);
  labelEl.textContent = result.label;
  labelEl.className = "pwdstrength-label pwdstrength-level-" + result.level;
  barEl.style.width = (result.level === "empty" ? 0 : result.score) + "%";
  barEl.className = "pwdstrength-bar-fill pwdstrength-level-" + result.level;

  if (!result.checks.length) {
    checksEl.innerHTML =
      '<div class="pwdstrength-check-empty">输入密码后显示检查项</div>';
  } else {
    checksEl.innerHTML = result.checks
      .map(function (c) {
        const icon = c.pass ? "✓" : "✗";
        const cls = c.pass ? "pass" : "fail";
        return (
          '<div class="pwdstrength-check ' +
          cls +
          '"><span class="pwdstrength-check-icon">' +
          icon +
          "</span><span>" +
          escapeHtml(c.label) +
          "</span></div>"
        );
      })
      .join("");
  }

  tipsEl.innerHTML = result.suggestions
    .map(function (t) {
      return "<li>" + escapeHtml(t) + "</li>";
    })
    .join("");
}

function pwdStrengthCheck() {
  const input = document.getElementById("pwdstrengthInput");
  if (!input) return;
  const result = evaluatePasswordStrength(input.value);
  pwdStrengthRender(result);
  if (result.level === "empty") {
    setStatus("请输入密码");
  } else {
    setStatus("强度: " + result.label + "（" + result.score + " 分）");
  }
}

function pwdStrengthToggleVisibility() {
  const input = document.getElementById("pwdstrengthInput");
  const btn = document.getElementById("pwdstrengthToggle");
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (btn) btn.textContent = "隐藏";
  } else {
    input.type = "password";
    if (btn) btn.textContent = "显示";
  }
}

function pwdStrengthClear() {
  const input = document.getElementById("pwdstrengthInput");
  if (input) {
    input.value = "";
    input.type = "password";
  }
  const btn = document.getElementById("pwdstrengthToggle");
  if (btn) btn.textContent = "显示";
  pwdStrengthRender(evaluatePasswordStrength(""));
  setStatus("已清空");
}

function pwdStrengthInit() {
  const input = document.getElementById("pwdstrengthInput");
  if (!input) return;
  input.addEventListener("input", pwdStrengthCheck);
  pwdStrengthRender(evaluatePasswordStrength(""));
}

if (typeof registerInit === "function") {
  registerInit("pwdstrength", pwdStrengthInit);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    evaluatePasswordStrength: evaluatePasswordStrength,
    pwdHasUpper: pwdHasUpper,
    pwdHasLower: pwdHasLower,
    pwdHasDigit: pwdHasDigit,
    pwdHasSpecial: pwdHasSpecial,
    pwdIsCommonWeak: pwdIsCommonWeak,
    pwdHasSequential: pwdHasSequential,
    pwdHasRepeated: pwdHasRepeated,
    pwdScoreToLevel: pwdScoreToLevel,
    PWD_STRENGTH_LEVELS: PWD_STRENGTH_LEVELS,
  };
}
