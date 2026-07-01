const { generateStreamCode } = require('../../js/codegen/javastream.js');

describe('generateStreamCode 基本链', () => {
    test('基础 filter + map + collect(toList)', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [
                { kind: 'filter', expr: 'u -> u.getAge() > 18' },
                { kind: 'map', expr: 'User::getName' },
            ],
            terminal: { kind: 'collect', collect: 'toList' },
            target: { declare: true, var: 'result', type: 'List<String>' },
            addImports: true,
        });
        expect(r.code).toContain('List<String> result =');
        expect(r.code).toContain('users.stream()');
        expect(r.code).toContain('.filter(u -> u.getAge() > 18)');
        expect(r.code).toContain('.map(User::getName)');
        expect(r.code).toContain('.collect(Collectors.toList())');
        expect(r.imports).toContain('java.util.stream.Collectors');
    });

    test('limit + skip + distinct + peek + flatMap', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [
                { kind: 'distinct' },
                { kind: 'skip', n: 5 },
                { kind: 'limit', n: 10 },
                { kind: 'peek', expr: 'System.out::println' },
                { kind: 'flatMap', expr: 'u -> u.getOrders()' },
            ],
            terminal: { kind: 'count' },
            target: { declare: true, var: 'cnt', type: 'long' },
        });
        expect(r.code).toContain('.distinct()');
        expect(r.code).toContain('.skip(5)');
        expect(r.code).toContain('.limit(10)');
        expect(r.code).toContain('.peek(System.out::println)');
        expect(r.code).toContain('.flatMap(u -> u.getOrders())');
        expect(r.code).toContain('.count()');
        expect(r.code).toContain('long cnt');
    });

    test('sorted 字段升序', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'sorted', comparator: { type: 'field', field: 'age', direction: 'asc' } }],
            terminal: { kind: 'collect', collect: 'toList' },
        });
        expect(r.code).toContain('.sorted(Comparator.comparing(User::getAge))');
        expect(r.code).not.toContain('.reversed()');
        expect(r.imports).toContain('java.util.Comparator');
    });

    test('sorted 字段降序附加 reversed', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'sorted', comparator: { type: 'field', field: 'name', direction: 'desc' } }],
            terminal: { kind: 'collect', collect: 'toList' },
        });
        expect(r.code).toContain('Comparator.comparing(User::getName).reversed()');
        expect(r.imports).toContain('java.util.Comparator');
    });

    test('sorted naturalOrder', () => {
        const r = generateStreamCode({
            source: { type: 'List<String>', var: 'list' },
            steps: [{ kind: 'sorted', comparator: { type: 'naturalOrder' } }],
            terminal: { kind: 'collect', collect: 'toList' },
        });
        expect(r.code).toContain('.sorted()');
        expect(r.code).not.toContain('Comparator');
        expect(r.imports).not.toContain('java.util.Comparator');
    });
});

describe('generateStreamCode 终止变体', () => {
    test('findFirst 带 orElse(null)', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'filter', expr: 'u -> u.isActive()' }],
            terminal: { kind: 'findFirst' },
            target: { declare: true, var: 'u', type: 'User' },
        });
        expect(r.code).toContain('.findFirst().orElse(null)');
    });

    test('findAny + anyMatch 终止', () => {
        const a = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            terminal: { kind: 'findAny' },
        });
        expect(a.code).toContain('.findAny().orElse(null)');
        const b = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            terminal: { kind: 'anyMatch', expr: 'u -> u.getAge() > 18' },
        });
        expect(b.code).toContain('.anyMatch(u -> u.getAge() > 18)');
    });

    test('count + allMatch + noneMatch', () => {
        const a = generateStreamCode({ source: { type: 'List<Integer>', var: 'xs' }, terminal: { kind: 'count' } });
        expect(a.code).toContain('.count()');
        const b = generateStreamCode({
            source: { type: 'List<Integer>', var: 'xs' },
            terminal: { kind: 'allMatch', expr: 'x -> x > 0' },
        });
        expect(b.code).toContain('.allMatch(x -> x > 0)');
        const c = generateStreamCode({
            source: { type: 'List<Integer>', var: 'xs' },
            terminal: { kind: 'noneMatch', expr: 'x -> x < 0' },
        });
        expect(c.code).toContain('.noneMatch(x -> x < 0)');
    });

    test('reduce 带 identity 与不带', () => {
        const a = generateStreamCode({
            source: { type: 'List<Integer>', var: 'xs' },
            terminal: { kind: 'reduce', identity: '0', op: '(a, b) -> a + b' },
        });
        expect(a.code).toContain('.reduce(0, (a, b) -> a + b)');
        const b = generateStreamCode({
            source: { type: 'List<Integer>', var: 'xs' },
            terminal: { kind: 'reduce', op: 'Integer::sum' },
        });
        expect(b.code).toContain('.reduce(Integer::sum).orElse(null)');
    });

    test('collect toMap + joining + toSet', () => {
        const a = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            terminal: { kind: 'collect', collect: 'toMap', key: 'User::getId', value: 'User::getName' },
        });
        expect(a.code).toContain('.collect(Collectors.toMap(User::getId, User::getName))');
        expect(a.imports).toContain('java.util.stream.Collectors');

        const b = generateStreamCode({
            source: { type: 'List<String>', var: 'tags' },
            terminal: { kind: 'collect', collect: 'joining', sep: ' | ' },
        });
        expect(b.code).toContain('.collect(Collectors.joining(" | "))');

        const c = generateStreamCode({
            source: { type: 'List<Integer>', var: 'xs' },
            terminal: { kind: 'collect', collect: 'toSet' },
        });
        expect(c.code).toContain('.collect(Collectors.toSet())');
    });

    test('forEach 终止', () => {
        const r = generateStreamCode({
            source: { type: 'List<String>', var: 'tags' },
            steps: [{ kind: 'map', expr: 'String::toUpperCase' }],
            terminal: { kind: 'forEach', expr: 'System.out::println' },
        });
        expect(r.code).toContain('.map(String::toUpperCase)');
        expect(r.code).toContain('.forEach(System.out::println)');
    });
});

