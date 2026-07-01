// Bean Validation 注解生成器
// 根据字段类型与名称启发式推导 javax.validation 注解，输出完整 DTO 类
// 纯函数: fieldAnnoSpec / collectImports / inferValidations / parseJavaFields / generateBean
// UI 函数: bvInit / bvAddField / bvRemoveField / bvOpenImport / bvDoImport / bvGenerate / bvClearAll

// 字段类型 → 默认 Java import (用于 parseJavaFields 解析带包路径的类型)
const TYPE_DEFAULT_IMPORT = {
    Date: 'java.util.Date',
    LocalDate: 'java.time.LocalDate',
    LocalDateTime: 'java.time.LocalDateTime',
    LocalTime: 'java.time.LocalTime',
    BigDecimal: 'java.math.BigDecimal',
    BigInteger: 'java.math.BigInteger',
};

// 注解 → 完整类路径
const ANNO_IMPORT = {
    NotBlank: 'javax.validation.constraints.NotBlank',
    NotNull: 'javax.validation.constraints.NotNull',
    NotEmpty: 'javax.validation.constraints.NotEmpty',
    Size: 'javax.validation.constraints.Size',
    Min: 'javax.validation.constraints.Min',
    Max: 'javax.validation.constraints.Max',
    Email: 'javax.validation.constraints.Email',
    Pattern: 'javax.validation.constraints.Pattern',
    Past: 'javax.validation.constraints.Past',
    Future: 'javax.validation.constraints.Future',
    Digits: 'javax.validation.constraints.Digits',
    DecimalMin: 'javax.validation.constraints.DecimalMin',
    DecimalMax: 'javax.validation.constraints.DecimalMax',
    Validated: 'org.springframework.validation.annotation.Validated',
};

// 字段类型 → 推断出来的注解(不含必填@NotNull)
// 返回: [{anno, params, import}]
// opts: {intMax, dateType, string, number, decimal, date, heuristic}
function fieldAnnoSpec(type, name, opts) {
    const list = [];
    const t = (type || '').trim();
    const n = (name || '').toLowerCase();
    const o = opts || {};
    const intMax = typeof o.intMax === 'number' ? o.intMax : Number.MAX_SAFE_INTEGER;
    const dateType = o.dateType || '';
    // 分项开关,默认全开(便于测试与默认行为)
    const onStr = o.string !== false;
    const onNum = o.number !== false;
    const onDec = o.decimal !== false;
    const onDate = o.date !== false;
    const onHeu = o.heuristic !== false;

    switch (t) {
        case 'String': {
            if (onStr) {
                list.push({ anno: 'NotBlank', params: '', import: ANNO_IMPORT.NotBlank });
                list.push({ anno: 'Size', params: 'max = 255', import: ANNO_IMPORT.Size });
            }
            if (onHeu) {
                if (/(email|mail)/.test(n)) {
                    list.push({ anno: 'Email', params: '', import: ANNO_IMPORT.Email });
                }
                if (/(phone|mobile|tel)/.test(n)) {
                    list.push({
                        anno: 'Pattern',
                        params: 'regexp = "^1[3-9]\\d{9}$"',
                        import: ANNO_IMPORT.Pattern,
                    });
                }
                if (/(url|website|homepage|link)/.test(n)) {
                    list.push({
                        anno: 'Pattern',
                        params: 'regexp = "^(https?|ftp)://[^\\s]+$"',
                        import: ANNO_IMPORT.Pattern,
                    });
                }
                if (/(^|_)name(_|$)|username|realname|nickname/.test(n)) {
                    list.push({
                        anno: 'Pattern',
                        params: 'regexp = "[\\u4e00-\\u9fa5a-zA-Z·.\\s]{2,40}"',
                        import: ANNO_IMPORT.Pattern,
                    });
                }
                if (/(idcard|idcardno|identity|ident_no)/.test(n)) {
                    list.push({
                        anno: 'Pattern',
                        params: 'regexp = "^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$"',
                        import: ANNO_IMPORT.Pattern,
                    });
                }
            }
            break;
        }
        case 'Integer':
        case 'Long': {
            if (onNum) {
                list.push({ anno: 'Min', params: '0', import: ANNO_IMPORT.Min });
                if (onHeu && /(^|_)age(_|$)/.test(n)) {
                    list.push({ anno: 'Max', params: '150', import: ANNO_IMPORT.Max });
                } else {
                    list.push({ anno: 'Max', params: String(intMax), import: ANNO_IMPORT.Max });
                }
            }
            break;
        }
        case 'BigDecimal': {
            if (onDec) {
                list.push({ anno: 'Digits', params: 'integer = 10, fraction = 2', import: ANNO_IMPORT.Digits });
            }
            break;
        }
        case 'BigInteger': {
            if (onNum) {
                list.push({ anno: 'Min', params: '0', import: ANNO_IMPORT.Min });
            }
            break;
        }
        case 'Double':
        case 'Float': {
            if (onDec) {
                list.push({
                    anno: 'DecimalMin',
                    params: '"0.00"',
                    import: ANNO_IMPORT.DecimalMin,
                });
                list.push({
                    anno: 'DecimalMax',
                    params: '"9999999.99"',
                    import: ANNO_IMPORT.DecimalMax,
                });
            }
            break;
        }
        case 'Date':
        case 'LocalDate':
        case 'LocalDateTime': {
            if (onDate) {
                if (dateType === 'Past') {
                    list.push({ anno: 'Past', params: '', import: ANNO_IMPORT.Past });
                } else if (dateType === 'Future') {
                    list.push({ anno: 'Future', params: '', import: ANNO_IMPORT.Future });
                } else if (onHeu && /(birth|born)/.test(n)) {
                    list.push({ anno: 'Past', params: '', import: ANNO_IMPORT.Past });
                } else if (onHeu && /(expire|expiry|expir|deadline|end)/.test(n)) {
                    list.push({ anno: 'Future', params: '', import: ANNO_IMPORT.Future });
                }
            }
            break;
        }
        case 'Boolean':
            // 跳过
            break;
        default:
            break;
    }
    return list;
}

