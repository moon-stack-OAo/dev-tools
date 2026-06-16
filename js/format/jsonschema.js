// JSON Schema 生成 / 校验

const JSONSCHEMA_SAMPLE_DATA = {
    id: 1001,
    name: 'alice',
    email: 'alice@example.com',
    age: 30,
    active: true,
    role: 'admin',
    tags: ['vip', 'beta'],
    address: {
        city: 'Shanghai',
        zip: '200000'
    },
    createdAt: '2024-01-15T10:30:00Z'
};

const JSONSCHEMA_SAMPLE_SCHEMA = {
    type: 'object',
    properties: {
        id: {type: 'integer'},
        name: {type: 'string', minLength: 1},
        email: {type: 'string', format: 'email'},
        age: {type: 'integer', minimum: 0},
        active: {type: 'boolean'},
        role: {type: 'string', enum: ['admin', 'user', 'guest']},
        tags: {type: 'array', items: {type: 'string'}},
        address: {
            type: 'object',
            properties: {
                city: {type: 'string'},
                zip: {type: 'string'}
            },
            required: ['city']
        },
        createdAt: {type: 'string', format: 'date-time'}
    },
    required: ['id', 'name', 'email']
};

const JSONSCHEMA_SAMPLE_VALID_DATA = JSON.stringify({
    id: 1001,
    name: 'alice',
    email: 'alice@example.com',
    age: 30,
    active: true,
    role: 'admin',
    tags: ['vip', 'beta'],
    address: {city: 'Shanghai', zip: '200000'},
    createdAt: '2024-01-15T10:30:00Z'
}, null, 2);

let ajvInstance = null;

function getAjv() {
    if (ajvInstance) return ajvInstance;
    if (typeof Ajv === 'undefined') {
        toast('Ajv 库未加载');
        return null;
    }
    ajvInstance = new Ajv({allErrors: true, strict: false});
    return ajvInstance;
}

function jsonschemaSwitchTab(tab) {
    const tabs = document.querySelectorAll('#panel-jsonschema .tab-bar .tab');
    const contents = document.querySelectorAll('#panel-jsonschema .tab-content');
    tabs.forEach((t, i) => {
        const map = ['gen', 'valid'];
        t.classList.toggle('active', map[i] === tab);
    });
    contents.forEach(c => c.classList.toggle('active', c.id === 'jsonschemaTab-' + tab));
}

// === Schema 推断 ===
function inferType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function inferExample(value) {
    if (value === null) return null;
    if (Array.isArray(value)) {
        if (value.length === 0) return [];
        return [inferExample(value[0])];
    }
    return value;
}

function inferSchema(value) {
    const type = inferType(value);
    const schema = {type};
    if (type === 'object') {
        const properties = {};
        const required = [];
        for (const k of Object.keys(value)) {
            properties[k] = inferSchema(value[k]);
            if (value[k] !== null && !(Array.isArray(value[k]) && value[k].length === 0)) {
                required.push(k);
            }
        }
        schema.properties = properties;
        if (required.length) schema.required = required;
    } else if (type === 'array') {
        if (value.length > 0) {
            schema.items = inferSchema(value[0]);
            schema.examples = [inferExample(value[0])];
        } else {
            schema.items = {};
        }
    } else {
        schema.examples = [value];
    }
    return schema;
}

function jsonschemaGenerate() {
    const raw = document.getElementById('jsonschemaInput').value;
    const out = document.getElementById('jsonschemaOutput');
    if (!raw.trim()) {
        out.textContent = '请输入 JSON 数据';
        out.className = 'output-box error';
        return;
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        out.textContent = 'JSON 解析错误: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    try {
        const schema = inferSchema(data);
        const finalSchema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            ...schema
        };
        out.textContent = JSON.stringify(finalSchema, null, 2);
        out.className = 'output-box';
        setStatus('JSON Schema 生成成功');
    } catch (e) {
        out.textContent = '生成失败: ' + e.message;
        out.className = 'output-box error';
    }
}

// === 校验 ===
function jsonschemaValidate() {
    const dataRaw = document.getElementById('jsonschemaData').value;
    const schRaw = document.getElementById('jsonschemaSch').value;
    const out = document.getElementById('jsonschemaValidResult');

    if (!dataRaw.trim()) {
        out.textContent = '请输入待校验的 JSON 数据';
        out.className = 'output-box error';
        return;
    }
    if (!schRaw.trim()) {
        out.textContent = '请输入 JSON Schema';
        out.className = 'output-box error';
        return;
    }
    let data, schema;
    try {
        data = JSON.parse(dataRaw);
    } catch (e) {
        out.textContent = 'JSON 数据解析错误: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    try {
        schema = JSON.parse(schRaw);
    } catch (e) {
        out.textContent = 'JSON Schema 解析错误: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    const ajv = getAjv();
    if (!ajv) {
        out.textContent = 'Ajv 库未加载';
        out.className = 'output-box error';
        return;
    }
    try {
        const validate = ajv.compile(schema);
        const valid = validate(data);
        if (valid) {
            out.textContent = '✓ 校验通过：数据符合 Schema 约束';
            out.className = 'output-box';
            setStatus('校验通过');
        } else {
            const lines = ['✗ 校验失败，共 ' + validate.errors.length + ' 个错误：', ''];
            validate.errors.forEach((err, idx) => {
                const path = err.instancePath || '(root)';
                const params = err.params ? ' ' + JSON.stringify(err.params) : '';
                lines.push(`[${idx + 1}] ${path} ${err.message}${params}`);
            });
            out.textContent = lines.join('\n');
            out.className = 'output-box error';
            setStatus('校验失败');
        }
    } catch (e) {
        out.textContent = '编译 Schema 失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function jsonschemaClear(which) {
    if (which === 'valid') {
        document.getElementById('jsonschemaData').value = '';
        document.getElementById('jsonschemaSch').value = '';
        document.getElementById('jsonschemaValidResult').textContent = '';
    } else {
        document.getElementById('jsonschemaInput').value = '';
        document.getElementById('jsonschemaOutput').textContent = '';
    }
    setStatus('已清空');
}

function jsonschemaLoadSample(which) {
    if (which === 'valid') {
        document.getElementById('jsonschemaData').value = JSONSCHEMA_SAMPLE_VALID_DATA;
        document.getElementById('jsonschemaSch').value = JSON.stringify(JSONSCHEMA_SAMPLE_SCHEMA, null, 2);
        document.getElementById('jsonschemaValidResult').textContent = '';
    } else {
        document.getElementById('jsonschemaInput').value = JSON.stringify(JSONSCHEMA_SAMPLE_DATA, null, 2);
        document.getElementById('jsonschemaOutput').textContent = '';
    }
    setStatus('已加载示例');
}