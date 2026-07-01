const { generateBasicJmh, applyBasicConfig } = require('../../js/codegen/jmhpro.js');

function makeMockDom(values) {
    const map = {};
    for (const [id, v] of Object.entries(values)) {
        map[id] = { value: v, checked: !!v && v !== '' && v !== '0' };
    }
    return {
        getElementById: (id) => map[id] || (id === 'jmpBasicState' ? null : { value: '', checked: false }),
    };
}

describe('generateBasicJmh 默认值', () => {
    test('无参调用使用默认值 (className=MyBenchmark, methodName=myMethod, Throughput, state=true)', () => {
        const out = generateBasicJmh({});
        expect(out).toContain('public class MyBenchmark {');
        expect(out).toContain('public void myMethod()');
        expect(out).toContain('@BenchmarkMode(Mode.Throughput)');
        expect(out).toContain('@OutputTimeUnit(TimeUnit.MILLISECONDS)');
        expect(out).toContain('@Fork(value = 1, jvmArgs = {"-Xms512m", "-Xmx512m"})');
        expect(out).toContain('@Warmup(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)');
        expect(out).toContain('@Measurement(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)');
        expect(out).toContain('@State(Scope.Thread)');
        expect(out).toContain('@Setup');
        expect(out).toContain('@TearDown');
        expect(out).toContain('public static void main(String[] args)');
    });
    test('输出包含 5 个标准 import', () => {
        const out = generateBasicJmh({});
        expect(out).toContain('import org.openjdk.jmh.annotations.*;');
        expect(out).toContain('import org.openjdk.jmh.runner.Runner;');
        expect(out).toContain('import org.openjdk.jmh.runner.options.Options;');
        expect(out).toContain('import org.openjdk.jmh.runner.options.OptionsBuilder;');
        expect(out).toContain('import java.util.concurrent.TimeUnit;');
    });
});

describe('generateBasicJmh 自定义字段', () => {
    test('修改类名 + 方法名', () => {
        const out = generateBasicJmh({ className: 'HashBench', methodName: 'hashString' });
        expect(out).toContain('public class HashBench {');
        expect(out).toContain('public void hashString()');
        expect(out).toContain('.include(HashBench.class.getSimpleName())');
    });
    test('修改 fork / warmup / measure 数值', () => {
        const out = generateBasicJmh({
            fork: 3,
            warmupIter: 10,
            warmupTime: 2,
            measureIter: 8,
            measureTime: 3,
        });
        expect(out).toContain('@Fork(value = 3, jvmArgs = {"-Xms512m", "-Xmx512m"})');
        expect(out).toContain('@Warmup(iterations = 10, time = 2, timeUnit = TimeUnit.SECONDS)');
        expect(out).toContain('@Measurement(iterations = 8, time = 3, timeUnit = TimeUnit.SECONDS)');
    });
    test('不同 BenchmarkMode 映射到 Mode.X', () => {
        expect(generateBasicJmh({ mode: 'AverageTime' })).toContain('@BenchmarkMode(Mode.AverageTime)');
        expect(generateBasicJmh({ mode: 'SampleTime' })).toContain('@BenchmarkMode(Mode.SampleTime)');
        expect(generateBasicJmh({ mode: 'SingleShotTime' })).toContain('@BenchmarkMode(Mode.SingleShotTime)');
        expect(generateBasicJmh({ mode: 'All' })).toContain('@BenchmarkMode(Mode.All)');
    });
    test('非法数值字符串回退到默认值', () => {
        const out = generateBasicJmh({ fork: 'abc', warmupIter: '', measureTime: 'xyz' });
        expect(out).toContain('@Fork(value = 1,');
        expect(out).toContain('@Warmup(iterations = 5, time = 1,');
        expect(out).toContain('@Measurement(iterations = 5, time = 1,');
    });
});

describe('generateBasicJmh @State 开关', () => {
    test('state=false 不输出 @State / @Setup / @TearDown', () => {
        const out = generateBasicJmh({ state: false });
        expect(out).not.toContain('@State(Scope.Thread)');
        expect(out).not.toContain('@State(');
        expect(out).not.toContain('@Setup');
        expect(out).not.toContain('@TearDown');
        expect(out).toContain('@Benchmark');
        expect(out).toContain('public void myMethod()');
    });
    test('state=true 输出 @State + @Setup + @TearDown', () => {
        const out = generateBasicJmh({ state: true });
        expect(out).toContain('@State(Scope.Thread)');
        expect(out).toContain('@Setup');
        expect(out).toContain('public void setup()');
        expect(out).toContain('@TearDown');
        expect(out).toContain('public void tearDown()');
    });
});

describe('applyBasicConfig 行为', () => {
    let origDocument;
    beforeEach(() => {
        origDocument = global.document;
    });
    afterEach(() => {
        global.document = origDocument;
    });

    test('document 不存在时使用安全默认值', () => {
        delete global.document;
        const cfg = applyBasicConfig();
        expect(cfg.className).toBe('');
        expect(cfg.methodName).toBe('');
        expect(cfg.mode).toBe('Throughput');
        expect(cfg.state).toBe(true);
    });
    test('document 存在时正确读取各字段', () => {
        global.document = makeMockDom({
            jmpBasicClass: 'MyBench',
            jmpBasicMethod: 'doWork',
            jmpBasicMode: 'AverageTime',
            jmpBasicFork: '3',
            jmpBasicWarmup: '10',
            jmpBasicWarmupTime: '2',
            jmpBasicMeas: '8',
            jmpBasicMeasTime: '3',
            jmpBasicState: '1',
        });
        const cfg = applyBasicConfig();
        expect(cfg.className).toBe('MyBench');
        expect(cfg.methodName).toBe('doWork');
        expect(cfg.mode).toBe('AverageTime');
        expect(cfg.fork).toBe('3');
        expect(cfg.warmupIter).toBe('10');
        expect(cfg.warmupTime).toBe('2');
        expect(cfg.measureIter).toBe('8');
        expect(cfg.measureTime).toBe('3');
        expect(cfg.state).toBe(true);
    });
});
