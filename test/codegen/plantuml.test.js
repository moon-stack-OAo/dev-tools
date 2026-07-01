const {
    parseJavaToClasses,
    parseJsonToClasses,
    javaToPlantUml,
    jsonToPlantUml,
    plantumlEncodeSync,
} = require('../../js/codegen/plantuml.js');

describe('parseJavaToClasses 基础类型', () => {
    test('空输入返回 []', () => {
        expect(parseJavaToClasses('')).toEqual([]);
        expect(parseJavaToClasses(null)).toEqual([]);
        expect(parseJavaToClasses(undefined)).toEqual([]);
    });

    test('纯注释返回 []', () => {
        const code = ['// 单行注释', '/* 块注释 class Fake { } */', '/*', ' * 多行块注释', ' */'].join('\n');
        expect(parseJavaToClasses(code)).toEqual([]);
    });

    test('单个类提取字段和方法', () => {
        const code = `class Foo {
            private int x;
            public String name;
            public void doIt() {}
            public int getX() { return x; }
        }`;
        const r = parseJavaToClasses(code);
        expect(r).toHaveLength(1);
        expect(r[0].name).toBe('Foo');
        expect(r[0].type).toBe('class');
        expect(r[0].fields.map((f) => f.name)).toEqual(['x', 'name']);
        expect(r[0].methods.map((m) => m.name)).toEqual(['doIt', 'getX']);
        expect(r[0].methods[0].returnType).toBe('void');
        expect(r[0].methods[1].returnType).toBe('int');
    });

    test('抽象类 type === abstract', () => {
        const code = `public abstract class Shape {
            public abstract double area();
        }`;
        const r = parseJavaToClasses(code);
        expect(r).toHaveLength(1);
        expect(r[0].type).toBe('abstract');
        expect(r[0].modifier).toContain('abstract');
        expect(r[0].methods).toHaveLength(1);
        expect(r[0].methods[0].modifiers).toContain('abstract');
    });

    test('接口 type === interface 且抽象方法被识别', () => {
        const code = `public interface Runnable {
            void run();
            int getPriority();
        }`;
        const r = parseJavaToClasses(code);
        expect(r).toHaveLength(1);
        expect(r[0].type).toBe('interface');
        expect(r[0].methods.map((m) => m.name)).toEqual(['run', 'getPriority']);
        expect(r[0].methods[0].returnType).toBe('void');
        expect(r[0].methods[1].returnType).toBe('int');
    });

    test('枚举 type === enum 且常量/方法被识别', () => {
        const code = `public enum Direction {
            NORTH, SOUTH, EAST, WEST;
            public int getAngle() { return 0; }
        }`;
        const r = parseJavaToClasses(code);
        expect(r).toHaveLength(1);
        expect(r[0].type).toBe('enum');
        expect(r[0].fields.map((f) => f.name)).toEqual(['NORTH', 'SOUTH', 'EAST', 'WEST']);
        expect(r[0].fields[0].type).toBe('enum_const');
        expect(r[0].methods.map((m) => m.name)).toEqual(['getAngle']);
    });
});

describe('parseJavaToClasses 继承与多接口', () => {
    test('extends 识别为 parent', () => {
        const code = `public class Dog extends Animal {}`;
        const r = parseJavaToClasses(code);
        expect(r[0].parent).toBe('Animal');
        expect(r[0].interfaces).toEqual([]);
    });

    test('implements 多个接口', () => {
        const code = `public class Foo implements A, B, C {}`;
        const r = parseJavaToClasses(code);
        expect(r[0].interfaces).toEqual(['A', 'B', 'C']);
        expect(r[0].parent).toBe(null);
    });

    test('extends + implements 同时', () => {
        const code = `public class Bar extends Foo implements I1, I2 {}`;
        const r = parseJavaToClasses(code);
        expect(r[0].name).toBe('Bar');
        expect(r[0].parent).toBe('Foo');
        expect(r[0].interfaces).toEqual(['I1', 'I2']);
    });

    test('泛型 <T extends X>', () => {
        const code = `public class Container<T extends Comparable<T>> {
        }`;
        const r = parseJavaToClasses(code);
        expect(r[0].generics).toHaveLength(1);
        expect(r[0].generics[0]).toContain('Comparable');
    });

    test('多个类按文件顺序解析', () => {
        const code = `class A {} class B {} class C {}`;
        const r = parseJavaToClasses(code);
        expect(r.map((c) => c.name)).toEqual(['A', 'B', 'C']);
    });

    test('构造器 isConstructor === true', () => {
        const code = `class User {
            private String name;
            public User(String name) { this.name = name; }
            public User() { this.name = ""; }
        }`;
        const r = parseJavaToClasses(code);
        const ctors = r[0].methods.filter((m) => m.isConstructor);
        expect(ctors).toHaveLength(2);
        expect(ctors[0].name).toBe('User');
        expect(ctors[0].params).toEqual([{ name: 'name', type: 'String' }]);
        expect(ctors[1].params).toEqual([]);
    });
});

