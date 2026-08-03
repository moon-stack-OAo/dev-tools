const {
    mybatisSqlLogRestore,
    mslParseParamToken,
    mslParseParameters,
    mslParamToLiteral,
    mslBindSql,
    mslExtractPairs,
} = require('../../js/debug/mybatissqllog.js');

describe('mslParseParamToken', () => {
    test('带类型', () => {
        expect(mslParseParamToken('1001(Long)')).toEqual({
            value: '1001',
            type: 'Long',
            isNull: false,
        });
        expect(mslParseParamToken('active(String)')).toEqual({
            value: 'active',
            type: 'String',
            isNull: false,
        });
    });

    test('null', () => {
        expect(mslParseParamToken('null').isNull).toBe(true);
        expect(mslParseParamToken('NULL').isNull).toBe(true);
    });
});

describe('mslParamToLiteral', () => {
    test('数字 / 布尔 / null', () => {
        expect(mslParamToLiteral({ value: '1001', type: 'Long', isNull: false })).toBe('1001');
        expect(mslParamToLiteral({ value: 'true', type: 'Boolean', isNull: false })).toBe('true');
        expect(mslParamToLiteral({ value: 'null', type: null, isNull: true })).toBe('NULL');
    });

    test('字符串转义', () => {
        expect(mslParamToLiteral({ value: "O'Brien", type: 'String', isNull: false })).toBe(
            "'O''Brien'",
        );
    });
});

describe('mslParseParameters', () => {
    test('典型参数列表', () => {
        const list = mslParseParameters('1001(Long), active(String), null, false(Boolean)');
        expect(list).toHaveLength(4);
        expect(list[0].value).toBe('1001');
        expect(list[2].isNull).toBe(true);
    });

    test('空', () => {
        expect(mslParseParameters('')).toEqual([]);
    });
});

describe('mslBindSql', () => {
    test('顺序替换', () => {
        const r = mslBindSql('SELECT * FROM t WHERE id=? AND name=?', [
            { value: '1', type: 'Integer', isNull: false },
            { value: 'a', type: 'String', isNull: false },
        ]);
        expect(r.ok).toBe(true);
        expect(r.sql).toBe("SELECT * FROM t WHERE id=1 AND name='a'");
    });

    test('参数不足', () => {
        const r = mslBindSql('SELECT ? , ?', [{ value: '1', type: 'Integer', isNull: false }]);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/参数不足/);
    });
});

describe('mybatisSqlLogRestore', () => {
    test('正常两行日志', () => {
        const log =
            '==>  Preparing: SELECT id, name FROM user WHERE id = ? AND status = ?\n' +
            '==> Parameters: 1001(Long), active(String)';
        const r = mybatisSqlLogRestore(log);
        expect(r.ok).toBe(true);
        expect(r.sql).toBe("SELECT id, name FROM user WHERE id = 1001 AND status = 'active'");
        expect(r.preparing).toMatch(/SELECT id/);
    });

    test('多组用 --- 分隔', () => {
        const log =
            'Preparing: SELECT ?\n' +
            'Parameters: 1(Integer)\n' +
            'Preparing: SELECT ?\n' +
            'Parameters: 2(Integer)';
        const r = mybatisSqlLogRestore(log);
        expect(r.ok).toBe(true);
        expect(r.sql).toBe('SELECT 1\n---\nSELECT 2');
        expect(r.pairs).toHaveLength(2);
    });

    test('空输入', () => {
        const r = mybatisSqlLogRestore('');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/请粘贴/);
    });

    test('非法：无 Preparing', () => {
        const r = mybatisSqlLogRestore('Parameters: 1(Integer)');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/未找到 Preparing/);
    });

    test('边界：字符串含逗号与括号类型', () => {
        const log =
            'Preparing: INSERT INTO t(a,b) VALUES (?, ?)\n' +
            'Parameters: hello,world(String), 2024-01-01 12:00:00(Timestamp)';
        const r = mybatisSqlLogRestore(log);
        expect(r.ok).toBe(true);
        expect(r.sql).toContain("'hello,world'");
        expect(r.sql).toContain("'2024-01-01 12:00:00'");
    });
});

describe('mslExtractPairs', () => {
    test('忽略无关行', () => {
        const pairs = mslExtractPairs(
            'INFO start\nPreparing: SELECT 1\nParameters: \nINFO end',
        );
        expect(pairs).toHaveLength(1);
        expect(pairs[0].preparing).toBe('SELECT 1');
    });
});
