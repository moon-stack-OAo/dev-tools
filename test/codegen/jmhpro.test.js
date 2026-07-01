const {
    defaultConfig,
    validateConfig,
    renderImports,
    generateMethod,
    generateJmhClass,
} = require('../../js/codegen/jmhpro.js');

describe('defaultConfig 结构', () => {
    test('含 methods + global 字段', () => {
        const cfg = defaultConfig();
        expect(Array.isArray(cfg.methods)).toBe(true);
        expect(cfg.methods.length).toBeGreaterThanOrEqual(1);
        expect(cfg.global).toBeDefined();
        expect(Array.isArray(cfg.global.mode)).toBe(true);
        expect(typeof cfg.global.outputTimeUnit).toBe('string');
        expect(typeof cfg.global.stateScope).toBe('string');
        expect(cfg.global.warmup).toBeDefined();
        expect(cfg.global.measurement).toBeDefined();
        expect(cfg.global.fork).toBeDefined();
    });
    test('默认方法字段齐全', () => {
        const m = defaultConfig().methods[0];
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('returnType');
        expect(m).toHaveProperty('params');
        expect(m).toHaveProperty('group');
    });
});

describe('generateJmhClass 单方法', () => {
    test('Throughput + Thread + Warmup 3 + Measurement 3', () => {
        const cfg = defaultConfig();
        cfg.global.threads = 2;
        cfg.global.mode = ['Throughput'];
        cfg.global.warmup = { iterations: 3, time: 2, timeUnit: 'SECONDS', batchSize: 1 };
        cfg.global.measurement = { iterations: 3, time: 2, timeUnit: 'SECONDS', batchSize: 1 };
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('com.example', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@BenchmarkMode(Mode.Throughput)');
        expect(out).toContain('@Warmup(iterations = 3, time = 2, timeUnit = TimeUnit.SECONDS)');
        expect(out).toContain('@Measurement(iterations = 3, time = 2, timeUnit = TimeUnit.SECONDS)');
        expect(out).toContain('@Threads(2)');
        expect(out).toContain('@OutputTimeUnit(TimeUnit.MILLISECONDS)');
        expect(out).toContain('@State(Scope.Thread)');
        expect(out).toContain('public class M {');
        expect(out).toContain('@Benchmark');
        expect(out).not.toContain('main(');
    });
});

describe('generateJmhClass 多方法', () => {
    test('2 个独立方法无 Group', () => {
        const cfg = defaultConfig();
        cfg.methods = [
            { name: 'first', returnType: 'void', params: [], group: null },
            { name: 'second', returnType: 'int', params: [], group: null },
        ];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('public void first()');
        expect(out).toContain('public int second()');
        expect(out).toMatch(/second\(\)[^{]*\{[^}]*return 0;/);
    });
});

describe('generateJmhClass @Group', () => {
    test('A+B 输出 Phaser + Scope.Group', () => {
        const cfg = defaultConfig();
        cfg.global.stateScope = 'Group';
        cfg.methods = [
            { name: 'producer', returnType: 'void', params: [], group: { name: 'g1', groupThreads: 1, role: 'A' } },
            { name: 'consumer', returnType: 'void', params: [], group: { name: 'g1', groupThreads: 1, role: 'B' } },
        ];
        cfg.opts = { addMain: false, addSetup: true, addTearDown: false };
        const out = generateJmhClass('demo', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@Group("g1")');
        expect(out).toContain('@State(Scope.Group)');
        expect(out).toContain('import java.util.concurrent.Phaser;');
        expect(out).toContain('private Phaser phaser;');
        expect(out).toContain('phaser = new Phaser(');
        expect(out).toContain('phaser.arrive()');
        expect(out).toContain('phaser.awaitAdvance(');
        // producer 应含 arrive (A role)
        expect(out).toMatch(/void producer\(\)[\s\S]*phaser\.arrive\(\)/);
        // consumer 应含 awaitAdvance startNanos (B role)
        expect(out).toMatch(/void consumer\(\)[\s\S]*long startNanos = phaser\.arrive\(\)/);
    });
    test('@GroupThreads(3) 显式输出', () => {
        const cfg = defaultConfig();
        cfg.global.stateScope = 'Group';
        cfg.methods = [
            { name: 'a', returnType: 'void', params: [], group: { name: 'g1', groupThreads: 3, role: 'A' } },
            { name: 'b', returnType: 'void', params: [], group: { name: 'g1', groupThreads: 3, role: 'B' } },
        ];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@GroupThreads(3)');
    });
});

describe('generateJmhClass @Param', () => {
    test('多值数组形式', () => {
        const cfg = defaultConfig();
        cfg.methods = [
            {
                name: 'bench',
                returnType: 'void',
                params: [{ name: 'size', values: ['100', '1000', '10000'] }],
                group: null,
            },
        ];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@Param({"100", "1000", "10000"})');
        expect(out).toContain('private String size;');
    });
    test('跨方法去重同名 @Param', () => {
        const cfg = defaultConfig();
        cfg.methods = [
            { name: 'a', returnType: 'void', params: [{ name: 'size', values: ['100', '1000'] }], group: null },
            { name: 'b', returnType: 'void', params: [{ name: 'size', values: ['200', '2000'] }], group: null },
        ];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        const matches = out.match(/private String size;/g) || [];
        expect(matches.length).toBe(1);
    });
});

describe('generateJmhClass @Fork', () => {
    test('jvmArgs 多行(按换行分割)', () => {
        const cfg = defaultConfig();
        cfg.global.fork = { value: 2, jvmArgs: '-Xms512m\n-Xmx1024m\n-XX:+UseG1GC' };
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@Fork(value = 2, jvmArgs = {"-Xms512m", "-Xmx1024m", "-XX:+UseG1GC"})');
    });
});

describe('renderImports 去重', () => {
    test('Set 去重 + 排序', () => {
        const arr = renderImports([
            'org.openjdk.jmh.runner.Runner',
            'java.util.concurrent.TimeUnit',
            'org.openjdk.jmh.runner.Runner',
            'a.b.c',
            'b.c.a',
        ]);
        expect(arr).toEqual(['a.b.c', 'b.c.a', 'java.util.concurrent.TimeUnit', 'org.openjdk.jmh.runner.Runner']);
        // 无重复
        expect(new Set(arr).size).toBe(arr.length);
    });
});

describe('validateConfig 校验', () => {
    test('空方法名报错', () => {
        const cfg = defaultConfig();
        cfg.methods[0].name = '';
        const errs = validateConfig(cfg);
        expect(errs.some((e) => e.field.includes('name'))).toBe(true);
    });
    test('无效 BenchmarkMode 报错', () => {
        const cfg = defaultConfig();
        cfg.global.mode = ['Throughput', 'BogusMode'];
        const errs = validateConfig(cfg);
        expect(errs.some((e) => e.field.includes('mode'))).toBe(true);
    });
    test('重复方法名报错', () => {
        const cfg = defaultConfig();
        cfg.methods = [
            { name: 'foo', returnType: 'void', params: [], group: null },
            { name: 'foo', returnType: 'void', params: [], group: null },
        ];
        const errs = validateConfig(cfg);
        expect(errs.some((e) => e.msg.includes('重复'))).toBe(true);
    });
    test('无效 Scope 报错', () => {
        const cfg = defaultConfig();
        cfg.global.stateScope = 'Bogus';
        const errs = validateConfig(cfg);
        expect(errs.some((e) => e.field.includes('stateScope'))).toBe(true);
    });
    test('无效 CompilerControl 报错', () => {
        const cfg = defaultConfig();
        cfg.global.compilerControl = 'NOPE';
        const errs = validateConfig(cfg);
        expect(errs.some((e) => e.field.includes('compilerControl'))).toBe(true);
    });
});

describe('opts.main / setup / teardown', () => {
    test('addMain=true 含 main 函数', () => {
        const cfg = defaultConfig();
        cfg.opts = { addMain: true, addSetup: false, addTearDown: false };
        const out = generateJmhClass('demo', 'Bench', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('public static void main(String[] args)');
        expect(out).toContain('new Runner(opt).run()');
    });
    test('addMain=false 不含 main', () => {
        const cfg = defaultConfig();
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).not.toContain('public static void main');
    });
    test('addSetup + addTearDown 包含相应注解', () => {
        const cfg = defaultConfig();
        cfg.opts = { addMain: false, addSetup: true, addTearDown: true };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@Setup');
        expect(out).toContain('@TearDown');
        expect(out).toContain('void setup()');
        expect(out).toContain('void tearDown()');
    });
});

describe('BenchmarkMode 三种组合', () => {
    test('单模式直接 @BenchmarkMode(Mode.X)', () => {
        const cfg = defaultConfig();
        cfg.global.mode = ['Throughput'];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@BenchmarkMode(Mode.Throughput)');
    });
    test('多模式数组形式', () => {
        const cfg = defaultConfig();
        cfg.global.mode = ['Throughput', 'AverageTime', 'SampleTime'];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@BenchmarkMode({ Mode.Throughput, Mode.AverageTime, Mode.SampleTime })');
    });
    test('Mode.All 输出 4 行注释', () => {
        const cfg = defaultConfig();
        cfg.global.mode = ['All'];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@BenchmarkMode(Mode.All)');
        const commentLines = out.split('\n').filter((l) => /^\s*\/\/\s*-\s*Mode\./.test(l));
        expect(commentLines.length).toBe(4);
    });
});

describe('generateMethod 独立函数', () => {
    test('@Group A role body 含 phaser 调用', () => {
        const code = generateMethod(
            { name: 'producer', returnType: 'void', params: [], group: { name: 'g1', groupThreads: 1, role: 'A' } },
            'M'
        );
        expect(code).toContain('@Group("g1")');
        expect(code).toContain('public void producer()');
        expect(code).toContain('phaser.arrive()');
        expect(code).toContain('phaser.awaitAdvance(');
    });
    test('非 void 返回类型 return null/0/empty', () => {
        const a = generateMethod({ name: 'foo', returnType: 'String', params: [], group: null }, 'M');
        expect(a).toContain('return "";');
        const b = generateMethod({ name: 'bar', returnType: 'long', params: [], group: null }, 'M');
        expect(b).toContain('return 0;');
        const c = generateMethod({ name: 'baz', returnType: 'Object', params: [], group: null }, 'M');
        expect(c).toContain('return null;');
    });
});

describe('@Timeout + @CompilerControl', () => {
    test('输出 @Timeout 与 @CompilerControl', () => {
        const cfg = defaultConfig();
        cfg.global.timeout = { time: 30, timeUnit: 'SECONDS' };
        cfg.global.compilerControl = 'EXCLUSIVE';
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@Timeout(time = 30, timeUnit = TimeUnit.SECONDS)');
        expect(out).toContain('@CompilerControl(CompilerControl.Mode.EXCLUSIVE)');
    });
});

describe('生成边界', () => {
    test('默认 className + 1 方法输出完整类', () => {
        const cfg = defaultConfig();
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'BenchX', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('public class BenchX');
        expect(out).toContain('public void ' + cfg.methods[0].name + '()');
        expect(out).toContain('// TODO: 实现被测逻辑');
    });
    test('空 methods 安全降级', () => {
        const cfg = defaultConfig();
        cfg.methods = [];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'Empty', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('public class Empty');
    });
});

describe('imports 实际生成', () => {
    test('默认 5 个 import 全部出现', () => {
        const cfg = defaultConfig();
        cfg.opts = { addMain: true, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('import org.openjdk.jmh.annotations.*;');
        expect(out).toContain('import org.openjdk.jmh.runner.Runner;');
        expect(out).toContain('import org.openjdk.jmh.runner.options.Options;');
        expect(out).toContain('import org.openjdk.jmh.runner.options.OptionsBuilder;');
        expect(out).toContain('import java.util.concurrent.TimeUnit;');
    });
    test('@Group + Scope.Group 自动加 Phaser import', () => {
        const cfg = defaultConfig();
        cfg.global.stateScope = 'Group';
        cfg.methods = [
            { name: 'a', returnType: 'void', params: [], group: { name: 'g1', groupThreads: 1, role: 'A' } },
            { name: 'b', returnType: 'void', params: [], group: { name: 'g1', groupThreads: 1, role: 'B' } },
        ];
        cfg.opts = { addMain: true, addSetup: true, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('import java.util.concurrent.Phaser;');
    });
});

describe('Scope 切换', () => {
    test('Scope.Benchmark 输出', () => {
        const cfg = defaultConfig();
        cfg.global.stateScope = 'Benchmark';
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@State(Scope.Benchmark)');
    });
});

describe('package 处理', () => {
    test('package 为空时不输出 package 行', () => {
        const cfg = defaultConfig();
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out.startsWith('import ')).toBe(true);
        expect(out).not.toContain('package ');
    });
    test('package 非空时输出 package 行', () => {
        const cfg = defaultConfig();
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('com.demo.bench', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('package com.demo.bench;');
    });
});

describe('@Param 校验', () => {
    test('@Param 缺 values 报错', () => {
        const cfg = defaultConfig();
        cfg.methods = [{ name: 'a', returnType: 'void', params: [{ name: 'size', values: [] }], group: null }];
        const errs = validateConfig(cfg);
        expect(errs.some((e) => e.field.includes('values'))).toBe(true);
    });
});

// ===== 以下为 basic 模式专项测试 =====
// basic 模式 = 单方法 + 默认 Throughput + 标准 JVM args + 无 @Group / @Param / @Threads / @CompilerControl
// 与即将被合并的 jmh.js 输出形态一致, 用以验证 jmhpro 在 "基础单方法" 场景下的代码生成稳定

describe('basic 模式 - 默认配置完整生成', () => {
    test('含 5 项基础注解 (Mode/OutputTimeUnit/Fork/Warmup/Measurement) + main + setup + teardown', () => {
        const cfg = defaultConfig();
        const out = generateJmhClass('com.example', 'MyBench', cfg.methods, cfg.global, cfg.opts);
        expect(out).toContain('@BenchmarkMode(Mode.Throughput)');
        expect(out).toContain('@OutputTimeUnit(TimeUnit.MILLISECONDS)');
        expect(out).toContain('@Fork(');
        expect(out).toContain('@Warmup(');
        expect(out).toContain('@Measurement(');
        expect(out).toContain('public static void main(String[] args)');
        expect(out).toContain('@Setup');
        expect(out).toContain('@TearDown');
    });
    test('不含进阶特性注解 (显式清空 timeout 抑制 @Timeout)', () => {
        const cfg = defaultConfig();
        cfg.global.timeout = { time: 0, timeUnit: 'MINUTES' };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).not.toContain('@Group');
        expect(out).not.toContain('@Param');
        expect(out).not.toContain('@Threads(');
        expect(out).not.toContain('@CompilerControl');
        expect(out).not.toContain('@Timeout');
        expect(out).not.toContain('@GroupThreads');
        expect(out).not.toContain('Phaser');
    });
    test('默认 fork.value=1 + 标准 jvmArgs ("-Xms512m,-Xmx512m") 输出按逗号拆为两段', () => {
        const cfg = defaultConfig();
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toMatch(/@Fork\(value = 1, jvmArgs = \{"-Xms512m", "-Xmx512m"\}\)/);
    });
});

describe('basic 模式 - 单方法签名', () => {
    test('默认方法名为 baseline + 返回类型 void + 含 TODO 占位', () => {
        const cfg = defaultConfig();
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toMatch(/public void baseline\(\)/);
        expect(out).toContain('// TODO: 实现被测逻辑');
    });
    test('返回类型为 String 时返回 "" 占位', () => {
        const cfg = defaultConfig();
        cfg.methods = [{ name: 'bench', returnType: 'String', params: [], group: null }];
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out).toMatch(/public String bench\(\)/);
        expect(out).toContain('return "";');
    });
    test('@Benchmark 注解紧贴方法签名 (与 @BenchmarkMode 区分)', () => {
        const cfg = defaultConfig();
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        // 使用 (?!M) 排除 @BenchmarkMode 这种误匹配
        const match = out.match(/@Benchmark\s*\n\s*public void baseline\(\)/);
        expect(match).not.toBeNull();
    });
});

describe('basic 模式 - validateConfig 默认配置无错', () => {
    test('defaultConfig 校验结果为空数组 (通过)', () => {
        const errs = validateConfig(defaultConfig());
        expect(errs).toEqual([]);
    });
    test('生成的代码以 import 打头并被一对大括号包裹', () => {
        const cfg = defaultConfig();
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        expect(out.startsWith('import ')).toBe(true);
        expect(out.trimEnd().endsWith('}')).toBe(true);
        // 类体包裹
        expect(out).toMatch(/public class M \{[\s\S]*\}/);
    });
});

describe('basic 模式 - 所有 benchmark 方法均为 @Benchmark 注解', () => {
    test('方法数 = @Benchmark 注解数', () => {
        const cfg = defaultConfig();
        cfg.methods = [
            { name: 'm1', returnType: 'void', params: [], group: null },
            { name: 'm2', returnType: 'void', params: [], group: null },
            { name: 'm3', returnType: 'void', params: [], group: null },
        ];
        cfg.opts = { addMain: false, addSetup: false, addTearDown: false };
        const out = generateJmhClass('', 'M', cfg.methods, cfg.global, cfg.opts);
        const benchmarks = (out.match(/@Benchmark\b/g) || []).length;
        expect(benchmarks).toBe(cfg.methods.length);
    });
});