describe('parseJavaToClasses 边界与过滤', () => {
    test('注释中包含 class 关键字不误解析', () => {
        const code = `
            // public class Misleading { }
            /* public class Fake {} */
            public class Real {}
        `;
        const r = parseJavaToClasses(code);
        expect(r).toHaveLength(1);
        expect(r[0].name).toBe('Real');
    });

    test('字符串内的大括号不影响类体提取', () => {
        const code = `class Foo {
            private String s = "{not a brace}";
            public void m() { String t = "}"; }
        }`;
        const r = parseJavaToClasses(code);
        expect(r[0].fields).toHaveLength(1);
        expect(r[0].methods).toHaveLength(1);
    });

    test('静态成员提取 modifiers', () => {
        const code = `class Foo {
            public static final int CONST = 1;
            public static void m() {}
            private volatile long l;
        }`;
        const r = parseJavaToClasses(code);
        const f0 = r[0].fields.find((f) => f.name === 'CONST');
        expect(f0.modifiers).toEqual(expect.arrayContaining(['public', 'static', 'final']));
        expect(r[0].methods[0].modifiers).toEqual(expect.arrayContaining(['public', 'static']));
    });
});

describe('javaToPlantUml 输出', () => {
    test('空输入返回仅含 @startuml/@enduml 的占位', () => {
        expect(javaToPlantUml('', {})).toBe('@startuml\n@enduml\n');
    });

    test('基本类输出包含 @startuml/class/end', () => {
        const code = `class Foo {}`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: true,
        });
        expect(out).toContain('@startuml');
        expect(out).toContain('@enduml');
        expect(out).toContain('class Foo');
        expect(out).toContain('}');
    });

    test('包含 extends 生成 <|-- 关系', () => {
        const code = `class Bar extends Foo {}`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: true,
        });
        expect(out).toContain('Foo <|-- Bar');
    });

    test('包含 implements 生成 <|.. 关系', () => {
        const code = `class Bar implements Foo {}`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: true,
        });
        expect(out).toContain('Foo <|.. Bar');
    });

    test('多个接口生成多条 <|.. 关系', () => {
        const code = `class Bar implements I1, I2 {}`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: true,
        });
        expect(out).toContain('I1 <|.. Bar');
        expect(out).toContain('I2 <|.. Bar');
    });

    test('showFields=true 渲染 -name: Type', () => {
        const code = `class Foo { private int x; public String name; }`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: false,
            showConstructors: false,
            showModifiers: true,
            showGenerics: false,
        });
        expect(out).toContain('-x: int');
        expect(out).toContain('+name: String');
        expect(out).not.toContain('+Foo(');
    });

    test('showMethods=true 渲染 +method(...): Type', () => {
        const code = `class Foo {
            public int getX() { return 0; }
            public void setX(int x) {}
        }`;
        const out = javaToPlantUml(code, {
            showFields: false,
            showMethods: true,
            showConstructors: false,
            showModifiers: true,
            showGenerics: false,
        });
        expect(out).toContain('+getX(): int');
        expect(out).toContain('+setX(x): void');
    });

    test('关闭 showFields 时不渲染字段', () => {
        const code = `class Foo { private int x; }`;
        const out = javaToPlantUml(code, {
            showFields: false,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: false,
        });
        expect(out).not.toContain('-x: int');
        expect(out).not.toContain('+x: int');
    });

    test('关闭 showMethods 时不渲染方法', () => {
        const code = `class Foo { public void m() {} }`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: false,
            showConstructors: true,
            showModifiers: true,
            showGenerics: false,
        });
        expect(out).not.toContain('+m(): void');
    });

    test('showModifiers=false 不带 +/- 前缀', () => {
        const code = `class Foo { private int x; public void m() {} }`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: false,
            showGenerics: false,
        });
        expect(out).toContain('x: int');
        expect(out).toContain('m(): void');
        expect(out).not.toMatch(/^\s*[-+#~]x/m);
        expect(out).not.toMatch(/^\s*[-+#~]m/m);
    });

    test('showGenerics=true 添加 <T> 后缀', () => {
        const code = `class Container<T extends Number> {}`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: true,
        });
        expect(out).toContain('Container<T extends Number>');
    });

    test('protected 方法生成 # 前缀', () => {
        const code = `class Foo { protected void m() {} }`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: false,
        });
        expect(out).toContain('#m(): void');
    });

    test('static 方法展示 {static} 标记', () => {
        const code = `class Foo { public static int get() { return 0; } }`;
        const out = javaToPlantUml(code, {
            showFields: true,
            showMethods: true,
            showConstructors: true,
            showModifiers: true,
            showGenerics: false,
        });
        expect(out).toMatch(/\+get\(\): int\s*\{static\}/);
    });
});

