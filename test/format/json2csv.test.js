const {jsonToCsv, csvToJson} = require('../../js/format/json2csv.js');

describe('jsonToCsv JSON 转 CSV', () => {
    test('基本转换含表头', () => {
        const csv = jsonToCsv('[{"name":"Alice","age":30},{"name":"Bob","age":25}]');
        const lines = csv.split('\n');
        expect(lines[0]).toBe('name,age');
        expect(lines[1]).toBe('Alice,30');
        expect(lines[2]).toBe('Bob,25');
    });

    test('无表头选项', () => {
        expect(jsonToCsv('[{"a":1}]', {header: false})).toBe('1');
    });

    test('空数组返回空字符串', () => {
        expect(jsonToCsv('[]')).toBe('');
    });

    test('非数组抛出错误', () => {
        expect(() => jsonToCsv('{"a":1}')).toThrow('数组');
    });

    test('嵌套对象展平为点分隔键', () => {
        const csv = jsonToCsv('[{"user":{"name":"X"}}]');
        const lines = csv.split('\n');
        expect(lines[0]).toBe('user.name');
        expect(lines[1]).toBe('X');
    });

    test('逗号字段加引号转义', () => {
        const csv = jsonToCsv('[{"s":"a,b"}]');
        expect(csv.split('\n')[1]).toBe('"a,b"');
    });

    test('引号字段双重转义', () => {
        const csv = jsonToCsv('[{"s":"he said \\"hi\\""}]');
        expect(csv.split('\n')[1]).toBe('"he said ""hi"""');
    });

    test('null 与 undefined 输出空单元格', () => {
        expect(jsonToCsv('[{"a":null,"b":1}]', {header: false})).toBe(',1');
    });

    test('接受对象数组（非字符串输入）', () => {
        expect(jsonToCsv([{x: 1}], {header: false})).toBe('1');
    });
});

describe('csvToJson CSV 转 JSON', () => {
    test('基本转换含类型推断', () => {
        const json = JSON.parse(csvToJson('name,age\nAlice,30\nBob,25'));
        expect(json).toEqual([
            {name: 'Alice', age: 30},
            {name: 'Bob', age: 25},
        ]);
    });

    test('布尔与 null 类型转换', () => {
        const json = JSON.parse(csvToJson('a,b,c\ntrue,false,null'));
        expect(json).toEqual([{a: true, b: false, c: null}]);
    });

    test('浮点数转换', () => {
        const json = JSON.parse(csvToJson('v\n3.14'));
        expect(json[0].v).toBeCloseTo(3.14);
    });

    test('无表头生成默认列名且首行作为数据', () => {
        const json = JSON.parse(csvToJson('1,2\n3,4', {header: false}));
        expect(json).toEqual([
            {column_1: 1, column_2: 2},
            {column_1: 3, column_2: 4},
        ]);
    });

    test('点分隔表头还原嵌套结构', () => {
        const json = JSON.parse(csvToJson('a.b\n1'));
        expect(json).toEqual([{a: {b: 1}}]);
    });

    test('引号内逗号不拆分', () => {
        const json = JSON.parse(csvToJson('s\n"a,b"'));
        expect(json).toEqual([{s: 'a,b'}]);
    });

    test('空输入返回空数组', () => {
        expect(csvToJson('')).toBe('[]');
    });
});
