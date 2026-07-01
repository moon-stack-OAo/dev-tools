// ============================================================
// SQL 执行计划格式化（MySQL / PostgreSQL EXPLAIN）
//   - 支持 4 种输入格式：MySQL tabular、MySQL JSON、PG tabular、PG JSON
//   - 输出 3 种视图：树形、表格、JSON pretty
//   - 全表扫描 (Seq Scan / ALL) 标红，索引命中 (Index Scan / ref) 标绿
// ============================================================

// 危险（疑似全表扫描）关键字：小写匹配
const SQLEX_SCAN_KEYWORDS = ['seq scan', 'all', 'full table scan', 'materialize', 'using temporary', 'using filesort'];

// 索引命中关键字：小写匹配
const SQLEX_INDEX_KEYWORDS = [
    'index scan',
    'index only scan',
    'index seek',
    'range',
    'ref',
    'eq_ref',
    'const',
    'system',
    'index_merge',
    'unique index',
];

// 判断节点类型关键字是否命中
function _sqlexKindOf(nodeType, accessType) {
    const hay = ((nodeType || '') + ' ' + (accessType || '')).toLowerCase();
    if (SQLEX_INDEX_KEYWORDS.some((k) => hay.includes(k))) return 'index';
    if (SQLEX_SCAN_KEYWORDS.some((k) => hay.includes(k))) return 'scan';
    return 'neutral';
}

// -----------------------------------------------------------
// 数据库类型自动检测
//   优先级：JSON 结构 > 关键字
//   - "query_block" → mysql-json
//   - "Plan"        → pg-json
//   - "QUERY PLAN"  → pg tabular
//   - 12 列 tab     → mysql tabular
//   否则 null
// -----------------------------------------------------------
function detectDbType(text) {
    const s = String(text || '').trim();
    if (!s) return null;
    const first = s[0];
    if (first === '{' || first === '[') {
        try {
            const obj = JSON.parse(s);
            const sample = Array.isArray(obj) ? obj[0] || {} : obj;
            if (sample.query_block || obj.query_block) return 'mysql-json';
            if (sample.Plan || obj.Plan) return 'pg-json';
            if (Array.isArray(obj) && obj.some((x) => x && x.Plan)) return 'pg-json';
            return null;
        } catch (e) {
            return null;
        }
    }
    if (/^QUERY PLAN\s*$/im.test(s)) return 'pg';
    if (/^-{5,}\s*$/m.test(s)) return 'pg';
    if (/select_type\s+table\s+/i.test(s)) return 'mysql';
    return null;
}

// -----------------------------------------------------------
// MySQL EXPLAIN tabular
//   输入: `id  select_type  table  ...`
//   输出: {cols:[...], rows:[[...]], warnings:[]}
//   "NULL" 字面量转 null
// -----------------------------------------------------------
function parseMysqlExplain(text) {
    const warnings = [];
    const s = String(text || '').replace(/\r/g, '');
    if (!s.trim()) {
        return { cols: [], rows: [], warnings: ['empty input'] };
    }
    const lines = s.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
        warnings.push('行数不足: 需要表头 + 数据行');
        return { cols: [], rows: [], warnings };
    }
    // 跳过非表头起始的注释/提示行（MySQL 可能输出 "Note (...)" 前缀）
    let headerIdx = 0;
    for (let i = 0; i < lines.length; i++) {
        if (/\bid\b\s+select_type/i.test(lines[i])) {
            headerIdx = i;
            break;
        }
    }
    // 推断分隔符: tab 或 2+ 空白
    const useTab = lines[headerIdx].indexOf('\t') >= 0;
    const splitter = useTab ? /\t/ : /\s{2,}/;
    const cols = lines[headerIdx]
        .trim()
        .split(splitter)
        .map((c) => c.trim())
        .filter(Boolean);
    if (cols.length === 0) {
        warnings.push('未识别到表头列');
        return { cols: [], rows: [], warnings };
    }
    const rows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const raw = lines[i];
        const parts = raw.split(splitter);
        const row = [];
        for (let j = 0; j < cols.length; j++) {
            let v = (parts[j] != null ? parts[j] : '').trim();
            if (v === 'NULL') v = null;
            row.push(v);
        }
        // 少于列数: 末尾补 null
        while (row.length < cols.length) row.push(null);
        rows.push(row);
    }
    return { cols, rows, warnings };
}

