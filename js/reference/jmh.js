function jmhGenerate() {
    const className = document.getElementById('jmhClass').value.trim() || 'MyBenchmark';
    const methodName = document.getElementById('jmhMethod').value.trim() || 'myMethod';
    const mode = document.getElementById('jmhMode').value;
    const fork = parseInt(document.getElementById('jmhFork').value) || 1;
    const warmupIter = parseInt(document.getElementById('jmhWarmup').value) || 5;
    const warmupTime = parseInt(document.getElementById('jmhWarmupTime').value) || 1;
    const measureIter = parseInt(document.getElementById('jmhMeas').value) || 5;
    const measureTime = parseInt(document.getElementById('jmhMeasTime').value) || 1;
    const state = document.getElementById('jmhState').checked;

    const modeLabel = {
        'Throughput': 'Mode.Throughput',
        'AverageTime': 'Mode.AverageTime',
        'SampleTime': 'Mode.SampleTime',
        'SingleShotTime': 'Mode.SingleShotTime',
        'All': 'Mode.All'
    }[mode];

    let code = `import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;
import java.util.concurrent.TimeUnit;

@BenchmarkMode(${modeLabel})
@OutputTimeUnit(TimeUnit.MILLISECONDS)
@Fork(value = ${fork}, jvmArgs = {"-Xms512m", "-Xmx512m"})
@Warmup(iterations = ${warmupIter}, time = ${warmupTime}, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = ${measureIter}, time = ${measureTime}, timeUnit = TimeUnit.SECONDS)`;
    if (state) {
        code += `
@State(Scope.Thread)`;
    }
    code += `
public class ${className} {
`;

    if (state) {
        code += `
    @Setup
    public void setup() {
        // TODO: 初始化资源
    }

    @TearDown
    public void tearDown() {
        // TODO: 清理资源
    }
`;
    }

    code += `
    @Benchmark
    public void ${methodName}() {
        // TODO: 实现被测逻辑
    }

    public static void main(String[] args) throws Exception {
        Options opt = new OptionsBuilder()
                .include(${className}.class.getSimpleName())
                .build();
        new Runner(opt).run();
    }
}`;

    const out = document.getElementById('jmhOutput');
    out.textContent = code;
    out.className = 'output-box';
    setStatus('JMH 代码已生成');
}

function jmhCopyOutput() {
    const el = document.getElementById('jmhOutput');
    copyText(el);
}
