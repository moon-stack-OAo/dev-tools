// CSS 属性速查 — 数据 + RefEngine 挂载

const CSSREF_DATA = [
    {
        cat: '布局 (display / flex / grid)',
        items: [
            {
                name: 'display',
                desc: '元素盒模型与布局模式',
                syntax: 'display: block | inline | flex | grid | none | ...',
                code: 'display: flex;',
                examples: ['display: none;', 'display: inline-block;', 'display: grid;'],
            },
            {
                name: 'flex',
                desc: 'flex 子项伸缩简写（grow shrink basis）',
                syntax: 'flex: <grow> <shrink> <basis>',
                code: 'flex: 1 1 auto;',
                examples: ['flex: 1;', 'flex: 0 0 200px;', 'flex: none;'],
            },
            {
                name: 'flex-direction',
                desc: '主轴方向',
                syntax: 'flex-direction: row | row-reverse | column | column-reverse',
                code: 'flex-direction: column;',
            },
            {
                name: 'justify-content',
                desc: '主轴对齐',
                syntax: 'justify-content: flex-start | center | space-between | space-around | ...',
                code: 'justify-content: space-between;',
            },
            {
                name: 'align-items',
                desc: '交叉轴对齐',
                syntax: 'align-items: stretch | flex-start | center | baseline | ...',
                code: 'align-items: center;',
            },
            {
                name: 'gap',
                desc: 'flex/grid 子项间距',
                syntax: 'gap: <row-gap> <column-gap>',
                code: 'gap: 12px 16px;',
                examples: ['gap: 1rem;', 'row-gap: 8px;', 'column-gap: 16px;'],
            },
            {
                name: 'grid-template-columns',
                desc: '定义网格列轨道',
                syntax: 'grid-template-columns: <track-list>',
                code: 'grid-template-columns: repeat(3, 1fr);',
                examples: ['grid-template-columns: 200px 1fr;', 'grid-template-columns: auto 1fr auto;'],
            },
            {
                name: 'grid-template-areas',
                desc: '命名网格区域',
                code: "grid-template-areas:\n  'header header'\n  'nav main'\n  'footer footer';",
            },
            {
                name: 'place-items',
                desc: 'align-items + justify-items 简写',
                code: 'place-items: center;',
            },
            {
                name: 'order',
                desc: 'flex/grid 子项视觉顺序',
                code: 'order: -1;',
            },
        ],
    },
    {
        cat: '盒模型',
        items: [
            {
                name: 'box-sizing',
                desc: '宽高是否包含 padding/border',
                syntax: 'box-sizing: content-box | border-box',
                code: 'box-sizing: border-box;',
            },
            {
                name: 'width / height',
                desc: '内容区宽高（受 box-sizing 影响）',
                code: 'width: 100%;\nmax-width: 1200px;\nheight: auto;',
            },
            {
                name: 'margin',
                desc: '外边距；auto 可水平居中块级元素',
                syntax: 'margin: <top> <right> <bottom> <left>',
                code: 'margin: 0 auto;',
                examples: ['margin: 8px 16px;', 'margin-inline: auto;', 'margin-block: 1rem;'],
            },
            {
                name: 'padding',
                desc: '内边距',
                code: 'padding: 12px 16px;',
                examples: ['padding-inline: 1rem;', 'padding-block: 8px;'],
            },
            {
                name: 'border',
                desc: '边框简写',
                syntax: 'border: <width> <style> <color>',
                code: 'border: 1px solid #e0e0e0;',
            },
            {
                name: 'border-radius',
                desc: '圆角',
                code: 'border-radius: 8px;',
                examples: ['border-radius: 50%;', 'border-radius: 4px 8px;'],
            },
            {
                name: 'overflow',
                desc: '溢出处理',
                syntax: 'overflow: visible | hidden | scroll | auto',
                code: 'overflow: auto;',
                examples: ['overflow-x: hidden;', 'overflow-y: scroll;', 'text-overflow: ellipsis;'],
            },
            {
                name: 'aspect-ratio',
                desc: '宽高比',
                code: 'aspect-ratio: 16 / 9;',
            },
            {
                name: 'object-fit',
                desc: '替换元素（img/video）适配',
                syntax: 'object-fit: fill | contain | cover | none | scale-down',
                code: 'object-fit: cover;',
            },
        ],
    },
    {
        cat: '字体与文本',
        items: [
            {
                name: 'font',
                desc: '字体简写',
                syntax: 'font: [style] [weight] size[/line-height] family',
                code: "font: 400 14px/1.5 'Segoe UI', system-ui, sans-serif;",
            },
            {
                name: 'font-size',
                desc: '字号',
                code: 'font-size: 1rem;',
                examples: ['font-size: 14px;', 'font-size: clamp(14px, 2vw, 18px);'],
            },
            {
                name: 'font-weight',
                desc: '字重',
                code: 'font-weight: 600;',
                examples: ['font-weight: normal;', 'font-weight: bold;'],
            },
            {
                name: 'line-height',
                desc: '行高',
                code: 'line-height: 1.5;',
            },
            {
                name: 'text-align',
                desc: '水平对齐',
                code: 'text-align: center;',
            },
            {
                name: 'white-space',
                desc: '空白与换行',
                syntax: 'white-space: normal | nowrap | pre | pre-wrap | pre-line',
                code: 'white-space: nowrap;',
            },
            {
                name: 'text-overflow',
                desc: '溢出省略（需配合 overflow/white-space）',
                code: 'overflow: hidden;\nwhite-space: nowrap;\ntext-overflow: ellipsis;',
            },
            {
                name: 'word-break / overflow-wrap',
                desc: '长词换行策略',
                code: 'word-break: break-word;\noverflow-wrap: anywhere;',
            },
            {
                name: 'letter-spacing / word-spacing',
                desc: '字距 / 词距',
                code: 'letter-spacing: 0.02em;',
            },
            {
                name: 'text-decoration',
                desc: '装饰线',
                code: 'text-decoration: underline;',
                examples: ['text-decoration: none;', 'text-underline-offset: 4px;'],
            },
        ],
    },
    {
        cat: '颜色与背景',
        items: [
            {
                name: 'color',
                desc: '前景色（文字）',
                code: 'color: #333;\ncolor: rgb(51 51 51 / 0.9);',
            },
            {
                name: 'background',
                desc: '背景简写',
                code: 'background: #fff url(bg.png) center / cover no-repeat;',
            },
            {
                name: 'background-color',
                desc: '背景色',
                code: 'background-color: var(--bg);',
            },
            {
                name: 'background-image',
                desc: '背景图 / 渐变',
                code: 'background-image: linear-gradient(135deg, #667eea, #764ba2);',
                examples: ['background-image: url(a.png), url(b.png);'],
            },
            {
                name: 'opacity',
                desc: '整体透明度（含子元素）',
                code: 'opacity: 0.6;',
            },
            {
                name: 'box-shadow',
                desc: '盒阴影',
                code: 'box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);',
                examples: ['box-shadow: none;', 'box-shadow: inset 0 0 0 1px #ddd;'],
            },
            {
                name: 'filter',
                desc: '滤镜',
                code: 'filter: blur(4px) brightness(1.1);',
                examples: ['filter: grayscale(1);', 'backdrop-filter: blur(8px);'],
            },
            {
                name: 'mix-blend-mode',
                desc: '混合模式',
                code: 'mix-blend-mode: multiply;',
            },
        ],
    },
    {
        cat: '定位与层叠',
        items: [
            {
                name: 'position',
                desc: '定位方式',
                syntax: 'position: static | relative | absolute | fixed | sticky',
                code: 'position: relative;',
            },
            {
                name: 'top / right / bottom / left',
                desc: '定位偏移',
                code: 'top: 0;\nright: 0;',
            },
            {
                name: 'inset',
                desc: '四向偏移简写',
                code: 'inset: 0;\ninset: 8px 16px;',
            },
            {
                name: 'z-index',
                desc: '层叠顺序（需定位或 flex/grid 子项）',
                code: 'z-index: 10;',
            },
            {
                name: 'float / clear',
                desc: '浮动与清除（传统布局）',
                code: 'float: left;\nclear: both;',
            },
            {
                name: 'isolation',
                desc: '创建层叠上下文',
                code: 'isolation: isolate;',
            },
            {
                name: 'pointer-events',
                desc: '是否响应指针事件',
                code: 'pointer-events: none;',
            },
            {
                name: 'user-select',
                desc: '文本是否可选中',
                code: 'user-select: none;',
            },
        ],
    },
    {
        cat: '动画与过渡',
        items: [
            {
                name: 'transition',
                desc: '属性过渡',
                syntax: 'transition: <property> <duration> <timing> <delay>',
                code: 'transition: all 0.2s ease;',
                examples: ['transition: color 150ms ease-out;', 'transition: transform 0.3s;'],
            },
            {
                name: 'animation',
                desc: '关键帧动画简写',
                code: 'animation: fadeIn 0.3s ease both;',
            },
            {
                name: '@keyframes',
                desc: '定义关键帧',
                code: '@keyframes fadeIn {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}',
            },
            {
                name: 'transform',
                desc: '2D/3D 变换',
                code: 'transform: translate(-50%, -50%) scale(1.05);',
                examples: ['transform: rotate(45deg);', 'transform: none;'],
            },
            {
                name: 'transform-origin',
                desc: '变换原点',
                code: 'transform-origin: center top;',
            },
            {
                name: 'will-change',
                desc: '提示浏览器优化（慎用）',
                code: 'will-change: transform;',
            },
            {
                name: 'animation-fill-mode',
                desc: '动画前后样式保留',
                code: 'animation-fill-mode: both;',
            },
        ],
    },
    {
        cat: '其他常用',
        items: [
            {
                name: 'var() / 自定义属性',
                desc: 'CSS 变量',
                code: ':root { --primary: #3b82f6; }\ncolor: var(--primary, #000);',
            },
            {
                name: 'calc()',
                desc: '计算表达式',
                code: 'width: calc(100% - 2rem);',
            },
            {
                name: 'clamp()',
                desc: '最小 / 首选 / 最大',
                code: 'font-size: clamp(14px, 2vw, 18px);',
            },
            {
                name: 'media query',
                desc: '响应式条件',
                code: '@media (max-width: 768px) {\n  .nav { display: none; }\n}',
            },
            {
                name: 'container query',
                desc: '容器查询',
                code: '.card { container-type: inline-size; }\n@container (min-width: 400px) {\n  .title { font-size: 1.25rem; }\n}',
            },
            {
                name: 'cursor',
                desc: '鼠标指针样式',
                code: 'cursor: pointer;',
                examples: ['cursor: not-allowed;', 'cursor: grab;'],
            },
            {
                name: 'visibility',
                desc: '可见性（仍占位）',
                code: 'visibility: hidden;',
            },
            {
                name: 'content-visibility',
                desc: '离屏渲染优化',
                code: 'content-visibility: auto;',
            },
            {
                name: 'scroll-behavior',
                desc: '滚动平滑',
                code: 'scroll-behavior: smooth;',
            },
            {
                name: 'scrollbar-gutter',
                desc: '预留滚动条槽避免布局抖动',
                code: 'scrollbar-gutter: stable;',
            },
        ],
    },
];

function cssrefToGroups() {
    return CSSREF_DATA;
}

let _cssrefApi = null;

function cssrefRender() {
    if (typeof RefEngine === 'undefined' || !RefEngine.mount) {
        return;
    }
    _cssrefApi = RefEngine.mount({
        containerId: 'cssrefContent',
        data: cssrefToGroups(),
        searchId: 'cssrefSearch',
    });
}

function cssrefSearch() {
    if (_cssrefApi) {
        _cssrefApi.search();
    }
}

if (typeof registerInit === 'function') {
    registerInit('cssref', cssrefRender);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CSSREF_DATA: CSSREF_DATA,
        cssrefToGroups: cssrefToGroups,
    };
}