// -----------------------------------------------------------
// MySQL EXPLAIN FORMAT=JSON → 归一化树
//   树节点: { nodeType, relation, accessType, key, keyLen, ref,
//             rows, costStart, costEnd, extras, children }
// -----------------------------------------------------------
function parseMysqlExplainJson(text) {
    const obj = JSON.parse(String(text || ''));
    const roots = [];
    const list = Array.isArray(obj) ? obj : [obj];
    for (const block of list) {
        if (block && block.query_block) {
            const sub = _sqlexMysqlBlock(block.query_block, null);
            if (sub) roots.push(sub);
        }
    }
    return roots;
}

// 递归处理一个 query_block;返回该 block 的根节点
// parentKey: 上一层提供的"select_id 前缀"(可为 null)
function _sqlexMysqlBlock(qb, parentSelectId) {
    if (!qb || typeof qb !== 'object') return null;
    const selectId = qb.select_id != null ? qb.select_id : parentSelectId;
    // 收集顶层 tables
    const tables = [];
    if (qb.table) tables.push({ src: qb.table, owner: qb });
    if (Array.isArray(qb.nested_loop)) {
        for (const nl of qb.nested_loop) {
            if (nl.table) tables.push({ src: nl.table, owner: nl });
        }
    }
    // 若既无 table 也无 nested_loop,返回 null
    if (
        tables.length === 0 &&
        !qb.ordering_operation &&
        !qb.duplicates_removal &&
        !qb.grouping_operation &&
        !qb.having_subqueries &&
        !Array.isArray(qb.windowing)
    ) {
        return null;
    }
    // 构造根: 若有多个 tables,合成一个 "Nested Loop" 容器;否则直接是该 table
    let root;
    if (tables.length > 1) {
        root = _sqlexMysqlMakeNode('Nested Loop', null, qb);
        if (selectId != null) root.extras.selectId = selectId;
    } else if (tables.length === 1) {
        root = _sqlexMysqlTableToNode(tables[0].src, selectId);
    } else {
        root = _sqlexMysqlMakeNode('Query Block', null, qb);
        if (selectId != null) root.extras.selectId = selectId;
    }
    // 把 tables 平铺到 root.children(若是 Nested Loop 容器)
    for (let i = 0; i < tables.length; i++) {
        const tn = tables.length > 1 ? _sqlexMysqlTableToNode(tables[i].src, selectId) : root;
        // 每张表内部的 nested_loop / materialized_from_subquery 视为 children
        if (tables.length === 1 && root === tn) {
            _sqlexMysqlAttachChildren(root, tables[i]);
        } else {
            _sqlexMysqlAttachChildren(tn, tables[i]);
            root.children.push(tn);
        }
    }
    return root;
}

// 给 table 节点附加其自身的 nested_loop / materialized_from_subquery / attaching_conditions_to_derived 等
function _sqlexMysqlAttachChildren(tableNode, tableCtx) {
    const t = tableCtx.src;
    if (Array.isArray(t.nested_loop)) {
        for (const nl of t.nested_loop) {
            if (nl.table) {
                const cn = _sqlexMysqlTableToNode(nl.table);
                _sqlexMysqlAttachChildren(cn, { src: nl.table });
                tableNode.children.push(cn);
            }
        }
    }
    if (t.materialized_from_subquery && t.materialized_from_subquery.query_block) {
        const sub = _sqlexMysqlBlock(t.materialized_from_subquery.query_block, null);
        if (sub) {
            sub.extras.kind = 'materialized';
            tableNode.children.push(sub);
        }
    }
}

// 把一张 MySQL 表 JSON 转成归一化节点
function _sqlexMysqlTableToNode(t, selectId) {
    const accessType = t.access_type || null;
    const nodeType = accessType || 'table';
    const n = _sqlexMysqlMakeNode(nodeType, t.table_name || null, t);
    if (selectId != null) n.extras.selectId = selectId;
    return n;
}