// 收集去重排序的 import 列表
// fieldSpecs: [{name, type, annotations:[{import, anno, params}], isCustom}]
// extras: 可选,额外的 import(如 Validated、Data 等)
function collectImports(fieldSpecs, extras) {
    const set = new Set();
    (extras || []).forEach((i) => set.add(i));
    (fieldSpecs || []).forEach((f) => {
        (f.annotations || []).forEach((a) => {
            if (a && a.import) set.add(a.import);
        });
        // 字段类型自带的 import
        if (f.typeImport) set.add(f.typeImport);
    });
    return [...set].sort();
}

// 推导字段级完整注解规格(含必填@NotNull + 自定义注解)
// fields: 来自 UI 的 [{name, type, required:bool, custom:string}]
// opts: {string,number,decimal,date,heuristic,requiredNotNull,dateType,intMax}
function inferValidations(fields, opts) {
    const o = opts || {};
    const requiredNotNull = o.requiredNotNull !== false;
    const dateType = o.dateType || '';
    const intMax = typeof o.intMax === 'number' ? o.intMax : Number.MAX_SAFE_INTEGER;
    const subOpts = {
        string: o.string !== false,
        number: o.number !== false,
        decimal: o.decimal !== false,
        date: o.date !== false,
        heuristic: o.heuristic !== false,
        intMax: intMax,
        dateType: dateType,
    };
    const out = [];

    for (const f of fields || []) {
        const name = (f.name || '').trim();
        const type = (f.type || '').trim();
        if (!name || !type) continue;

        const annos = [];
        const specs = fieldAnnoSpec(type, name, subOpts);
        specs.forEach((s) => annos.push(s));

        // 必填 → @NotNull(跳过 Boolean 与已含 NotBlank/NotNull)
        if (requiredNotNull && f.required && type !== 'Boolean') {
            const hasNot = annos.some((a) => a.anno === 'NotBlank' || a.anno === 'NotNull');
            if (!hasNot) {
                annos.unshift({ anno: 'NotNull', params: '', import: ANNO_IMPORT.NotNull });
            }
        }

        // 自定义注解
        const customText = (f.custom || '').trim();
        let isCustom = false;
        if (customText) {
            const parsed = parseCustomAnnotations(customText);
            if (parsed.length) {
                isCustom = true;
                parsed.forEach((p) => annos.push(p));
            }
        }

        const typeImport = TYPE_DEFAULT_IMPORT[type] || '';
        out.push({
            name: name,
            type: type,
            typeImport: typeImport,
            annotations: dedupAnnos(annos),
            isCustom: isCustom,
        });
    }
    return out;
}

// 同 anno+params 去重(保留首次出现)
function dedupAnnos(arr) {
    const seen = new Set();
    const out = [];
    for (const a of arr) {
        const key = a.anno + '|' + (a.params || '');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(a);
    }
    return out;
}

