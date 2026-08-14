const { parseIni, formatIni, iniToJson, jsonToIni } = require('../../js/format/inifmt.js');

describe('parseIni', () => {
    test('section 与 key', () => {
        const r = parseIni('[db]\nhost=localhost\nport=3306\n[app]\nname=demo');
        expect(r.map.db.host).toBe('localhost');
        expect(r.map.db.port).toBe('3306');
        expect(r.map.app.name).toBe('demo');
        expect(r.sections.length).toBe(2);
    });

    test('注释与默认 section', () => {
        const r = parseIni('; c\n# d\nfoo = bar\n[s]\nk=v');
        expect(r.map[''].foo).toBe('bar');
        expect(r.comments.length).toBe(2);
    });

    test('重复 key', () => {
        const r = parseIni('[a]\nx=1\nx=2');
        expect(r.map.a.x).toBe('2');
        expect(r.duplicates).toHaveLength(1);
        expect(r.duplicates[0].key).toBe('x');
    });
});

describe('formatIni', () => {
    test('对齐与去重', () => {
        const text = formatIni('[s]\na=1\nlongkey=2\na=3', { dedupe: true });
        expect(text).toContain('[s]');
        expect(text).toMatch(/a\s+= 3/);
        expect(text).not.toMatch(/= 1/);
    });

    test('排序', () => {
        const text = formatIni('[b]\nz=1\n[a]\ny=2', { sort: true });
        expect(text.indexOf('[a]')).toBeLessThan(text.indexOf('[b]'));
    });
});

describe('iniToJson / jsonToIni', () => {
    test('INI → JSON 嵌套', () => {
        const obj = iniToJson('[db]\nhost=h\nport=1', { asObject: true });
        expect(obj.db.host).toBe('h');
        expect(obj.db.port).toBe('1');
    });

    test('JSON → INI 往返', () => {
        const src = { server: { listen: '0.0.0.0', port: '8080' } };
        const ini = jsonToIni(src);
        expect(ini).toContain('[server]');
        expect(ini).toContain('listen');
        const back = iniToJson(ini, { asObject: true });
        expect(back.server.listen).toBe('0.0.0.0');
    });

    test('非法 JSON 抛错', () => {
        expect(() => jsonToIni('not-json')).toThrow(/JSON/);
    });
});