function _sqlexMysqlMakeNode(nodeType, relation, ctx) {
    const n = {
        nodeType: nodeType,
        relation: relation,
        alias: null,
        accessType: nodeType,
        key: null,
        keyLen: null,
        ref: null,
        rows: null,
        actualRows: null,
        actualTimeStart: null,
        actualTimeEnd: null,
        costStart: null,
        costEnd: null,
        width: null,
        extras: {},
        children: [],
    };
    if (ctx && typeof ctx === 'object') {
        // 通用字段
        if (ctx.table_name && !n.relation) n.relation = ctx.table_name;
        if (ctx.access_type) n.accessType = ctx.access_type;
        if (ctx.key) n.key = ctx.key;
        if (ctx.key_length) n.keyLen = ctx.key_length;
        if (ctx.ref) n.ref = ctx.ref;
        if (ctx.rows_examined_per_scan != null) n.rows = Number(ctx.rows_examined_per_scan);
        // cost_info
        if (ctx.cost_info) {
            const c = ctx.cost_info;
            if (c.query_cost != null) n.extras.queryCost = c.query_cost;
            if (c.prefix_cost != null) n.costEnd = Number(c.prefix_cost) || n.costEnd;
            if (c.read_cost != null) n.costStart = Number(c.read_cost) || n.costStart;
            if (c.eval_cost != null) n.extras.evalCost = c.eval_cost;
            if (c.data_read_per_join) n.extras.dataRead = c.data_read_per_join;
        }
        if (ctx.filtered) n.extras.filtered = ctx.filtered;
        if (ctx.possible_keys) {
            n.extras.possibleKeys = Array.isArray(ctx.possible_keys)
                ? ctx.possible_keys.filter(Boolean).join(',')
                : String(ctx.possible_keys);
        }
        if (ctx.used_columns) {
            n.extras.usedColumns = Array.isArray(ctx.used_columns)
                ? ctx.used_columns.filter(Boolean).join(',')
                : String(ctx.used_columns);
        }
        if (ctx.loops != null) n.extras.loops = ctx.loops;
        if (ctx.condition_filter) n.extras.conditionFilter = ctx.condition_filter;
    }
    return n;
}

// -----------------------------------------------------------
// PostgreSQL EXPLAIN (textual)
//   行格式:  [indent] NodeType [(extra...)]  (cost=A..B rows=N width=M) [(actual ...)]
//   例:
//     Seq Scan on t1  (cost=0.00..15.00 rows=1000 width=4)
//     Index Cond: (id = 1)     ← sub-info
//     Planning Time: 0.15 ms   ← summary
// -----------------------------------------------------------
const SQLEX_PG_PLAN_RE =
    /^(\s*)(.+?)\s{2,}\(cost=(\S+?)\.\.(\S+?)\s+rows=(\d+)\s+width=(\d+)\)(?:\s+\(actual time=(\S+?)\.\.(\S+?)\s+rows=(\d+)\s+loops=(\d+)\))?\s*$/;

function parsePgExplain(text) {
    const warnings = [];
    const s = String(text || '').replace(/\r/g, '');
    if (!s.trim()) {
        return [];
    }
    const lines = s.split('\n');
    const roots = [];
    const stack = []; // [{node, indent}]

    function findInsertTarget(indent) {
        while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
        return stack.length ? stack[stack.length - 1].node : null;
    }

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw.trim()) continue;
        if (/^QUERY PLAN\s*$/i.test(raw.trim())) continue;
        if (/^-{5,}\s*$/.test(raw)) continue;

        // Summary lines: "Planning Time: 0.15 ms" / "Execution Time: 5.6 ms"
        const sumM = raw.match(/^\s*(Planning Time|Execution Time|Trigger Runtime|JIT):\s*(.+?)\s*$/);
        if (sumM) {
            const key = sumM[1].trim();
            const val = sumM[2].trim();
            // Summary 行总属于整个查询,不是某个子节点 → 弹出栈回到根
            while (stack.length) stack.pop();
            if (roots.length) {
                roots[roots.length - 1].extras[key] = val;
            } else {
                warnings.push(key + ': ' + val);
            }
            continue;
        }

        const m = raw.match(SQLEX_PG_PLAN_RE);
        if (m) {
            const indent = m[1].length;
            let nodeTypeRaw = m[2].trim();
            // PG 缩进子节点常用 "-> " 前缀表示层级,解析时去掉便于显示
            nodeTypeRaw = nodeTypeRaw.replace(/^->\s+/, '');
            const costStart = parseFloat(m[3]);
            const costEnd = parseFloat(m[4]);
            const rows = parseInt(m[5], 10);
            const width = parseInt(m[6], 10);
            const actualTimeStart = m[7] != null ? parseFloat(m[7]) : null;
            const actualTimeEnd = m[8] != null ? parseFloat(m[8]) : null;
            const actualRows = m[9] != null ? parseInt(m[9], 10) : null;
            const loops = m[10] != null ? parseInt(m[10], 10) : null;

            const node = _sqlexPgMakeNode(nodeTypeRaw, {
                costStart,
                costEnd,
                rows,
                width,
                actualTimeStart,
                actualTimeEnd,
                actualRows,
                loops,
            });
            const parent = findInsertTarget(indent);
            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
            stack.push({ node, indent });
            continue;
        }

        // Sub-info 行: "Index Cond: (...)" / "Filter: (...)" / "Rows Removed by Filter: ..."
        const subM = raw.match(/^(\s*)(\S[^:]*?):\s*(.+?)\s*$/);
        if (subM && stack.length) {
            const parent = stack[stack.length - 1].node;
            const key = subM[2].trim();
            const val = subM[3].trim();
            if (!parent.extras._detail) parent.extras._detail = [];
            parent.extras._detail.push(key + ': ' + val);
            continue;
        }
        // 完全无法识别的行
        warnings.push('无法解析行: ' + raw.trim().slice(0, 80));
    }
    return roots;
}

