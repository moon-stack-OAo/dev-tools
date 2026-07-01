const {
    detectDbType,
    parseMysqlExplain,
    parseMysqlExplainJson,
    parsePgExplain,
    parsePgExplainJson,
    formatTree,
    formatMysqlTabularTable,
    summarizePlan,
} = require('../../js/format/sqlexplain.js');

const SAMPLE_MYSQL_TABULAR =
    'id  select_type  table    partitions  type   possible_keys  key        key_len  ref        rows  filtered  Extra\n' +
    '1   SIMPLE       users    NULL        ALL    NULL           NULL       NULL     NULL       1000  100.00    NULL\n' +
    '1   SIMPLE       orders   NULL        ref    idx_user       idx_user   4        users.id   50    100.00    Using where';

const SAMPLE_MYSQL_TABULAR_TAB =
    'id\tselect_type\ttable\tpartitions\ttype\tpossible_keys\tkey\tkey_len\tref\trows\tfiltered\tExtra\n' +
    '1\tSIMPLE\tt1\tNULL\tALL\tNULL\tNULL\tNULL\tNULL\t500\t100.00\tNULL';

const SAMPLE_MYSQL_JSON =
    '{\n' +
    '  "query_block": {\n' +
    '    "select_id": 1,\n' +
    '    "cost_info": {"query_cost": "12.50"},\n' +
    '    "nested_loop": [\n' +
    '      {"table": {"table_name": "users", "access_type": "ALL", "rows_examined_per_scan": 1000, "filtered": "100.00", "cost_info": {"read_cost": "10.00", "eval_cost": "1.00", "prefix_cost": "11.00"}, "used_columns": ["id", "name"]}},\n' +
    '      {"table": {"table_name": "orders", "access_type": "ref", "key": "idx_user", "key_length": "4", "ref": "test.users.id", "rows_examined_per_scan": 5, "filtered": "100.00"}}\n' +
    '    ]\n' +
    '  }\n' +
    '}';

const SAMPLE_MYSQL_JSON_SINGLE = JSON.stringify({
    query_block: {
        select_id: 1,
        cost_info: { query_cost: '5.10' },
        table: {
            table_name: 't1',
            access_type: 'const',
            rows_examined_per_scan: 1,
            key: 'PRIMARY',
            key_length: '4',
            used_columns: ['id', 'name'],
        },
    },
});

const SAMPLE_PG_TABULAR =
    '                                                QUERY PLAN\n' +
    '--------------------------------------------------------------------------------------------\n' +
    ' Nested Loop  (cost=0.00..1521.00 rows=1000 width=12) (actual time=0.123..5.456 rows=1000 loops=1)\n' +
    '   ->  Seq Scan on users users  (cost=0.00..15.00 rows=1000 width=4) (actual time=0.010..0.500 rows=1000 loops=1)\n' +
    '   ->  Index Only Scan using idx_user on orders orders  (cost=0.28..1.50 rows=1 width=8) (actual time=0.001..0.001 rows=1 loops=1000)\n' +
    '         Index Cond: (user_id = users.id)\n' +
    ' Planning Time: 0.150 ms\n' +
    ' Execution Time: 5.600 ms\n';

const SAMPLE_PG_JSON = JSON.stringify([
    {
        Plan: {
            'Node Type': 'Nested Loop',
            'Startup Cost': 0.0,
            'Total Cost': 1521.0,
            'Plan Rows': 1000,
            'Plan Width': 12,
            'Actual Startup Time': 0.123,
            'Actual Total Time': 5.456,
            'Actual Rows': 1000,
            'Actual Loops': 1,
            Plans: [
                {
                    'Node Type': 'Seq Scan',
                    'Relation Name': 'users',
                    Alias: 'users',
                    'Startup Cost': 0.0,
                    'Total Cost': 15.0,
                    'Plan Rows': 1000,
                    'Plan Width': 4,
                    'Actual Rows': 1000,
                    'Actual Loops': 1,
                },
                {
                    'Node Type': 'Index Only Scan',
                    'Index Name': 'idx_user',
                    'Relation Name': 'orders',
                    'Startup Cost': 0.28,
                    'Total Cost': 1.5,
                    'Plan Rows': 1,
                    'Plan Width': 8,
                    'Actual Rows': 1,
                    'Actual Loops': 1000,
                },
            ],
        },
        'Planning Time': 0.15,
        'Execution Time': 5.6,
    },
]);