describe('generateStreamCode group/partition', () => {
    test('groupBy + downstream toList', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'groupBy', key: 'city', downstream: 'toList' }],
        });
        expect(r.code).toContain('Collectors.groupingBy(User::getCity, Collectors.toList())');
        expect(r.code).toContain('.collect(');
        // groupBy 终止后不再追加 toList
        expect(r.code.match(/\.collect\(/g).length).toBe(1);
        expect(r.imports).toContain('java.util.stream.Collectors');
    });

    test('groupBy downstream counting/mapping/toSet', () => {
        const a = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'groupBy', key: 'city', downstream: 'counting' }],
        });
        expect(a.code).toContain('Collectors.counting()');
        const b = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'groupBy', key: 'city', downstream: 'mapping', mapping: 'User::getName' }],
        });
        expect(b.code).toContain('Collectors.mapping(User::getName, Collectors.toList())');
        const c = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'groupBy', key: 'city', downstream: 'toSet' }],
        });
        expect(c.code).toContain('Collectors.toSet()');
    });

    test('partitionBy 终止', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'partitionBy', pred: 'u -> u.isActive()' }],
        });
        expect(r.code).toContain('.collect(Collectors.partitioningBy(u -> u.isActive()))');
        expect(r.imports).toContain('java.util.stream.Collectors');
    });
});

describe('generateStreamCode 数据源与 import', () => {
    test('Map 数据源生成 entrySet().stream()', () => {
        const r = generateStreamCode({
            source: { type: 'Map<String,Integer>', var: 'map' },
            steps: [{ kind: 'map', expr: 'Map.Entry::getKey' }],
            terminal: { kind: 'collect', collect: 'toList' },
        });
        expect(r.code).toContain('map.entrySet().stream()');
        expect(r.code).toContain('.map(Map.Entry::getKey)');
    });

    test('int[] 数据源生成 Arrays.stream + Arrays import', () => {
        const r = generateStreamCode({
            source: { type: 'int[]', var: 'arr' },
            steps: [],
            terminal: { kind: 'count' },
        });
        expect(r.code).toContain('Arrays.stream(arr)');
        expect(r.imports).toContain('java.util.Arrays');
    });

    test('对象数组数据源生成 Arrays.stream', () => {
        const r = generateStreamCode({
            source: { type: 'User[]', var: 'arr' },
            steps: [],
            terminal: { kind: 'count' },
        });
        expect(r.code).toContain('Arrays.stream(arr)');
        expect(r.imports).toContain('java.util.Arrays');
    });

    test('addImports=false 时 imports 为空', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [{ kind: 'sorted', comparator: { type: 'field', field: 'age', direction: 'asc' } }],
            terminal: { kind: 'collect', collect: 'toList' },
            addImports: false,
        });
        expect(r.imports).toEqual([]);
    });

    test('不带 generate 变量声明时仅返回表达式', () => {
        const r = generateStreamCode({
            source: { type: 'List<String>', var: 'tags' },
            terminal: { kind: 'count' },
            target: { declare: false },
        });
        expect(r.code.startsWith('tags.stream()')).toBe(true);
        expect(r.code.trim().endsWith('.count();')).toBe(true);
    });
});

describe('generateStreamCode 格式与边界', () => {
    test('空步骤链直接生成 stream().terminal', () => {
        const r = generateStreamCode({
            source: { type: 'List<String>', var: 'tags' },
            terminal: { kind: 'collect', collect: 'toList' },
        });
        expect(r.code).toBe('tags.stream().collect(Collectors.toList());');
    });

    test('多步骤链换行 + 8 空格缩进', () => {
        const r = generateStreamCode({
            source: { type: 'List<User>', var: 'users' },
            steps: [
                { kind: 'filter', expr: 'u -> u.getAge() >= 18' },
                { kind: 'map', expr: 'User::getName' },
                { kind: 'sorted' },
                { kind: 'limit', n: 100 },
            ],
            terminal: { kind: 'collect', collect: 'toList' },
            target: { declare: true, var: 'result', type: 'List<String>' },
        });
        const lines = r.code.split('\n');
        expect(lines[0]).toBe('List<String> result = users.stream()');
        expect(lines[1]).toBe('        .filter(u -> u.getAge() >= 18)');
        expect(lines[2]).toBe('        .map(User::getName)');
        expect(lines[3]).toBe('        .sorted()');
        expect(lines[4]).toBe('        .limit(100)');
        expect(lines[5]).toBe('        .collect(Collectors.toList());');
    });

    test('null / 缺省配置安全降级', () => {
        const r = generateStreamCode({});
        expect(r.code).toContain('data.stream()');
        expect(r.code).toContain('.collect(Collectors.toList())');
    });

    test('步骤缺字段时回退默认值 (filter/limit/skip/expr)', () => {
        const r = generateStreamCode({
            source: { type: 'List<X>', var: 'xs' },
            steps: [{ kind: 'filter' }, { kind: 'limit' }, { kind: 'skip' }, { kind: 'map' }],
            terminal: { kind: 'collect', collect: 'toList' },
        });
        expect(r.code).toContain('.filter(x -> true)');
        expect(r.code).toContain('.limit(10)');
        expect(r.code).toContain('.skip(0)');
        expect(r.code).toContain('.map(x -> x)');
    });
});