function _sqlexPgMakeNode(nodeTypeRaw, f) {
    let relation = null,
        alias = null,
        key = null;
    // "Index Only Scan using idx on t2 t2"
    let m = nodeTypeRaw.match(/^Index\s+(Only\s+)?(?:Scan|Seek)\s+using\s+(\S+)\s+on\s+(\S+)(?:\s+(\S+))?/i);
    if (m) {
        key = m[2];
        relation = m[3];
        alias = m[4] || null;
    } else if ((m = nodeTypeRaw.match(/^(Seq|Index(?:Only)?)\s*Scan\s+on\s+(\S+)(?:\s+(\S+))?/i))) {
        relation = m[2];
        alias = m[3] || null;
    } else if ((m = nodeTypeRaw.match(/^Bitmap\s+\w+\s+on\s+(\S+)(?:\s+(\S+))?/i))) {
        relation = m[1];
        alias = m[2] || null;
    } else if ((m = nodeTypeRaw.match(/\bon\s+(\S+)(?:\s+(\S+))?$/i))) {
        relation = m[1];
        alias = m[2] || null;
    }
    return {
        nodeType: nodeTypeRaw,
        relation: relation,
        alias: alias,
        accessType: null,
        key: key,
        keyLen: null,
        ref: null,
        rows: f.rows,
        actualRows: f.actualRows,
        actualTimeStart: f.actualTimeStart,
        actualTimeEnd: f.actualTimeEnd,
        costStart: f.costStart,
        costEnd: f.costEnd,
        width: f.width,
        extras: f.loops != null ? { loops: f.loops } : {},
        children: [],
    };
}

// -----------------------------------------------------------
// PostgreSQL EXPLAIN (FORMAT JSON) → 归一化树
//   顶层是数组,每个元素 { Plan: {...}, "Planning Time": ..., ... }
// -----------------------------------------------------------
function parsePgExplainJson(text) {
    const obj = JSON.parse(String(text || ''));
    const arr = Array.isArray(obj) ? obj : [obj];
    const roots = [];
    for (const item of arr) {
        if (!item || !item.Plan) continue;
        const root = _sqlexPgJsonNode(item.Plan);
        for (const k of Object.keys(item)) {
            if (k === 'Plan') continue;
            root.extras[k] = item[k];
        }
        roots.push(root);
    }
    return roots;
}

function _sqlexPgJsonNode(node) {
    const out = {
        nodeType: node['Node Type'] || '',
        relation: node['Relation Name'] || null,
        alias: node['Alias'] || null,
        accessType: null,
        key: node['Index Name'] || null,
        rows: node['Plan Rows'] != null ? Number(node['Plan Rows']) : null,
        actualRows: node['Actual Rows'] != null ? Number(node['Actual Rows']) : null,
        actualTimeStart: node['Actual Startup Time'] != null ? Number(node['Actual Startup Time']) : null,
        actualTimeEnd: node['Actual Total Time'] != null ? Number(node['Actual Total Time']) : null,
        costStart: node['Startup Cost'] != null ? Number(node['Startup Cost']) : null,
        costEnd: node['Total Cost'] != null ? Number(node['Total Cost']) : null,
        width: null,
        extras: {},
        children: [],
    };
    if (node['Plan Width'] != null) out.width = Number(node['Plan Width']);
    if (node['Actual Loops'] != null) out.extras.loops = node['Actual Loops'];
    const skipKeys = new Set([
        'Node Type',
        'Relation Name',
        'Alias',
        'Index Name',
        'Plan Rows',
        'Actual Rows',
        'Actual Startup Time',
        'Actual Total Time',
        'Startup Cost',
        'Total Cost',
        'Plans',
        'Plan Width',
        'Actual Loops',
    ]);
    for (const k of Object.keys(node)) {
        if (skipKeys.has(k)) continue;
        out.extras[k] = node[k];
    }
    if (Array.isArray(node.Plans)) {
        for (const child of node.Plans) out.children.push(_sqlexPgJsonNode(child));
    }
    return out;
}