// ============================================================
// detectDbType
// ============================================================
describe('detectDbType', () => {
    test('MySQL tabular (12 列 tab 头)', () => {
        expect(detectDbType(SAMPLE_MYSQL_TABULAR)).toBe('mysql');
    });

    test('MySQL JSON (query_block)', () => {
        expect(detectDbType(SAMPLE_MYSQL_JSON)).toBe('mysql-json');
    });

    test('PostgreSQL textual (QUERY PLAN header)', () => {
        expect(detectDbType(SAMPLE_PG_TABULAR)).toBe('pg');
    });

    test('PostgreSQL JSON (Plan 节点)', () => {
        expect(detectDbType(SAMPLE_PG_JSON)).toBe('pg-json');
    });

    test('空输入返回 null', () => {
        expect(detectDbType('')).toBeNull();
        expect(detectDbType(null)).toBeNull();
        expect(detectDbType('   \n\t  ')).toBeNull();
    });

    test('JSON 但无 query_block/Plan 返回 null', () => {
        expect(detectDbType('{"foo": "bar"}')).toBeNull();
        expect(detectDbType('[1,2,3]')).toBeNull();
    });

    test('非 JSON 文本无关键字返回 null', () => {
        expect(detectDbType('hello world')).toBeNull();
    });

    test('非法 JSON 文本回退 null', () => {
        expect(detectDbType('{not a json')).toBeNull();
    });
});

// ============================================================
// parseMysqlExplain
// ============================================================
describe('parseMysqlExplain (tabular)', () => {
    test('基本 2 行: cols + rows', () => {
        const p = parseMysqlExplain(SAMPLE_MYSQL_TABULAR);
        expect(p.cols).toEqual([
            'id',
            'select_type',
            'table',
            'partitions',
            'type',
            'possible_keys',
            'key',
            'key_len',
            'ref',
            'rows',
            'filtered',
            'Extra',
        ]);
        expect(p.rows.length).toBe(2);
        expect(p.rows[0][1]).toBe('SIMPLE');
        expect(p.rows[0][2]).toBe('users');
        expect(p.rows[0][4]).toBe('ALL');
    });

    test('NULL 字面量转 null', () => {
        const p = parseMysqlExplain(SAMPLE_MYSQL_TABULAR);
        expect(p.rows[0][3]).toBeNull();
        expect(p.rows[0][5]).toBeNull();
        expect(p.rows[0][6]).toBeNull();
        expect(p.rows[0][7]).toBeNull();
        // row 2 的 ref 不为 NULL
        expect(p.rows[1][8]).toBe('users.id');
    });

    test('tab 分隔正确解析', () => {
        const p = parseMysqlExplain(SAMPLE_MYSQL_TABULAR_TAB);
        expect(p.cols[0]).toBe('id');
        expect(p.rows[0][1]).toBe('SIMPLE');
        expect(p.rows[0][2]).toBe('t1');
    });

    test('空输入返回空 cols/rows + warning', () => {
        const p = parseMysqlExplain('');
        expect(p.cols).toEqual([]);
        expect(p.rows).toEqual([]);
        expect(p.warnings.length).toBeGreaterThan(0);
    });

    test('行数不足返回 warning', () => {
        const p = parseMysqlExplain('id select_type table\n');
        expect(p.warnings.length).toBeGreaterThan(0);
        expect(p.rows.length).toBe(0);
    });

    test('列数少于表头时末尾补 null', () => {
        const text = 'id  select_type  table\n1   SIMPLE       users';
        const p = parseMysqlExplain(text);
        expect(p.cols.length).toBe(3);
        expect(p.rows[0].length).toBe(3);
    });

    test('Extra 含空格也不影响后续列', () => {
        const text =
            'id  select_type  table  type  Extra\n' + '1   SIMPLE       t      ALL   Using where; Using temporary';
        const p = parseMysqlExplain(text);
        expect(p.cols.length).toBe(5);
        expect(p.rows[0][4]).toMatch(/Using where/);
    });
});

