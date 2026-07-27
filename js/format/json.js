function jsonProcess(fn) {
  const raw = document.getElementById("jsonInput").value;
  const out = document.getElementById("jsonOutput");
  if (!raw.trim()) {
    out.textContent = "请输入 JSON";
    out.className = "output-box error";
    return;
  }
  try {
    const p = JSON.parse(raw);
    out.textContent = fn(p);
    out.className = "output-box";
    setStatus("JSON 处理成功");
  } catch (e) {
    reportParseError(out, "jsonInput", raw, e, "JSON 解析错误");
    setStatus("JSON 解析失败");
  }
}

function jsonFormat() {
  jsonProcess((v) => JSON.stringify(v, null, 2));
}

function jsonCompress() {
  jsonProcess((v) => JSON.stringify(v));
}

function jsonValidate() {
  const raw = document.getElementById("jsonInput").value;
  const out = document.getElementById("jsonOutput");
  if (!raw.trim()) {
    out.textContent = "请输入 JSON";
    out.className = "output-box error";
    return;
  }
  try {
    JSON.parse(raw);
    out.textContent = "✓ 有效的 JSON";
    out.className = "output-box";
    setStatus("JSON 有效");
  } catch (e) {
    reportParseError(out, "jsonInput", raw, e, "无效的 JSON");
    setStatus("JSON 无效");
  }
}