// -----------------------------------------------------------
// 把树渲染为 HTML
//   每行格式: 缩进 + ├─ NodeType (Relation)  cost=X..Y rows=Z [actual=...]
//   scan → var(--danger) 红色;index → var(--success) 绿色
// -----------------------------------------------------------
function formatTree(tree, opts) {
    const o = opts || {};
    const highlight = o.highlightBad !== false; // 默认开启
    const roots = Array.isArray(tree) ? tree : [];
    const out = ['<div class="sqlex-tree">'];
    if (roots.length === 0) {
        out.push('<div class="sqlex-empty">（无节点）</div>');
    }
    let idx = 0;

    function render(node, depth) {
        const kind = _sqlexKindOf(node.nodeType, node.accessType);
        let cls = 'sqlex-node sqlex-' + kind;
        if (!highlight) cls += ' sqlex-no-color';
        const indent = depth * 20;
        const isLast = idx === roots.length - 1 && depth === 0 ? false : false;
        // 顶部行
        const line = _sqlexNodeLine(node);
        const prefixChar = depth === 0 ? (idx + 1 === roots.length ? '└─' : '├─') : '├─';
        out.push('<div class="' + cls + '" style="margin-left:' + indent + 'px">');
        out.push('<span class="sqlex-bullet">' + prefixChar + '</span> ');
        out.push('<span class="sqlex-nodetype">' + escapeHtml(line.title) + '</span>');
        if (line.meta) {
            out.push(' <span class="sqlex-meta">' + escapeHtml(line.meta) + '</span>');
        }
        out.push('</div>');
        // 子节点
        for (let i = 0; i < node.children.length; i++) {
            render(node.children[i], depth + 1);
        }
        if (depth === 0) idx++;
    }

    for (const root of roots) render(root, 0);
    out.push('</div>');
    return out.join('');
}

// 拼装单个节点的显示文本
function _sqlexNodeLine(node) {
    const title = node.nodeType || '(unknown)';
    const meta = [];
    if (node.relation) {
        const rel = node.alias && node.alias !== node.relation ? node.relation + ' ' + node.alias : node.relation;
        meta.push('(' + rel + ')');
    }
    if (node.key) meta.push('key=' + node.key);
    if (node.accessType && node.accessType !== node.nodeType) meta.push('type=' + node.accessType);
    if (node.costStart != null && node.costEnd != null) meta.push('cost=' + node.costStart + '..' + node.costEnd);
    else if (node.costEnd != null) meta.push('cost=' + node.costEnd);
    if (node.rows != null) meta.push('rows=' + node.rows);
    if (node.actualRows != null) meta.push('actual.rows=' + node.actualRows);
    if (node.actualTimeEnd != null) meta.push('actual.time=' + node.actualTimeEnd + 'ms');
    if (node.extras && node.extras.loops != null) meta.push('loops=' + node.extras.loops);
    if (node.extras && node.extras.queryCost != null) meta.push('query_cost=' + node.extras.queryCost);
    return { title: title, meta: meta.length ? meta.join('  ') : '' };
}

// -----------------------------------------------------------
// 把 MySQL tabular 解析结果渲染为 HTML table
// -----------------------------------------------------------
function formatMysqlTabularTable(parsed) {
    const cols = (parsed && parsed.cols) || [];
    const rows = (parsed && parsed.rows) || [];
    const out = ['<table class="sqlex-mysql-table"><thead><tr>'];
    for (const c of cols) out.push('<th>' + escapeHtml(c) + '</th>');
    out.push('</tr></thead><tbody>');
    if (rows.length === 0) {
        out.push('<tr><td colspan="' + Math.max(cols.length, 1) + '" class="sqlex-empty">（无数据行）</td></tr>');
    } else {
        for (const r of rows) {
            out.push('<tr>');
            for (let i = 0; i < cols.length; i++) {
                const v = r[i];
                const txt = v == null ? '' : String(v);
                let cls = '';
                if (cols[i] === 'type') {
                    const kind = _sqlexKindOf(txt, txt);
                    if (kind === 'index') cls = ' class="sqlex-cell sqlex-cell-index"';
                    else if (kind === 'scan') cls = ' class="sqlex-cell sqlex-cell-scan"';
                }
                out.push('<td' + cls + '>' + escapeHtml(txt) + '</td>');
            }
            out.push('</tr>');
        }
    }
    out.push('</tbody></table>');
    return out.join('');
}

