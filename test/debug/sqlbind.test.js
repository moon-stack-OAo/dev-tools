const {
    sqlBindFill,
    sbParsePositional,
    sbParseNamed,
    sbToLiteral,
    sbIsBareLiteral,
} = require('../../js/debug/sqlbind.js');

describe('sbIsBareLiteral / sbToLiteral', () => {
    test('数字 true false null 不加引号', () => {
        expect(sbIsBareLiteral('123', false)).toBe(true);
        expect(sbIsBareLiteral('true', false)).toBe(true);
        expect(sbIsBareLiteral('null', false)).toBe(true);
        expect(sbToLiteral('null', false)).toBe('NULL');
        expect(sbToLiteral('42', false)).toBe('42');
    });

    test('字符串加引号并转义', () => {
        expect(sbToLiteral("a'b", false)).toBe("'a''b'");
        expect(sbToLiteral('hello', false)).toBe("'hello'");
    });

    test('forceString', () => {
        expect(sbToLiteral('123', true)).toBe("'123'");
        expect(sbToLiteral('true', true)).toBe("'true'");
    });
});

describe('sbParsePositional', () => {
    test('多行', () => {
        expect(sbParsePositional('1\nhello\nfalse')).toEqual(['1', 'hello', 'false']);
    });

    test('逗号分隔', () => {
        expect(sbParsePositional('1, hello, false')).toEqual(['1', 'hello', 'false']);
    });

    test('JSON 数组', () => {
        expect(sbParsePositional('[1,"a",true]')).toEqual(['1', 'a', 'true']);
    });

    test('空', () => {
        expect(sbParsePositional('')).toEqual([]);
    });
});

describe('sbParseNamed', () => {
    test('key=value 行', () => {
        const r = sbParseNamed('id=1\nname=张三');
        expect(r.ok).toBe(true);
        expect(r.map).toEqual({ id: '1', name: '张三' });
    });

    test('JSON 对象', () => {
        const r = sbParseNamed('{"id":1001,"name":"a"}');
        expect(r.ok).toBe(true);
        expect(r.map.id).toBe('1001');
        expect(r.map.name).toBe('a');
    });

    test('非法行', () => {
        const r = sbParseNamed('noequals');
        expect(r.ok).toBe(false);
    });
});

describe('sqlBindFill positional', () => {
    test('正常', () => {
        const r = sqlBindFill(
            'SELECT * FROM t WHERE id = ? AND name = ? AND del = ?',
            '1001\n张三\nfalse',
            'positional',
        );
        expect(r.ok).toBe(true);
        expect(r.sql).toBe("SELECT * FROM t WHERE id = 1001 AND name = '张三' AND del = false");
    });

    test('参数不足', () => {
        const r = sqlBindFill('SELECT ? , ?', '1', 'positional');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/参数不足/);
    });

    test('空 SQL', () => {
        const r = sqlBindFill('', '1', 'positional');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/请输入 SQL/);
    });
});

describe('sqlBindFill named', () => {
    test(':name 与 #{name}', () => {
        const r = sqlBindFill(
            'SELECT * FROM u WHERE id = :id AND name = #{name}',
            'id=1\nname=bob',
            'named',
        );
        expect(r.ok).toBe(true);
        expect(r.sql).toBe("SELECT * FROM u WHERE id = 1 AND name = 'bob'");
    });

    test('缺少参数', () => {
        const r = sqlBindFill('SELECT :id, :name', 'id=1', 'named');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/缺少参数/);
        expect(r.msg).toMatch(/name/);
    });

    test('全部当字符串', () => {
        const r = sqlBindFill('SELECT ?', '123', 'positional', true);
        expect(r.ok).toBe(true);
        expect(r.sql).toBe("SELECT '123'");
    });
});
