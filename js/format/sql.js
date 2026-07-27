function sqlFormat() {
  const raw = document.getElementById("sqlInput").value;
  const dialect = document.getElementById("sqlDialect").value;
  const out = document.getElementById("sqlOutput");
  if (!raw.trim()) {
    out.textContent = "请输入 SQL";
    out.className = "output-box error";
    return;
  }
  try {
    // sql-formatter v15+：keywordCase / tabWidth（旧版 uppercase/indent 已失效）
    out.textContent = sqlFormatter.format(raw, {
      language: dialect,
      tabWidth: 2,
      keywordCase: "upper",
    });
    out.className = "output-box";
    setStatus("SQL 格式化成功");
  } catch (e) {
    out.textContent = "SQL 格式化失败: " + e.message;
    out.className = "output-box error";
  }
}