// -----------------------------------------------------------
// summarize: 总成本 / 是否有 scan / 是否使用 index / 警告数 / 表数
//   输入可以是归一化树(数组)或 MySQL tabular 解析结果
// -----------------------------------------------------------
function summarizePlan(tree) {
    const result = {
        totalCost: 0,
        hasScan: false,
        usesIndex: false,
        warnings: [],
        tableCount: 0,
    };
    if (!tree) return result;
    // MySQL tabular 形态
    if (tree.cols && Array.isArray(tree.rows)) {
        const typeIdx = tree.cols.indexOf('type');
        const tableIdx = tree.cols.indexOf('table');
        for (const r of tree.rows) {
            if (tableIdx >= 0 && r[tableIdx]) result.tableCount++;
            if (typeIdx >= 0) {
                const t = r[typeIdx] || '';
                const kind = _sqlexKindOf(t, t);
                if (kind === 'scan') result.hasScan = true;
                if (kind === 'index') result.usesIndex = true;
            }
        }
        // MySQL tabular 不直接给 cost;从 Extra 提取 use where 等
        return result;
    }
    const roots = Array.isArray(tree) ? tree : [];

    function walk(n) {
        const kind = _sqlexKindOf(n.nodeType, n.accessType);
        if (kind === 'scan') result.hasScan = true;
        if (kind === 'index') result.usesIndex = true;
        if (n.relation) result.tableCount++;
        if (n.costEnd != null && n.costEnd > result.totalCost) result.totalCost = n.costEnd;
        if (n.costStart != null && n.costStart > result.totalCost) result.totalCost = n.costStart;
        if (n.extras) {
            if (n.extras.queryCost != null) {
                const qc = parseFloat(n.extras.queryCost);
                if (!isNaN(qc) && qc > result.totalCost) result.totalCost = qc;
            }
            if (n.extras['Planning Time'] != null) {
                result.warnings.push('planning=' + n.extras['Planning Time']);
            }
            if (n.extras['Execution Time'] != null) {
                result.warnings.push('execution=' + n.extras['Execution Time']);
            }
        }
        for (const c of n.children) walk(c);
    }

    for (const r of roots) walk(r);
    return result;
}

// ============================================================
// 浏览器 UI
// ============================================================

const SQLEX_SAMPLES = {
    mysql:
        'id  select_type  table  partitions  type    possible_keys  key      key_len  ref    rows  filtered  Extra\n' +
        '1   SIMPLE       users  NULL        ALL     NULL           NULL     NULL     NULL   1000  100.00    NULL\n' +
        '1   SIMPLE       orders NULL        ref     idx_user       idx_user 4        users.id  50  100.00    Using where',
    'mysql-json':
        '{\n' +
        '  "query_block": {\n' +
        '    "select_id": 1,\n' +
        '    "cost_info": {"query_cost": "12.50"},\n' +
        '    "nested_loop": [\n' +
        '      {"table": {"table_name": "users", "access_type": "ALL", "rows_examined_per_scan": 1000, "filtered": "100.00", "cost_info": {"read_cost": "10.00", "eval_cost": "1.00", "prefix_cost": "11.00"}, "used_columns": ["id", "name"]}},\n' +
        '      {"table": {"table_name": "orders", "access_type": "ref", "key": "idx_user", "key_length": "4", "ref": "test.users.id", "rows_examined_per_scan": 5, "filtered": "100.00", "used_columns": ["user_id", "amount"]}}\n' +
        '    ]\n' +
        '  }\n' +
        '}',
    pg:
        '                                                QUERY PLAN\n' +
        '---------------------------------------------------------------------------------------------\n' +
        ' Nested Loop  (cost=0.00..1521.00 rows=1000 width=12) (actual time=0.123..5.456 rows=1000 loops=1)\n' +
        '   ->  Seq Scan on users users  (cost=0.00..15.00 rows=1000 width=4) (actual time=0.010..0.500 rows=1000 loops=1)\n' +
        '   ->  Index Only Scan using idx_user on orders orders  (cost=0.28..1.50 rows=1 width=8) (actual time=0.001..0.001 rows=1 loops=1000)\n' +
        '         Index Cond: (user_id = users.id)\n' +
        ' Planning Time: 0.150 ms\n' +
        ' Execution Time: 5.600 ms\n',
    'pg-json':
        '[\n' +
        '  {\n' +
        '    "Plan": {\n' +
        '      "Node Type": "Nested Loop",\n' +
        '      "Startup Cost": 0.00,\n' +
        '      "Total Cost": 1521.00,\n' +
        '      "Plan Rows": 1000,\n' +
        '      "Plan Width": 12,\n' +
        '      "Actual Startup Time": 0.123,\n' +
        '      "Actual Total Time": 5.456,\n' +
        '      "Actual Rows": 1000,\n' +
        '      "Actual Loops": 1,\n' +
        '      "Plans": [\n' +
        '        {"Node Type": "Seq Scan", "Relation Name": "users", "Alias": "users", "Startup Cost": 0.00, "Total Cost": 15.00, "Plan Rows": 1000, "Plan Width": 4, "Actual Rows": 1000, "Actual Loops": 1},\n' +
        '        {"Node Type": "Index Only Scan", "Index Name": "idx_user", "Relation Name": "orders", "Startup Cost": 0.28, "Total Cost": 1.50, "Plan Rows": 1, "Plan Width": 8, "Actual Rows": 1, "Actual Loops": 1000}\n' +
        '      ]\n' +
        '    },\n' +
        '    "Planning Time": 0.150,\n' +
        '    "Execution Time": 5.600\n' +
        '  }\n' +
        ']',
};