// ============================================================
// parseMysqlExplainJson
// ============================================================
describe('parseMysqlExplainJson', () => {
    test('嵌套 nested_loop 解析为树', () => {
        const tree = parseMysqlExplainJson(SAMPLE_MYSQL_JSON);
        expect(tree.length).toBe(1);
        const root = tree[0];
        expect(root.nodeType).toBe('Nested Loop');
        expect(root.children.length).toBe(2);
        expect(root.children[0].nodeType).toBe('ALL');
        expect(root.children[0].relation).toBe('users');
        expect(root.children[1].nodeType).toBe('ref');
        expect(root.children[1].relation).toBe('orders');
        expect(root.children[1].key).toBe('idx_user');
    });

    test('cost 信息提取到 queryCost', () => {
        const tree = parseMysqlExplainJson(SAMPLE_MYSQL_JSON);
        expect(tree[0].extras.queryCost).toBe('12.50');
        expect(tree[0].children[0].costEnd).toBe(11);
        expect(tree[0].children[0].extras.evalCost).toBe('1.00');
    });

    test('used_columns 进入 extras.usedColumns', () => {
        const tree = parseMysqlExplainJson(SAMPLE_MYSQL_JSON);
        expect(tree[0].children[0].extras.usedColumns).toBe('id,name');
    });

    test('单表访问 (top-level table) 直接作为根', () => {
        const tree = parseMysqlExplainJson(SAMPLE_MYSQL_JSON_SINGLE);
        expect(tree.length).toBe(1);
        expect(tree[0].relation).toBe('t1');
        expect(tree[0].nodeType).toBe('const');
        expect(tree[0].key).toBe('PRIMARY');
        expect(tree[0].rows).toBe(1);
    });

    test('JSON 数组(多个 query_block)分别建树', () => {
        const text = JSON.stringify([
            {
                query_block: {
                    select_id: 1,
                    table: { table_name: 'a', access_type: 'ALL', rows_examined_per_scan: 10 },
                },
            },
            {
                query_block: {
                    select_id: 2,
                    table: { table_name: 'b', access_type: 'ref', key: 'idx', rows_examined_per_scan: 5 },
                },
            },
        ]);
        const tree = parseMysqlExplainJson(text);
        expect(tree.length).toBe(2);
        expect(tree[0].relation).toBe('a');
        expect(tree[1].relation).toBe('b');
        expect(tree[1].key).toBe('idx');
    });

    test('非法 JSON 抛错', () => {
        expect(() => parseMysqlExplainJson('not json')).toThrow();
    });

    test('select_id 透传到顶层 extras', () => {
        const tree = parseMysqlExplainJson(SAMPLE_MYSQL_JSON);
        expect(tree[0].extras.selectId).toBe(1);
    });
});

