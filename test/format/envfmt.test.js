const { parseEnv, formatEnv, envToJson, jsonToEnv } = require('../../js/format/envfmt.js');

describe('parseEnv', () => {
    test('基础 KEY=VALUE', () => {
        const r = parseEnv('FOO=bar\nBAZ=qux');
        expect(r.map.FOO).toBe('bar');
        expect(r.map.BAZ).toBe('qux');
        expect(r.entries).toHaveLength(2);
    });

    test('注释与空行', () => {
        const r = parseEnv('# comment\n\nA=1\n# another\nB=2');
        expect(r.map.A).toBe('1');
        expect(r.map.B).toBe('2');
        expect(r.comments.length).toBe(2);
    });

    test('export 前缀', () => {
        const r = parseEnv('export API_KEY=secret');
        expect(r.map.API_KEY).toBe('secret');
        expect(r.entries[0].export).toBe(true);
    });

    test('双引号与转义', () => {
        const r = parseEnv('MSG="hello world"\nPATH_VAL="a\\nb"');
        expect(r.map.MSG).toBe('hello world');
        expect(r.map.PATH_VAL).toBe('a\nb');
    });

    test('单引号字面量', () => {
        const r = parseEnv("GREETING='hello world'");
        expect(r.map.GREETING).toBe('hello world');
    });

    test('检测重复 key', () => {
        const r = parseEnv('APP_ENV=dev\nAPP_ENV=prod');
        expect(r.map.APP_ENV).toBe('prod');
        expect(r.duplicates).toHaveLength(1);
        expect(r.duplicates[0].key).toBe('APP_ENV');
        expect(r.duplicates[0].lines).toEqual([1, 2]);
    });
});

describe('formatEnv', () => {
    test('对齐等号', () => {
        const text = formatEnv('A=1\nLONG_KEY=2');
        expect(text).toContain('A        = 1');
        expect(text).toContain('LONG_KEY = 2');
    });

    test('排序', () => {
        const text = formatEnv('B=2\nA=1', { sort: true });
        expect(text.indexOf('A')).toBeLessThan(text.indexOf('B'));
    });

    test('export 前缀选项', () => {
        const text = formatEnv({ X: 'y' }, { exportPrefix: true });
        expect(text).toMatch(/^export /);
    });
});

describe('envToJson / jsonToEnv', () => {
    test('env → JSON', () => {
        const json = envToJson('A=1\nB=two');
        const obj = JSON.parse(json);
        expect(obj).toEqual({ A: '1', B: 'two' });
    });

    test('JSON → env', () => {
        const env = jsonToEnv({ HOST: 'localhost', PORT: 8080 });
        expect(env).toContain('HOST');
        expect(env).toContain('localhost');
        expect(env).toContain('PORT');
        expect(env).toContain('8080');
    });

    test('往返', () => {
        const src = 'DB_HOST=localhost\nDB_PORT=5432';
        const obj = envToJson(src, { asObject: true });
        const back = jsonToEnv(obj);
        const again = parseEnv(back);
        expect(again.map.DB_HOST).toBe('localhost');
        expect(again.map.DB_PORT).toBe('5432');
    });

    test('非法 JSON 抛错', () => {
        expect(() => jsonToEnv('{bad')).toThrow(/JSON/);
    });
});