function sqlexRun() {
    const inputEl = document.getElementById('sqlexInput');
    const outEl = document.getElementById('sqlexOutput');
    const summaryEl = document.getElementById('sqlexSummary');
    const statusEl = document.getElementById('sqlexStatus');
    if (!inputEl || !outEl) return;
    const text = inputEl.value || '';
    const dbTypeSel = document.getElementById('sqlexDbType');
    const formatSel = document.querySelector('input[name="sqlexFormat"]:checked');
    let db = dbTypeSel ? dbTypeSel.value : 'auto';
    const fmt = formatSel ? formatSel.value : 'tree';
    if (db === 'auto') db = detectDbType(text) || 'mysql';
    let parsed;
    let tree;
    try {
        if (db === 'mysql') parsed = parseMysqlExplain(text);
        else if (db === 'mysql-json') tree = parseMysqlExplainJson(text);
        else if (db === 'pg') tree = parsePgExplain(text);
        else if (db === 'pg-json') tree = parsePgExplainJson(text);
        else {
            statusEl.textContent = '无法识别数据库类型';
            statusEl.style.color = 'var(--danger)';
            return;
        }
    } catch (e) {
        statusEl.textContent = '解析失败: ' + e.message;
        statusEl.style.color = 'var(--danger)';
        outEl.innerHTML = '<div class="sqlex-empty">' + escapeHtml(e.message) + '</div>';
        return;
    }
    // 渲染输出
    if (db === 'mysql') {
        if (fmt === 'tree') {
            // 把 tabular 转成简易树(每行一个节点)
            const rows = parsed.rows;
            const typeIdx = parsed.cols.indexOf('type');
            const tableIdx = parsed.cols.indexOf('table');
            const keyIdx = parsed.cols.indexOf('key');
            const fakeTree = rows.map((r) => ({
                nodeType: typeIdx >= 0 ? r[typeIdx] || 'table' : 'row',
                accessType: typeIdx >= 0 ? r[typeIdx] : null,
                relation: tableIdx >= 0 ? r[tableIdx] : null,
                key: keyIdx >= 0 ? r[keyIdx] : null,
                rows: null,
                costStart: null,
                costEnd: null,
                actualRows: null,
                actualTimeEnd: null,
                extras: {},
                children: [],
            }));
            outEl.innerHTML = formatTree(fakeTree);
        } else if (fmt === 'table') {
            outEl.innerHTML = formatMysqlTabularTable(parsed);
        } else {
            outEl.innerHTML = '<pre class="sqlex-pre">' + escapeHtml(JSON.stringify(parsed, null, 2)) + '</pre>';
        }
    } else {
        if (fmt === 'tree') {
            outEl.innerHTML = formatTree(tree);
        } else if (fmt === 'table') {
            // 把树拍平为表格行
            const flat = [];

            function walk(n, d) {
                flat.push({ depth: d, ...n });
                for (const c of n.children) walk(c, d + 1);
            }

            for (const r of tree) walk(r, 0);
            const out = [
                '<table class="sqlex-mysql-table"><thead><tr>',
                '<th>节点类型</th><th>表</th><th>Key</th><th>Cost</th><th>Rows</th><th>Actual Rows</th><th>Actual Time(ms)</th>',
                '</tr></thead><tbody>',
            ];
            if (flat.length === 0) out.push('<tr><td colspan="7" class="sqlex-empty">（空）</td></tr>');
            for (const n of flat) {
                const kind = _sqlexKindOf(n.nodeType, n.accessType);
                const indent = '&nbsp;'.repeat(n.depth * 4);
                const cost =
                    n.costStart != null && n.costEnd != null
                        ? n.costStart + '..' + n.costEnd
                        : n.costEnd != null
                          ? String(n.costEnd)
                          : '';
                out.push('<tr>');
                out.push('<td class="sqlex-cell sqlex-' + kind + '">' + indent + escapeHtml(n.nodeType) + '</td>');
                out.push('<td>' + escapeHtml(n.relation || '') + '</td>');
                out.push('<td>' + escapeHtml(n.key || '') + '</td>');
                out.push('<td>' + escapeHtml(cost) + '</td>');
                out.push('<td>' + escapeHtml(n.rows != null ? String(n.rows) : '') + '</td>');
                out.push('<td>' + escapeHtml(n.actualRows != null ? String(n.actualRows) : '') + '</td>');
                out.push('<td>' + escapeHtml(n.actualTimeEnd != null ? String(n.actualTimeEnd) : '') + '</td>');
                out.push('</tr>');
            }
            out.push('</tbody></table>');
            outEl.innerHTML = out.join('');
        } else {
            outEl.innerHTML = '<pre class="sqlex-pre">' + escapeHtml(JSON.stringify(tree, null, 2)) + '</pre>';
        }
    }
    // 汇总
    const sum = summarizePlan(db === 'mysql' ? parsed : tree);
    summaryEl.innerHTML =
        '<div class="sqlex-sum-card">' +
        '<span class="sqlex-sum-label">总成本</span>' +
        '<span class="sqlex-sum-val">' +
        escapeHtml(String(sum.totalCost || '-')) +
        '</span>' +
        '</div>' +
        '<div class="sqlex-sum-card sqlex-sum-' +
        (sum.hasScan ? 'bad' : 'good') +
        '">' +
        '<span class="sqlex-sum-label">含全表扫描</span>' +
        '<span class="sqlex-sum-val">' +
        (sum.hasScan ? '是 ⚠' : '否 ✓') +
        '</span>' +
        '</div>' +
        '<div class="sqlex-sum-card sqlex-sum-' +
        (sum.usesIndex ? 'good' : 'neutral') +
        '">' +
        '<span class="sqlex-sum-label">使用索引</span>' +
        '<span class="sqlex-sum-val">' +
        (sum.usesIndex ? '是 ✓' : '否') +
        '</span>' +
        '</div>' +
        '<div class="sqlex-sum-card">' +
        '<span class="sqlex-sum-label">表数</span>' +
        '<span class="sqlex-sum-val">' +
        escapeHtml(String(sum.tableCount)) +
        '</span>' +
        '</div>';
    statusEl.textContent = '解析完成 (' + db + ')';
    statusEl.style.color = 'var(--text-dim)';
}

