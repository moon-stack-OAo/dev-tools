function yamlProcess(fn) {
  const raw = document.getElementById("yamlInput").value;
  const out = document.getElementById("yamlOutput");
  if (!raw.trim()) {
    out.textContent = "请输入内容";
    out.className = "output-box error";
    return;
  }
  try {
    out.textContent = fn(raw);
    out.className = "output-box";
    setStatus("YAML 处理成功");
  } catch (e) {
    const title =
      e && e.name === "YAMLException" ? "YAML 解析错误" : "处理错误";
    reportParseError(out, "yamlInput", raw, e, title);
    setStatus("YAML 处理失败");
  }
}

function yamlDumpOpts() {
  // 格式化默认保留键顺序，避免静默按字母排序打乱配置语义
  return {
    indent: 2,
    lineWidth: -1,
    noCompatMode: true,
    sortKeys: false,
  };
}

function yamlFormat() {
  yamlProcess((raw) => jsyaml.dump(jsyaml.load(raw), yamlDumpOpts()));
}

function yamlToJson() {
  yamlProcess((raw) => JSON.stringify(jsyaml.load(raw), null, 2));
}

function jsonToYaml() {
  yamlProcess((raw) => jsyaml.dump(JSON.parse(raw), yamlDumpOpts()));
}