describe('jsonToPlantUml 输出', () => {
    test('空对象字符串得到最小输出', () => {
        expect(jsonToPlantUml('', {})).toBe('@startuml\n@enduml\n');
    });

    test('单对象生成一个类 + 字段', () => {
        const out = jsonToPlantUml('{"a":1,"b":"x","c":true}', { showFields: true, showMethods: true });
        expect(out).toContain('@startuml');
        expect(out).toContain('class Object');
        expect(out).toContain('+a: Integer');
        expect(out).toContain('+b: String');
        expect(out).toContain('+c: Boolean');
    });

    test('嵌套对象生成嵌套类 + 关系', () => {
        const out = jsonToPlantUml('{"addr":{"city":"上海"}}', {});
        expect(out).toContain('class Object');
        expect(out).toContain('class Address');
        expect(out).toContain('Object "1" *-- "many" Address');
    });

    test('数组根生成 Root1/Root2', () => {
        const out = jsonToPlantUml('[{"x":1},{"y":2}]', {});
        expect(out).toContain('class Root1');
        expect(out).toContain('class Root2');
        expect(out).toContain('+x: Integer');
        expect(out).toContain('+y: Integer');
    });

    test('非 JSON 输入不抛错返回空图', () => {
        expect(jsonToPlantUml('not json', {})).toBe('@startuml\n@enduml\n');
    });

    test('数组项为对象时按 List 字段推断', () => {
        const out = jsonToPlantUml('{"items":[{"x":1}]}', {});
        expect(out).toContain('+items: List');
        expect(out).toContain('class Item');
        expect(out).toContain('Object "1" *-- "many" Item');
    });
});

describe('plantumlEncodeSync 编码', () => {
    test('空输入输出空字符串', () => {
        expect(plantumlEncodeSync('')).toBe('');
        expect(plantumlEncodeSync(null)).toBe('');
    });

    test('输出仅包含 URL-safe 字符 [A-Za-z0-9_-]', () => {
        const r = plantumlEncodeSync('@startuml\nA -> B: hello\n@enduml');
        expect(r).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(r).not.toContain('+');
        expect(r).not.toContain('/');
        expect(r).not.toContain('=');
    });

    test('同上:另一输入也无非法字符', () => {
        const r = plantumlEncodeSync('class Foo { int x; }');
        expect(r).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('相同输入产出相同输出(确定性)', () => {
        const a = plantumlEncodeSync('@startuml\nBob -> Alice: hi\n@enduml');
        const b = plantumlEncodeSync('@startuml\nBob -> Alice: hi\n@enduml');
        expect(a).toBe(b);
    });

    test('不同输入产出不同输出', () => {
        const a = plantumlEncodeSync('A -> B: hello');
        const b = plantumlEncodeSync('A -> B: goodbye');
        expect(a).not.toBe(b);
    });

    test('与独立 zlib 实现结果一致', () => {
        const zlib = require('zlib');
        const input = 'A -> B: hello';
        const expected = zlib
            .deflateRawSync(Buffer.from(input, 'utf8'))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        expect(plantumlEncodeSync(input)).toBe(expected);
    });

    test('plantuml.com 在线服务转义前缀示例', () => {
        // 见 plantuml.com 文档:"A -> B: hello" 经官方算法 deflate+url-safe base64 后
        // 可通过植物官方服务打开。本测试仅断言输出非空且格式合法,不做远程依赖。
        const r = plantumlEncodeSync('A -> B: hello');
        expect(r.length).toBeGreaterThan(4);
        expect(r).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('中文 UTF-8 字符不丢码', () => {
        const r = plantumlEncodeSync('class 用户 { String 姓名; }');
        expect(r.length).toBeGreaterThan(0);
        expect(r).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('中文 case 与 encode 联调', () => {
        const code = 'public class 用户 {}';
        const uml = javaToPlantUml(code, {});
        const enc = plantumlEncodeSync(uml);
        expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(enc.length).toBeGreaterThan(4);
    });
});

describe('parseJavaToClasses:中文类名', () => {
    test('中文类名合法字段与方法', () => {
        const code = `class 用户服务 {
            private String 姓名;
            public 用户服务(String 姓名) { this.姓名 = 姓名; }
            public String 获取() { return 姓名; }
        }`;
        const r = parseJavaToClasses(code);
        expect(r).toHaveLength(1);
        expect(r[0].name).toBe('用户服务');
        expect(r[0].fields[0].name).toBe('姓名');
        expect(r[0].methods.map((m) => m.name)).toEqual(['用户服务', '获取']);
    });
});