// ============================================================
// parsePgExplain (textual)
// ============================================================
describe('parsePgExplain (textual)', () => {
    test('3 节点树(1+2)按缩进构造', () => {
        const tree = parsePgExplain(SAMPLE_PG_TABULAR);
        expect(tree.length).toBe(1);
        expect(tree[0].nodeType).toBe('Nested Loop');
        expect(tree[0].children.length).toBe(2);
        // PG textual nodeType 含 relation/alias 原文(便于精确显示)
        expect(tree[0].children[0].nodeType).toBe('Seq Scan on users users');
        expect(tree[0].children[0].relation).toBe('users');
        expect(tree[0].children[1].nodeType).toBe('Index Only Scan using idx_user on orders orders');
        expect(tree[0].children[1].key).toBe('idx_user');
        expect(tree[0].children[1].relation).toBe('orders');
    });

    test('cost / rows / actual 字段正确', () => {
        const tree = parsePgExplain(SAMPLE_PG_TABULAR);
        expect(tree[0].costStart).toBe(0);
        expect(tree[0].costEnd).toBe(1521);
        expect(tree[0].rows).toBe(1000);
        expect(tree[0].actualRows).toBe(1000);
        expect(tree[0].actualTimeStart).toBeCloseTo(0.123);
        expect(tree[0].actualTimeEnd).toBeCloseTo(5.456);
        expect(tree[0].children[0].extras.loops).toBe(1);
    });

    test('Index Cond 子行进入 _detail', () => {
        const tree = parsePgExplain(SAMPLE_PG_TABULAR);
        const detail = tree[0].children[1].extras._detail;
        expect(detail).toBeDefined();
        expect(detail[0]).toMatch(/Index Cond/);
    });

    test('Planning Time / Execution Time 附加到根 extras', () => {
        const tree = parsePgExplain(SAMPLE_PG_TABULAR);
        expect(tree[0].extras['Planning Time']).toBe('0.150 ms');
        expect(tree[0].extras['Execution Time']).toBe('5.600 ms');
    });

    test('无 actual 段也能解析', () => {
        const text = ' QUERY PLAN\n' + '------\n' + ' Seq Scan on t  (cost=0.00..15.00 rows=1000 width=4)\n';
        const tree = parsePgExplain(text);
        expect(tree.length).toBe(1);
        // nodeType 包含 relation(原始 PG textual 形式)
        expect(tree[0].nodeType).toBe('Seq Scan on t');
        expect(tree[0].relation).toBe('t');
        expect(tree[0].actualRows).toBeNull();
    });

    test('空输入返回空数组', () => {
        expect(parsePgExplain('')).toEqual([]);
        expect(parsePgExplain('   \n   \n')).toEqual([]);
    });

    test('无法识别的行进入 warnings 通道(无 warnings 字段时忽略)', () => {
        const text =
            ' QUERY PLAN\n' +
            '------\n' +
            ' Seq Scan on t  (cost=0.00..15.00 rows=1000 width=4)\n' +
            'Some random garbage line that does not fit\n';
        const tree = parsePgExplain(text);
        expect(tree.length).toBe(1);
    });

    test('limit/offset 节点类型也能识别', () => {
        const text =
            ' QUERY PLAN\n' +
            '------\n' +
            ' Limit  (cost=0.00..1.05 rows=10 width=8)\n' +
            '   ->  Seq Scan on t  (cost=0.00..15.00 rows=100 width=4)\n';
        const tree = parsePgExplain(text);
        expect(tree[0].nodeType).toBe('Limit');
        expect(tree[0].children[0].relation).toBe('t');
    });
});