// 解析自定义注解文本
// 支持多行,每行一个注解,形如:
//   @Pattern(regexp = "^\\d+$", message = "必须是数字")
//   @Size(min = 1, max = 100)
// 返回: [{anno, params, import}]
function parseCustomAnnotations(text) {
    const out = [];
    if (!text) return out;
    const lines = text.split(/\r?\n/);
    for (let raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (!line.startsWith('@')) continue;
        const m = line.match(/^@([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([\s\S]*)\))?/);
        if (!m) continue;
        const anno = m[1];
        let params = (m[2] || '').trim();
        // 去掉 params 中所有空格(便于拼接),但保留字符串字面量内的空格
        // 简化: 不动 params 内容,直接交给 renderAnnotation
        const importPath = ANNO_IMPORT[anno];
        if (!importPath) {
            // 未识别的注解: 不写 import,交给调用方决定
            out.push({ anno: anno, params: params, import: '' });
        } else {
            out.push({ anno: anno, params: params, import: importPath });
        }
    }
    return out;
}

// 解析 Java 字段声明文本
// 输入示例:
//   private String username;
//   public Integer age
//   protected static final transient String name
// 输出: [{name, type}]
function parseJavaFields(text) {
    if (!text) return [];
    const list = [];
    const lines = text.split(/\r?\n/);
    const mod =
        '(?:(?:public|private|protected|static|final|transient|volatile|synchronized)\\s+)*' +
        '(?:public|private|protected|static|final|transient|volatile|synchronized)?';
    const re = new RegExp('^[\\s]*(' + mod + ')\\s*([A-Za-z_$][\\w$.]*)\\s+([A-Za-z_$][\\w]*)\\s*;?[\\s]*$');
    for (let line of lines) {
        const trimmed = line
            .replace(/\/\/.*$/, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim();
        if (!trimmed) continue;
        // 跳过注释行
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
        // 跳过非字段声明(方法、类等)
        if (!/[;{}\[\]]/.test(trimmed) && !/^\s*[A-Za-z_$]/.test(trimmed)) continue;
        // 必须有分号或类似字段末尾标识,且没有括号
        if (trimmed.indexOf('(') !== -1) continue;
        const m = trimmed.match(re);
        if (!m) continue;
        const rawType = m[2].trim();
        const name = m[3].trim();
        // 转换 java.time.LocalDate → LocalDate
        const simpleType = rawType.split('.').pop();
        list.push({ name: name, type: simpleType, typeRaw: rawType });
    }
    return list;
}

// 渲染单个注解为 Java 文本
function renderAnnotation(a) {
    if (!a || !a.anno) return '';
    if (!a.params) return '@' + a.anno;
    return '@' + a.anno + '(' + a.params + ')';
}

// 生成完整 Java 类
// packageName: 包名(可空)
// className: 类名
// fieldSpecs: inferValidations 输出
// opts: {lombokData:bool, getterSetter:bool, validated:bool}
function generateBean(packageName, className, fieldSpecs, opts) {
    const o = opts || {};
    const cls = (className || 'GeneratedDTO').trim() || 'GeneratedDTO';
    const extras = [];
    if (o.lombokData) extras.push('lombok.Data');
    if (o.validated) extras.push('org.springframework.validation.annotation.Validated');
    const imports = collectImports(fieldSpecs, extras);
    const specs = fieldSpecs || [];

    let code = '';
    if (packageName && packageName.trim()) {
        code += 'package ' + packageName.trim() + ';\n\n';
    }

    // import
    if (imports.length) {
        imports.forEach((i) => (code += 'import ' + i + ';\n'));
        code += '\n';
    }

    // 类注解
    if (o.validated) code += '@Validated\n';
    if (o.lombokData) code += '@Data\n';
    code += 'public class ' + cls + ' {\n\n';

    // 字段
    specs.forEach((f) => {
        (f.annotations || []).forEach((a) => {
            code += '    ' + renderAnnotation(a) + '\n';
        });
        code += '    private ' + f.type + ' ' + f.name + ';\n\n';
    });

    // getter / setter
    if (o.getterSetter) {
        specs.forEach((f) => {
            const cap = f.name.charAt(0).toUpperCase() + f.name.slice(1);
            code += '    public ' + f.type + ' get' + cap + '() {\n';
            code += '        return ' + f.name + ';\n';
            code += '    }\n\n';
            code += '    public void set' + cap + '(' + f.type + ' ' + f.name + ') {\n';
            code += '        this.' + f.name + ' = ' + f.name + ';\n';
            code += '    }\n\n';
        });
    }

    code += '}\n';
    return code;
}

// ============== UI ==============

const BV_TYPES = [
    'String',
    'Integer',
    'Long',
    'BigDecimal',
    'BigInteger',
    'Double',
    'Float',
    'Date',
    'LocalDate',
    'LocalDateTime',
    'Boolean',
    'Custom',
];

function bvReadFields() {
    const rows = document.querySelectorAll('#bvFieldBody tr.bv-row');
    const fields = [];
    rows.forEach((tr) => {
        const name = tr.querySelector('.bv-name').value.trim();
        const type = tr.querySelector('.bv-type').value;
        const required = tr.querySelector('.bv-req').checked;
        const custom = tr.querySelector('.bv-custom').value;
        if (!name && !type) return;
        fields.push({ name: name, type: type, required: required, custom: custom });
    });
    return fields;
}

function bvReadOpts() {
    return {
        string: document.getElementById('bvOptString').checked,
        number: document.getElementById('bvOptNumber').checked,
        decimal: document.getElementById('bvOptDecimal').checked,
        date: document.getElementById('bvOptDate').checked,
        heuristic: document.getElementById('bvOptHeuristic').checked,
        requiredNotNull: document.getElementById('bvOptRequired').checked,
        dateType: document.getElementById('bvOptDateType').value,
        intMax: Number(document.getElementById('bvOptIntMax').value) || Number.MAX_SAFE_INTEGER,
    };
}

function bvReadCfg() {
    return {
        packageName: document.getElementById('bvPackage').value.trim(),
        className: document.getElementById('bvClassName').value.trim() || 'UserDTO',
        lombokData: document.getElementById('bvCfgData').checked,
        getterSetter: document.getElementById('bvCfgGetterSetter').checked,
        validated: document.getElementById('bvCfgValidated').checked,
    };
}

function bvUpdateEmpty() {
    const tbody = document.getElementById('bvFieldBody');
    const empty = document.getElementById('bvEmpty');
    if (!tbody || !empty) return;
    const has = tbody.querySelectorAll('tr.bv-row').length > 0;
    empty.style.display = has ? 'none' : '';
}

function bvUpdateStats(specs) {
    const f = document.getElementById('bvStatFields');
    const a = document.getElementById('bvStatAnnos');
    const i = document.getElementById('bvStatImports');
    if (f) f.textContent = String((specs || []).length);
    if (a) {
        let n = 0;
        (specs || []).forEach((s) => (n += (s.annotations || []).length));
        a.textContent = String(n);
    }
    if (i) {
        const imports = collectImports(specs || [], []);
        i.textContent = String(imports.length);
    }
}

function bvBuildTypeSelect(selected) {
    const sel = document.createElement('select');
    sel.className = 'bv-type';
    BV_TYPES.forEach((t) => {
        const o = document.createElement('option');
        o.value = t;
        o.textContent = t;
        if (t === selected) o.selected = true;
        sel.appendChild(o);
    });
    return sel;
}

function bvAddField(prefill) {
    const tbody = document.getElementById('bvFieldBody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = 'bv-row';

    const tdName = document.createElement('td');
    const inpName = document.createElement('input');
    inpName.type = 'text';
    inpName.className = 'bv-name';
    inpName.placeholder = 'username';
    if (prefill && prefill.name) inpName.value = prefill.name;
    tdName.appendChild(inpName);

    const tdType = document.createElement('td');
    const selType = bvBuildTypeSelect(prefill && prefill.type ? prefill.type : 'String');
    tdType.appendChild(selType);

    const tdReq = document.createElement('td');
    tdReq.className = 'bv-cell-req';
    const cbReq = document.createElement('input');
    cbReq.type = 'checkbox';
    cbReq.className = 'bv-req';
    cbReq.style.accentColor = 'var(--accent)';
    if (prefill && prefill.required) cbReq.checked = true;
    tdReq.appendChild(cbReq);

    const tdCustom = document.createElement('td');
    const taCustom = document.createElement('textarea');
    taCustom.className = 'bv-custom';
    taCustom.placeholder = '@Pattern(regexp = "^\\d+$")';
    taCustom.rows = 1;
    if (prefill && prefill.custom) taCustom.value = prefill.custom;
    tdCustom.appendChild(taCustom);

    const tdDel = document.createElement('td');
    tdDel.className = 'bv-cell-del';
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'bv-del-btn';
    btnDel.title = '删除该字段';
    btnDel.innerHTML = '<i class="bi bi-trash"></i>';
    btnDel.addEventListener('click', () => {
        tr.remove();
        bvUpdateEmpty();
        bvPreview();
    });
    tdDel.appendChild(btnDel);

    tr.appendChild(tdName);
    tr.appendChild(tdType);
    tr.appendChild(tdReq);
    tr.appendChild(tdCustom);
    tr.appendChild(tdDel);
    tbody.appendChild(tr);

    bvUpdateEmpty();
    bvPreview();
}

function bvRemoveField(idx) {
    const rows = document.querySelectorAll('#bvFieldBody tr.bv-row');
    if (rows[idx]) {
        rows[idx].remove();
        bvUpdateEmpty();
        bvPreview();
    }
}

function bvClearAll() {
    const tbody = document.getElementById('bvFieldBody');
    if (tbody) tbody.innerHTML = '';
    bvUpdateEmpty();
    bvPreview();
}

function bvOpenImport() {
    const modal = document.getElementById('bvImportModal');
    const ta = document.getElementById('bvImportText');
    const msg = document.getElementById('bvImportMsg');
    if (msg) msg.textContent = '';
    if (ta) ta.value = '';
    if (modal) modal.style.display = '';
}

function bvCloseImport() {
    const modal = document.getElementById('bvImportModal');
    if (modal) modal.style.display = 'none';
}

function bvDoImport() {
    const ta = document.getElementById('bvImportText');
    const msg = document.getElementById('bvImportMsg');
    if (!ta) return;
    const parsed = parseJavaFields(ta.value);
    if (!parsed.length) {
        if (msg) {
            msg.style.color = '#ef4444';
            msg.textContent = '未解析到字段,请检查格式 (形如: private String username;)';
        }
        return;
    }
    parsed.forEach((p) => {
        bvAddField({ name: p.name, type: p.type, required: false, custom: '' });
    });
    if (msg) {
        msg.style.color = 'var(--text-muted)';
        msg.textContent = '成功导入 ' + parsed.length + ' 个字段';
    }
    setTimeout(bvCloseImport, 600);
}

function bvPreview() {
    const out = document.getElementById('bvOutput');
    if (!out) return;
    const fields = bvReadFields();
    if (!fields.length) {
        out.textContent = '// 左侧编辑字段,点击「生成代码」开始';
        out.classList.remove('error');
        bvUpdateStats([]);
        return;
    }
    try {
        const opts = bvReadOpts();
        const specs = inferValidations(fields, opts);
        bvUpdateStats(specs);
    } catch (e) {
        out.textContent = '// 推导失败: ' + e.message;
        out.classList.add('error');
    }
}

function bvGenerate() {
    const out = document.getElementById('bvOutput');
    if (!out) return;
    const fields = bvReadFields();
    if (!fields.length) {
        out.textContent = '// 请先添加至少一个字段';
        out.classList.add('error');
        return;
    }
    try {
        const opts = bvReadOpts();
        const cfg = bvReadCfg();
        const specs = inferValidations(fields, opts);
        const code = generateBean(cfg.packageName, cfg.className, specs, {
            lombokData: cfg.lombokData,
            getterSetter: cfg.getterSetter,
            validated: cfg.validated,
        });
        out.textContent = code;
        out.classList.remove('error');
        bvUpdateStats(specs);
        setStatus('Bean 类已生成');
    } catch (e) {
        out.textContent = '生成失败: ' + e.message;
        out.classList.add('error');
    }
}

function bvCopy() {
    const out = document.getElementById('bvOutput');
    if (!out) return;
    copyText('bvOutput');
}

function bvInit() {
    const tbody = document.getElementById('bvFieldBody');
    if (!tbody) return;
    if (tbody.children.length === 0) {
        // 默认示例
        bvAddField({ name: 'username', type: 'String', required: true, custom: '' });
        bvAddField({ name: 'email', type: 'String', required: true, custom: '' });
        bvAddField({ name: 'age', type: 'Integer', required: false, custom: '' });
        bvAddField({ name: 'birthday', type: 'LocalDate', required: false, custom: '' });
        bvAddField({ name: 'salary', type: 'BigDecimal', required: false, custom: '' });
    }
    // 绑定 UI 事件
    document
        .querySelectorAll(
            '#bvOptString, #bvOptNumber, #bvOptDecimal, #bvOptDate, ' +
                '#bvOptHeuristic, #bvOptRequired, #bvOptDateType, #bvOptIntMax, ' +
                '#bvPackage, #bvClassName, #bvCfgData, #bvCfgGetterSetter, #bvCfgValidated'
        )
        .forEach((el) => {
            if (!el) return;
            el.addEventListener('input', bvPreview);
            el.addEventListener('change', bvPreview);
        });
    bvPreview();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fieldAnnoSpec,
        collectImports,
        inferValidations,
        parseJavaFields,
        parseCustomAnnotations,
        generateBean,
        renderAnnotation,
        dedupAnnos,
    };
}

if (typeof registerInit !== 'undefined') {
    registerInit('beanval', bvInit);
}
