function yamlProcess(fn) {
    const raw = document.getElementById('yamlInput').value;
    const out = document.getElementById('yamlOutput');
    if (!raw.trim()) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = fn(raw);
        out.className = 'output-box';
        setStatus('YAML 处理成功');
    } catch (e) {
        out.textContent = '错误: ' + e.message;
        out.className = 'output-box error';
    }
}

function yamlFormat() {
    yamlProcess(raw => jsyaml.dump(jsyaml.load(raw), {
        indent: 2,
        lineWidth: -1,
        noCompatMode: true,
        sortKeys: true
    }));
}

function yamlToJson() {
    yamlProcess(raw => JSON.stringify(jsyaml.load(raw), null, 2));
}

function jsonToYaml() {
    yamlProcess(raw => jsyaml.dump(JSON.parse(raw), {
        indent: 2,
        lineWidth: -1,
        noCompatMode: true,
        sortKeys: true
    }));
}