// ============================================================
// parsePgExplainJson
// ============================================================
describe('parsePgExplainJson', () => {
    test('顶层数组含 Plan 节点', () => {
        const tree = parsePgExplainJson(SAMPLE_PG_JSON);
        expect(tree.length).toBe(1);
        expect(tree[0].nodeType).toBe('Nested Loop');
        expect(tree[0].children.length).toBe(2);
        expect(tree[0].children[0].relation).toBe('users');
        expect(tree[0].children[1].key).toBe('idx_user');
    });

    test('Cost / Rows / Actual 字段正确', () => {
        const tree = parsePgExplainJson(SAMPLE_PG_JSON);
        expect(tree[0].costEnd).toBe(1521);
        expect(tree[0].actualRows).toBe(1000);
        expect(tree[0].children[1].actualTimeEnd).toBeCloseTo(0.001);
        expect(tree[0].children[1].extras.loops).toBe(1000);
    });

    test('Planning/Execution Time 写入根 extras', () => {
        const tree = parsePgExplainJson(SAMPLE_PG_JSON);
        expect(tree[0].extras['Planning Time']).toBe(0.15);
        expect(tree[0].extras['Execution Time']).toBe(5.6);
    });

    test('非数组顶层(单 object)也能解析', () => {
        const obj = {
            Plan: {
                'Node Type': 'Seq Scan',
                'Relation Name': 't',
                'Startup Cost': 0,
                'Total Cost': 10,
                'Plan Rows': 100,
            },
        };
        const tree = parsePgExplainJson(JSON.stringify(obj));
        expect(tree.length).toBe(1);
        expect(tree[0].nodeType).toBe('Seq Scan');
    });

    test('Sort / Aggregate 等节点字段', () => {
        const obj = {
            Plan: {
                'Node Type': 'Sort',
                'Startup Cost': 10,
                'Total Cost': 11,
                'Plan Rows': 100,
                'Sort Key': ['a'],
                Plans: [
                    {
                        'Node Type': 'Seq Scan',
                        'Relation Name': 't',
                        'Plan Rows': 100,
                        'Startup Cost': 0,
                        'Total Cost': 10,
                    },
                ],
            },
        };
        const tree = parsePgExplainJson(JSON.stringify(obj));
        expect(tree[0].nodeType).toBe('Sort');
        expect(tree[0].children[0].relation).toBe('t');
    });

    test('非法 JSON 抛错', () => {
        expect(() => parsePgExplainJson('garbage')).toThrow();
    });
});

// ============================================================
// formatTree
// ============================================================
describe('formatTree', () => {
    test('含 Seq Scan 渲染 var(--danger) 样式', () => {
        const tree = [
            {
                nodeType: 'Seq Scan',
                relation: 't1',
                accessType: null,
                key: null,
                rows: 1000,
                costStart: 0,
                costEnd: 15,
                actualRows: 1000,
                actualTimeStart: null,
                actualTimeEnd: null,
                extras: {},
                children: [],
            },
        ];
        const html = formatTree(tree);
        expect(html).toMatch(/sqlex-scan/);
        expect(html).toMatch(/Seq Scan/);
        expect(html).toMatch(/\(t1\)/);
    });

    test('含 Index Scan 渲染 var(--success) 样式', () => {
        const tree = [
            {
                nodeType: 'Index Scan',
                relation: 't2',
                accessType: null,
                key: 'idx_t2',
                rows: 1,
                costStart: 0.28,
                costEnd: 1.5,
                actualRows: null,
                actualTimeStart: null,
                actualTimeEnd: null,
                extras: {},
                children: [],
            },
        ];
        const html = formatTree(tree);
        expect(html).toMatch(/sqlex-index/);
        expect(html).toMatch(/Index Scan/);
        expect(html).toMatch(/key=idx_t2/);
    });

    test('嵌套节点按层级缩进', () => {
        const tree = [
            {
                nodeType: 'Nested Loop',
                relation: null,
                accessType: null,
                key: null,
                rows: 1000,
                costStart: 0,
                costEnd: 1521,
                actualRows: null,
                actualTimeStart: null,
                actualTimeEnd: null,
                extras: {},
                children: [
                    {
                        nodeType: 'Seq Scan',
                        relation: 'a',
                        accessType: null,
                        key: null,
                        rows: 100,
                        costStart: 0,
                        costEnd: 15,
                        actualRows: null,
                        actualTimeStart: null,
                        actualTimeEnd: null,
                        extras: {},
                        children: [],
                    },
                ],
            },
        ];
        const html = formatTree(tree);
        // 至少出现两个 sqlex-node
        const matches = html.match(/sqlex-node/g);
        expect(matches.length).toBeGreaterThanOrEqual(2);
        // 子节点 margin-left > 0
        expect(html).toMatch(/margin-left:\s*\d+px/);
    });

    test('highlightBad:false 关闭颜色高亮', () => {
        const tree = [
            {
                nodeType: 'Seq Scan',
                relation: 't',
                accessType: null,
                key: null,
                rows: 1,
                costStart: 0,
                costEnd: 1,
                actualRows: null,
                actualTimeStart: null,
                actualTimeEnd: null,
                extras: {},
                children: [],
            },
        ];
        const html = formatTree(tree, { highlightBad: false });
        expect(html).toMatch(/sqlex-no-color/);
    });

    test('空树返回 sqlex-empty 提示', () => {
        const html = formatTree([]);
        expect(html).toMatch(/sqlex-empty/);
    });
});

