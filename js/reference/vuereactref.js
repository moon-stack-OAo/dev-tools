// Vue / React 速查 — 数据 + RefEngine 挂载

const VUEREACTREF_DATA = [
    {
        cat: 'Vue 组合式 API',
        items: [
            {
                name: 'ref',
                desc: '创建响应式基本类型 / 对象引用',
                code: "import { ref } from 'vue'\nconst count = ref(0)\ncount.value++",
            },
            {
                name: 'reactive',
                desc: '创建响应式对象（勿整体替换）',
                code: "import { reactive } from 'vue'\nconst state = reactive({ name: 'Tom', age: 18 })\nstate.age++",
            },
            {
                name: 'computed',
                desc: '计算属性（可写需 get/set）',
                code: "const double = computed(() => count.value * 2)\nconst full = computed({\n  get: () => first.value + last.value,\n  set: (v) => { /* ... */ }\n})",
            },
            {
                name: 'watch',
                desc: '侦听数据源变化',
                code: "watch(count, (n, o) => {\n  console.log(n, o)\n}, { immediate: true, deep: true })",
            },
            {
                name: 'watchEffect',
                desc: '自动收集依赖并立即执行',
                code: "watchEffect(() => {\n  console.log(count.value)\n})",
            },
            {
                name: 'onMounted / onUnmounted',
                desc: '生命周期钩子',
                code: "onMounted(() => { /* DOM 就绪 */ })\nonUnmounted(() => { /* 清理定时器/监听 */ })",
            },
            {
                name: 'provide / inject',
                desc: '跨层级依赖注入',
                code: "// 祖先\nprovide('theme', theme)\n// 后代\nconst theme = inject('theme', defaultTheme)",
            },
            {
                name: 'toRef / toRefs',
                desc: '解构 reactive 时保持响应性',
                code: "const { name, age } = toRefs(state)\nconst nameRef = toRef(state, 'name')",
            },
            {
                name: 'defineProps / defineEmits',
                desc: 'script setup 声明 props / 事件',
                code: "const props = defineProps({ modelValue: String })\nconst emit = defineEmits(['update:modelValue'])\nemit('update:modelValue', val)",
            },
            {
                name: 'defineExpose',
                desc: '向父组件暴露实例成员',
                code: "const formRef = ref()\ndefineExpose({ validate: () => formRef.value?.validate() })",
            },
            {
                name: 'nextTick',
                desc: 'DOM 更新后执行',
                code: "await nextTick()\n// 此时 DOM 已根据最新状态更新",
            },
        ],
    },
    {
        cat: 'Vue 内置组件',
        items: [
            {
                name: 'Teleport',
                desc: '将子树传送到 DOM 其他位置',
                code: '<Teleport to="body">\n  <div class="modal">...</div>\n</Teleport>',
            },
            {
                name: 'Suspense',
                desc: '异步依赖的加载占位',
                code: '<Suspense>\n  <template #default><AsyncComp /></template>\n  <template #fallback>Loading...</template>\n</Suspense>',
            },
            {
                name: 'KeepAlive',
                desc: '缓存动态组件状态',
                code: '<KeepAlive :include="[\'TabA\', \'TabB\']" :max="10">\n  <component :is="view" />\n</KeepAlive>',
            },
            {
                name: 'Transition',
                desc: '单元素/组件过渡',
                code: '<Transition name="fade">\n  <div v-if="show">Hello</div>\n</Transition>',
            },
            {
                name: 'TransitionGroup',
                desc: '列表过渡（需 key）',
                code: '<TransitionGroup name="list" tag="ul">\n  <li v-for="item in list" :key="item.id">{{ item.name }}</li>\n</TransitionGroup>',
            },
            {
                name: 'v-model',
                desc: '双向绑定（组件默认 modelValue）',
                code: '<Child v-model="text" />\n<!-- 等价 -->\n<Child :modelValue="text" @update:modelValue="text = $event" />',
            },
            {
                name: 'v-for + key',
                desc: '列表渲染，key 保证复用正确',
                code: '<li v-for="item in list" :key="item.id">{{ item.name }}</li>',
            },
            {
                name: 'v-if / v-show',
                desc: '条件渲染：销毁 vs 显隐',
                code: '<div v-if="ok">A</div>\n<div v-else>B</div>\n<div v-show="visible">C</div>',
            },
            {
                name: 'slot / v-slot',
                desc: '内容分发与作用域插槽',
                code: '<template #header>\n  <h1>Title</h1>\n</template>\n<template #default="{ row }">\n  {{ row.name }}\n</template>',
            },
        ],
    },
    {
        cat: 'React Hooks',
        items: [
            {
                name: 'useState',
                desc: '组件状态',
                code: "const [count, setCount] = useState(0)\nsetCount(c => c + 1)",
            },
            {
                name: 'useEffect',
                desc: '副作用 / 订阅 / 清理',
                code: "useEffect(() => {\n  const id = setInterval(tick, 1000)\n  return () => clearInterval(id)\n}, [deps])",
            },
            {
                name: 'useMemo',
                desc: '缓存计算结果',
                code: "const sorted = useMemo(\n  () => items.slice().sort(cmp),\n  [items]\n)",
            },
            {
                name: 'useCallback',
                desc: '缓存函数引用',
                code: "const onSave = useCallback(() => {\n  save(id)\n}, [id])",
            },
            {
                name: 'useRef',
                desc: '可变引用 / DOM 句柄（改 .current 不触发渲染）',
                code: "const inputRef = useRef(null)\nuseEffect(() => { inputRef.current?.focus() }, [])\n<input ref={inputRef} />",
            },
            {
                name: 'useContext',
                desc: '读取 Context',
                code: "const ThemeContext = createContext('light')\nconst theme = useContext(ThemeContext)",
            },
            {
                name: 'useReducer',
                desc: '复杂状态逻辑',
                code: "const [state, dispatch] = useReducer(reducer, initial)\ndispatch({ type: 'inc' })",
            },
            {
                name: 'useLayoutEffect',
                desc: 'DOM 变更后同步执行（测量布局）',
                code: "useLayoutEffect(() => {\n  const { height } = ref.current.getBoundingClientRect()\n  setH(height)\n}, [])",
            },
            {
                name: 'useId',
                desc: '稳定唯一 ID（可访问性 / SSR）',
                code: "const id = useId()\n<label htmlFor={id}>Name</label>\n<input id={id} />",
            },
            {
                name: 'useImperativeHandle',
                desc: '自定义暴露给父的 ref API',
                code: "useImperativeHandle(ref, () => ({\n  focus: () => inputRef.current.focus()\n}), [])",
            },
            {
                name: 'custom hook',
                desc: '抽取可复用逻辑（use 前缀）',
                code: "function useToggle(init = false) {\n  const [on, setOn] = useState(init)\n  return [on, () => setOn(v => !v)]\n}",
            },
        ],
    },
    {
        cat: 'React 常用模式',
        items: [
            {
                name: '条件渲染',
                desc: '&& / 三元 / 提前 return',
                code: "{ok && <A />}\n{ok ? <A /> : <B />}",
            },
            {
                name: '列表 key',
                desc: '稳定唯一 key，避免用 index（可排序场景）',
                code: "{list.map(item => (\n  <Item key={item.id} data={item} />\n))}",
            },
            {
                name: '受控组件',
                desc: 'value + onChange 由 state 驱动',
                code: "<input value={text} onChange={e => setText(e.target.value)} />",
            },
            {
                name: 'children / composition',
                desc: '组合优于继承',
                code: "function Card({ children, title }) {\n  return (\n    <div className=\"card\">\n      <h3>{title}</h3>\n      {children}\n    </div>\n  )\n}",
            },
            {
                name: 'React.memo',
                desc: '浅比较 props 跳过重渲染',
                code: "const Item = memo(function Item({ data }) {\n  return <div>{data.name}</div>\n})",
            },
            {
                name: 'lazy + Suspense',
                desc: '路由/组件懒加载',
                code: "const Page = lazy(() => import('./Page'))\n<Suspense fallback={<Spinner />}>\n  <Page />\n</Suspense>",
            },
            {
                name: 'Error Boundary',
                desc: '捕获子树渲染错误（class 组件）',
                code: "class ErrorBoundary extends React.Component {\n  state = { error: null }\n  static getDerivedStateFromError(error) {\n    return { error }\n  }\n  render() {\n    if (this.state.error) return <Fallback />\n    return this.props.children\n  }\n}",
            },
            {
                name: 'forwardRef',
                desc: '向函数组件转发 ref',
                code: "const Input = forwardRef(function Input(props, ref) {\n  return <input ref={ref} {...props} />\n})",
            },
            {
                name: 'Portal',
                desc: '渲染到 body 等外部节点',
                code: "createPortal(<Modal />, document.body)",
            },
        ],
    },
];

function vuereactrefToGroups() {
    return VUEREACTREF_DATA;
}

let _vuereactrefApi = null;

function vuereactrefRender() {
    if (typeof RefEngine === 'undefined' || !RefEngine.mount) {
        return;
    }
    _vuereactrefApi = RefEngine.mount({
        containerId: 'vuereactrefContent',
        data: vuereactrefToGroups(),
        searchId: 'vuereactrefSearch',
    });
}

function vuereactrefSearch() {
    if (_vuereactrefApi) {
        _vuereactrefApi.search();
    }
}

if (typeof registerInit === 'function') {
    registerInit('vuereactref', vuereactrefRender);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VUEREACTREF_DATA: VUEREACTREF_DATA,
        vuereactrefToGroups: vuereactrefToGroups,
    };
}
