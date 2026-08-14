// ES / JS 特性速查 — 数据 + RefEngine 挂载

const ESREF_DATA = [
    {
        cat: '解构 / 展开',
        items: [
            {
                name: '数组解构',
                desc: '按位置取值，可默认值与跳过',
                code: "const [a, b = 0, , c] = [1, undefined, 3, 4]\n// a=1, b=0, c=4",
            },
            {
                name: '对象解构',
                desc: '按属性名取值，可重命名',
                code: "const { name, age: years = 0 } = user",
            },
            {
                name: '剩余参数 ...rest',
                desc: '收集剩余项',
                code: "const [head, ...tail] = arr\nconst { id, ...rest } = obj\nfunction f(a, ...args) {}",
            },
            {
                name: '展开 ...spread',
                desc: '展开数组/对象（浅拷贝）',
                code: "const arr2 = [...arr, 4]\nconst obj2 = { ...obj, x: 1 }",
            },
            {
                name: '函数参数解构',
                desc: '直接解构入参',
                code: "function greet({ name = 'Guest' } = {}) {\n  return `Hi ${name}`\n}",
            },
            {
                name: '交换变量',
                desc: '无临时变量交换',
                code: ';[a, b] = [b, a]',
            },
        ],
    },
    {
        cat: 'Promise / async',
        items: [
            {
                name: 'Promise',
                desc: '异步结果容器',
                code: "new Promise((resolve, reject) => {\n  ok ? resolve(v) : reject(err)\n})",
            },
            {
                name: 'then / catch / finally',
                desc: '链式处理',
                code: "fetch(url)\n  .then(r => r.json())\n  .catch(console.error)\n  .finally(() => setLoading(false))",
            },
            {
                name: 'async / await',
                desc: '同步风格写异步',
                code: "async function load() {\n  try {\n    const data = await fetch(url).then(r => r.json())\n    return data\n  } catch (e) {\n    console.error(e)\n  }\n}",
            },
            {
                name: 'Promise.all',
                desc: '全部成功；任一失败即失败',
                code: 'const [a, b] = await Promise.all([p1, p2])',
            },
            {
                name: 'Promise.allSettled',
                desc: '全部结束（成功或失败）',
                code: "const results = await Promise.allSettled([p1, p2])\n// { status: 'fulfilled'|'rejected', value|reason }",
            },
            {
                name: 'Promise.race',
                desc: '最先完成的结果',
                code: 'const first = await Promise.race([p1, timeout(3000)])',
            },
            {
                name: 'Promise.any',
                desc: '第一个成功；全失败抛 AggregateError',
                code: 'const v = await Promise.any([p1, p2])',
            },
            {
                name: 'Promise.resolve / reject',
                desc: '包装已有值',
                code: 'Promise.resolve(1)\nPromise.reject(new Error("fail"))',
            },
        ],
    },
    {
        cat: '数组方法',
        items: [
            {
                name: 'map / filter / reduce',
                desc: '映射、过滤、归约',
                code: "arr.map(x => x * 2)\narr.filter(x => x > 0)\narr.reduce((s, x) => s + x, 0)",
            },
            {
                name: 'find / findIndex / findLast',
                desc: '查找元素 / 下标',
                code: "arr.find(x => x.id === id)\narr.findIndex(x => x > 10)\narr.findLast(x => x.ok)",
            },
            {
                name: 'some / every',
                desc: '是否存在 / 是否全部满足',
                code: 'arr.some(x => x.done)\narr.every(x => x.valid)',
            },
            {
                name: 'includes / indexOf',
                desc: '包含判断',
                code: "arr.includes(1)\nstr.includes('ab')",
            },
            {
                name: 'flat / flatMap',
                desc: '扁平化',
                code: 'arr.flat(2)\narr.flatMap(x => [x, x * 2])',
            },
            {
                name: 'sort / toSorted',
                desc: '排序（sort 原地；toSorted 不可变）',
                code: "arr.sort((a, b) => a - b)\nconst next = arr.toSorted((a, b) => a - b)",
            },
            {
                name: 'at',
                desc: '支持负索引',
                code: 'arr.at(-1) // 最后一项',
            },
            {
                name: 'Array.from / Array.of',
                desc: '从类数组/可迭代创建数组',
                code: "Array.from({ length: 3 }, (_, i) => i)\nArray.of(1, 2, 3)",
            },
            {
                name: 'with / toSpliced / toReversed',
                desc: '不可变更新（ES2023）',
                code: 'arr.with(0, 9)\narr.toSpliced(1, 1, "x")\narr.toReversed()',
            },
        ],
    },
    {
        cat: '对象',
        items: [
            {
                name: '简写 / 计算属性名',
                desc: '对象字面量增强',
                code: "const name = 'a'\nconst obj = { name, [name + '1']: 1, method() {} }",
            },
            {
                name: 'Object.keys / values / entries',
                desc: '枚举自有可枚举属性',
                code: 'Object.keys(obj)\nObject.values(obj)\nObject.entries(obj)',
            },
            {
                name: 'Object.fromEntries',
                desc: 'entries 转对象',
                code: "Object.fromEntries([['a', 1], ['b', 2]])",
            },
            {
                name: 'Object.assign',
                desc: '浅合并到目标对象',
                code: 'Object.assign({}, defaults, options)',
            },
            {
                name: 'Object.freeze / seal',
                desc: '冻结 / 密封',
                code: 'Object.freeze(obj) // 不可改\nObject.seal(obj)   // 不可增删',
            },
            {
                name: '可选链式赋值？',
                desc: '无（仅读取用 ?.）；写用逻辑判断',
                code: "if (obj?.nested) obj.nested.x = 1",
            },
            {
                name: '结构化克隆',
                desc: '深拷贝（有限制）',
                code: 'const copy = structuredClone(obj)',
            },
        ],
    },
    {
        cat: '模块',
        items: [
            {
                name: 'export',
                desc: '命名 / 默认导出',
                code: "export const a = 1\nexport function f() {}\nexport default class App {}",
            },
            {
                name: 'import',
                desc: '静态导入',
                code: "import App, { a, f as fn } from './mod.js'\nimport * as mod from './mod.js'",
            },
            {
                name: '动态 import()',
                desc: '按需异步加载',
                code: "const { load } = await import('./heavy.js')",
            },
            {
                name: 'import.meta',
                desc: '模块元信息',
                code: 'import.meta.url\n// Vite: import.meta.env.MODE',
            },
            {
                name: 're-export',
                desc: '中转导出',
                code: "export { a } from './a.js'\nexport * from './b.js'\nexport { default } from './c.js'",
            },
            {
                name: 'top-level await',
                desc: '模块顶层直接 await',
                code: "const data = await fetch('/api').then(r => r.json())\nexport default data",
            },
        ],
    },
    {
        cat: '可选链 / 空值合并',
        items: [
            {
                name: '?. 可选链',
                desc: '短路访问，避免 TypeError',
                code: "obj?.a?.b\narr?.[0]\nfn?.(arg)",
            },
            {
                name: '?? 空值合并',
                desc: '仅 null/undefined 时用右侧',
                code: "const v = input ?? 'default'\n// 0、''、false 不会被替换",
            },
            {
                name: '??= ||= &&=',
                desc: '逻辑赋值',
                code: "a ??= 1  // a 为 null/undefined 时赋值\nb ||= x  // 假值时赋值\nc &&= y  // 真值时赋值",
            },
            {
                name: '?. 与 ?? 组合',
                desc: '安全取值 + 默认',
                code: "const name = user?.profile?.name ?? '匿名'",
            },
            {
                name: '与 || 区别',
                desc: '|| 把所有假值当空；?? 更严格',
                code: "0 || 1   // 1\n0 ?? 1   // 0",
            },
        ],
    },
    {
        cat: '迭代器 / 生成器',
        items: [
            {
                name: 'for...of',
                desc: '遍历可迭代对象',
                code: "for (const item of list) {}\nfor (const [k, v] of map) {}",
            },
            {
                name: '可迭代协议',
                desc: '[Symbol.iterator]',
                code: "const obj = {\n  *[Symbol.iterator]() {\n    yield 1; yield 2\n  }\n}",
            },
            {
                name: 'function*',
                desc: '生成器函数',
                code: "function* gen() {\n  yield 1\n  yield 2\n}\nconst g = gen()\ng.next() // { value: 1, done: false }",
            },
            {
                name: 'yield*',
                desc: '委托另一可迭代',
                code: "function* all() {\n  yield* [1, 2]\n  yield* otherGen()\n}",
            },
            {
                name: 'async generator',
                desc: '异步生成器',
                code: "async function* pages() {\n  let i = 1\n  while (true) {\n    yield await fetchPage(i++)\n  }\n}\nfor await (const p of pages()) {}",
            },
            {
                name: 'Map / Set',
                desc: '键值映射 / 唯一集合',
                code: "const m = new Map([['a', 1]])\nm.set('b', 2).get('a')\nconst s = new Set([1, 2, 2]) // {1,2}",
            },
        ],
    },
    {
        cat: '常用全局 API',
        items: [
            {
                name: 'JSON',
                desc: '序列化 / 反序列化',
                code: "JSON.stringify(obj, null, 2)\nJSON.parse(str)",
            },
            {
                name: 'fetch',
                desc: '网络请求',
                code: "const res = await fetch(url, {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(data),\n})\nconst json = await res.json()",
            },
            {
                name: 'URL / URLSearchParams',
                desc: 'URL 解析与查询串',
                code: "const u = new URL(location.href)\nu.searchParams.set('q', 'js')\nconst q = new URLSearchParams('a=1&b=2')",
            },
            {
                name: 'Intl',
                desc: '国际化格式化',
                code: "new Intl.DateTimeFormat('zh-CN').format(new Date())\nnew Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(1234.5)",
            },
            {
                name: 'structuredClone',
                desc: '深拷贝',
                code: 'const copy = structuredClone(value)',
            },
            {
                name: 'queueMicrotask',
                desc: '微任务队列',
                code: 'queueMicrotask(() => console.log("micro"))',
            },
            {
                name: 'AbortController',
                desc: '取消 fetch 等异步操作',
                code: "const ac = new AbortController()\nfetch(url, { signal: ac.signal })\nac.abort()",
            },
            {
                name: 'crypto.randomUUID',
                desc: '生成 UUID',
                code: 'crypto.randomUUID()',
            },
            {
                name: 'TextEncoder / TextDecoder',
                desc: '字符串与 UTF-8 字节',
                code: "new TextEncoder().encode('hi')\nnew TextDecoder().decode(buf)",
            },
        ],
    },
];

function esrefToGroups() {
    return ESREF_DATA;
}

let _esrefApi = null;

function esrefRender() {
    if (typeof RefEngine === 'undefined' || !RefEngine.mount) {
        return;
    }
    _esrefApi = RefEngine.mount({
        containerId: 'esrefContent',
        data: esrefToGroups(),
        searchId: 'esrefSearch',
    });
}

function esrefSearch() {
    if (_esrefApi) {
        _esrefApi.search();
    }
}

if (typeof registerInit === 'function') {
    registerInit('esref', esrefRender);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ESREF_DATA: ESREF_DATA,
        esrefToGroups: esrefToGroups,
    };
}