// ============================================================
// summarizePlan
// ============================================================
describe('summarizePlan', () => {
    test('含 Seq Scan → hasScan=true', () => {
        const tree = parsePgExplain(SAMPLE_PG_TABULAR);
        const sum = summarizePlan(tree);
        expect(sum.hasScan).toBe(true);
        expect(sum.usesIndex).toBe(true);
        expect(sum.tableCount).toBe(2);
    });

    test('totalCost 取最大 costEnd', () => {
        const tree = parsePgExplain(SAMPLE_PG_TABULAR);
        const sum = summarizePlan(tree);
        expect(sum.totalCost).toBe(1521);
    });

    test('warnings 含 planning/execution 标记', () => {
        const tree = parsePgExplain(SAMPLE_PG_TABULAR);
        const sum = summarizePlan(tree);
        expect(sum.warnings.some((w) => w.startsWith('planning'))).toBe(true);
        expect(sum.warnings.some((w) => w.startsWith('execution'))).toBe(true);
    });

    test('MySQL tabular 解析结果也能 summarize', () => {
        const p = parseMysqlExplain(SAMPLE_MYSQL_TABULAR);
        const sum = summarizePlan(p);
        expect(sum.hasScan).toBe(true);
        expect(sum.usesIndex).toBe(true);
        expect(sum.tableCount).toBe(2);
    });

    test('纯索引访问: hasScan=false, usesIndex=true', () => {
        const text = 'id  select_type  table  type  key\n' + '1   SIMPLE       t1     const PRIMARY\n';
        const sum = summarizePlan(parseMysqlExplain(text));
        expect(sum.hasScan).toBe(false);
        expect(sum.usesIndex).toBe(true);
        expect(sum.tableCount).toBe(1);
    });

    test('空输入安全返回默认值', () => {
        const sum = summarizePlan(null);
        expect(sum.hasScan).toBe(false);
        expect(sum.usesIndex).toBe(false);
        expect(sum.totalCost).toBe(0);
        expect(sum.tableCount).toBe(0);
    });
});

// ============================================================
// formatMysqlTabularTable
// ============================================================
describe('formatMysqlTabularTable', () => {
    test('输出 <table> + thead/tbody 结构', () => {
        const html = formatMysqlTabularTable(parseMysqlExplain(SAMPLE_MYSQL_TABULAR));
        expect(html.startsWith('<table')).toBe(true);
        expect(html).toMatch(/<thead>/);
        expect(html).toMatch(/<tbody>/);
        expect(html).toMatch(/<th>id<\/th>/);
    });

    test('type 列索引命中行加 sqlex-cell-index 类', () => {
        const html = formatMysqlTabularTable(parseMysqlExplain(SAMPLE_MYSQL_TABULAR));
        expect(html).toMatch(/sqlex-cell-index/);
    });

    test('type 列全表扫描加 sqlex-cell-scan 类', () => {
        const html = formatMysqlTabularTable(parseMysqlExplain(SAMPLE_MYSQL_TABULAR));
        expect(html).toMatch(/sqlex-cell-scan/);
    });

    test('空行表格显示占位', () => {
        const html = formatMysqlTabularTable({ cols: ['a', 'b'], rows: [] });
        expect(html).toMatch(/sqlex-empty/);
    });
});