function sqlexSample() {
    const sel = document.getElementById('sqlexDbType');
    const inputEl = document.getElementById('sqlexInput');
    const db = sel ? sel.value : 'auto';
    let key = db;
    if (key === 'auto') key = 'mysql';
    inputEl.value = SQLEX_SAMPLES[key] || SQLEX_SAMPLES.mysql;
}

function sqlexClear() {
    const inputEl = document.getElementById('sqlexInput');
    const outEl = document.getElementById('sqlexOutput');
    const summaryEl = document.getElementById('sqlexSummary');
    const statusEl = document.getElementById('sqlexStatus');
    if (inputEl) inputEl.value = '';
    if (outEl) outEl.innerHTML = '';
    if (summaryEl) summaryEl.innerHTML = '';
    if (statusEl) statusEl.textContent = '';
}

function sqlexCopy() {
    const outEl = document.getElementById('sqlexOutput');
    if (!outEl) return;
    const text = outEl.innerText.trim();
    if (!text) {
        if (typeof toast === 'function') toast('没有可复制内容');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(text, '已复制执行计划结果');
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    }
}

function sqlexInit() {
    // 默认加载示例
    const inputEl = document.getElementById('sqlexInput');
    if (inputEl && !inputEl.value) sqlexSample();
}

// ============================================================
// Node 测试导出 + 注册
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectDbType,
        parseMysqlExplain,
        parseMysqlExplainJson,
        parsePgExplain,
        parsePgExplainJson,
        formatTree,
        formatMysqlTabularTable,
        summarizePlan,
    };
}

if (typeof registerInit === 'function') {
    registerInit('sqlexplain', sqlexInit);
}
