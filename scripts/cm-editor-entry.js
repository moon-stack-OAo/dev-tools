/**
 * CodeMirror 6 浏览器 IIFE 入口
 * 打包后全局名：CMEditor（window.CMEditor.create）
 */
import { EditorView, keymap, lineNumbers, drawSelection } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import {
    indentOnInput,
    indentUnit,
    bracketMatching,
    syntaxHighlighting,
    defaultHighlightStyle,
} from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap,
    completeFromList,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

/** JS/TS 常用关键字与片段兜底 */
const JS_COMPLETIONS = completeFromList([
    { label: 'function', type: 'keyword', apply: 'function name() {\n  \n}' },
    { label: 'const', type: 'keyword' },
    { label: 'let', type: 'keyword' },
    { label: 'var', type: 'keyword' },
    { label: 'if', type: 'keyword', apply: 'if () {\n  \n}' },
    { label: 'else', type: 'keyword' },
    { label: 'for', type: 'keyword', apply: 'for (let i = 0; i < n; i++) {\n  \n}' },
    { label: 'while', type: 'keyword', apply: 'while () {\n  \n}' },
    { label: 'return', type: 'keyword' },
    { label: 'async', type: 'keyword' },
    { label: 'await', type: 'keyword' },
    { label: 'try', type: 'keyword', apply: 'try {\n  \n} catch (e) {\n  \n}' },
    { label: 'catch', type: 'keyword' },
    { label: 'class', type: 'keyword', apply: 'class Name {\n  constructor() {\n    \n  }\n}' },
    { label: 'import', type: 'keyword' },
    { label: 'export', type: 'keyword' },
    { label: 'console.log', type: 'function', apply: 'console.log()' },
    { label: 'console.error', type: 'function', apply: 'console.error()' },
    { label: 'JSON.stringify', type: 'function', apply: 'JSON.stringify()' },
    { label: 'JSON.parse', type: 'function', apply: 'JSON.parse()' },
    { label: 'Promise', type: 'class' },
    { label: 'Array', type: 'class' },
    { label: 'Object', type: 'class' },
    { label: 'Map', type: 'class' },
    { label: 'Set', type: 'class' },
    { label: 'interface', type: 'keyword' },
    { label: 'type', type: 'keyword' },
    { label: 'enum', type: 'keyword' },
    { label: 'implements', type: 'keyword' },
    { label: 'extends', type: 'keyword' },
    { label: 'readonly', type: 'keyword' },
    { label: 'public', type: 'keyword' },
    { label: 'private', type: 'keyword' },
    { label: 'protected', type: 'keyword' },
]);

/** Python 常用关键字与片段兜底 */
const PY_COMPLETIONS = completeFromList([
    { label: 'def', type: 'keyword', apply: 'def name():\n    ' },
    { label: 'class', type: 'keyword', apply: 'class Name:\n    def __init__(self):\n        ' },
    { label: 'if', type: 'keyword', apply: 'if :\n    ' },
    { label: 'elif', type: 'keyword' },
    { label: 'else', type: 'keyword', apply: 'else:\n    ' },
    { label: 'for', type: 'keyword', apply: 'for i in range():\n    ' },
    { label: 'while', type: 'keyword', apply: 'while :\n    ' },
    { label: 'try', type: 'keyword', apply: 'try:\n    \nexcept Exception as e:\n    ' },
    { label: 'except', type: 'keyword' },
    { label: 'finally', type: 'keyword' },
    { label: 'with', type: 'keyword', apply: 'with  as :\n    ' },
    { label: 'import', type: 'keyword' },
    { label: 'from', type: 'keyword' },
    { label: 'return', type: 'keyword' },
    { label: 'yield', type: 'keyword' },
    { label: 'async', type: 'keyword' },
    { label: 'await', type: 'keyword' },
    { label: 'lambda', type: 'keyword' },
    { label: 'print', type: 'function', apply: 'print()' },
    { label: 'len', type: 'function', apply: 'len()' },
    { label: 'range', type: 'function', apply: 'range()' },
    { label: 'enumerate', type: 'function', apply: 'enumerate()' },
    { label: 'list', type: 'class' },
    { label: 'dict', type: 'class' },
    { label: 'set', type: 'class' },
    { label: 'str', type: 'class' },
    { label: 'int', type: 'class' },
    { label: 'True', type: 'constant' },
    { label: 'False', type: 'constant' },
    { label: 'None', type: 'constant' },
    { label: 'self', type: 'variable' },
    { label: 'pass', type: 'keyword' },
    { label: 'raise', type: 'keyword' },
    { label: 'assert', type: 'keyword' },
]);

/**
 * @param {string} lang
 * @returns {{ langExt: import('@codemirror/state').Extension, completions: import('@codemirror/autocomplete').CompletionSource }}
 */
function resolveLanguage(lang) {
    const key = String(lang || 'javascript').toLowerCase();
    if (key === 'python' || key === 'py') {
        return { langExt: python(), completions: PY_COMPLETIONS };
    }
    if (key === 'typescript' || key === 'ts') {
        return { langExt: javascript({ typescript: true }), completions: JS_COMPLETIONS };
    }
    return { langExt: javascript({ typescript: false, jsx: false }), completions: JS_COMPLETIONS };
}

/** 与站点终端风格接近的编辑器主题 */
const siteTheme = EditorView.theme(
    {
        '&': {
            height: '100%',
            fontSize: '13px',
            backgroundColor: 'transparent',
        },
        '&.cm-editor': {
            height: '100%',
            backgroundColor: 'transparent',
        },
        '&.cm-editor.cm-focused': {
            outline: 'none',
        },
        '.cm-scroller': {
            fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            lineHeight: '1.6',
            fontSize: '13px',
            backgroundColor: 'transparent',
        },
        '.cm-content': {
            padding: '12px 0',
            caretColor: '#e2e8f0',
            minHeight: '100%',
        },
        '.cm-gutters': {
            backgroundColor: 'transparent',
            border: 'none',
            color: '#64748b',
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
        },
        '.cm-activeLine': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
        },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'rgba(99, 102, 241, 0.35) !important',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: '#e2e8f0',
        },
        '.cm-tooltip': {
            backgroundColor: '#1a2236',
            border: '1px solid #2d3a52',
            color: '#e2e8f0',
        },
        '.cm-tooltip-autocomplete ul li[aria-selected]': {
            backgroundColor: 'rgba(99, 102, 241, 0.35)',
        },
    },
    { dark: true }
);

/**
 * 在 parent 上创建 CodeMirror 编辑器
 * @param {HTMLElement} parent
 * @param {object} [opts]
 * @param {string} [opts.doc]
 * @param {'javascript'|'typescript'|'python'} [opts.language='javascript']
 * @param {number} [opts.tabSize=2]
 * @param {boolean} [opts.readOnly=false]
 * @param {(value: string) => void} [opts.onChange]
 * @param {() => void} [opts.onFormat] Ctrl/Cmd+S 触发（拦截浏览器保存）
 * @returns {{
 *   getValue: () => string,
 *   setValue: (v: string) => void,
 *   setLanguage: (lang: string) => void,
 *   setReadOnly: (ro: boolean) => void,
 *   focus: () => void,
 *   destroy: () => void,
 *   getView: () => import('@codemirror/view').EditorView
 * }}
 */
function create(parent, opts) {
    if (!parent || !(parent instanceof HTMLElement)) {
        throw new Error('CMEditor.create: parent 必须是 HTMLElement');
    }
    opts = opts || {};

    // 兼容 parent 内已有 textarea：opts.doc 优先，否则读 textarea.value
    const textarea = parent.querySelector('textarea');
    let initialDoc = opts.doc;
    if (initialDoc == null) {
        initialDoc = textarea ? textarea.value : '';
    }
    if (typeof initialDoc !== 'string') {
        initialDoc = String(initialDoc == null ? '' : initialDoc);
    }

    if (textarea) {
        textarea.hidden = true;
        textarea.setAttribute('aria-hidden', 'true');
        textarea.style.display = 'none';
        textarea.tabIndex = -1;
    }

    const host = document.createElement('div');
    host.className = 'cm-host';
    host.style.cssText = 'height:100%;width:100%;min-height:0;display:flex;flex-direction:column;';
    parent.appendChild(host);

    const langCompartment = new Compartment();
    const completionCompartment = new Compartment();
    const readOnlyCompartment = new Compartment();
    const editableCompartment = new Compartment();
    const indentCompartment = new Compartment();

    const language = opts.language || 'javascript';
    const tabSize = typeof opts.tabSize === 'number' && opts.tabSize > 0 ? opts.tabSize : 2;
    const readOnly = !!opts.readOnly;
    const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    const onFormat = typeof opts.onFormat === 'function' ? opts.onFormat : null;

    const { langExt, completions } = resolveLanguage(language);
    const indentStr = ' '.repeat(tabSize);

    function syncTextarea(value) {
        if (textarea) {
            textarea.value = value;
        }
    }

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            const value = update.state.doc.toString();
            syncTextarea(value);
            if (onChange) {
                try {
                    onChange(value);
                } catch (_) {
                    /* 忽略业务回调异常，避免打断编辑器 */
                }
            }
        }
    });

    /** 拦截 Ctrl/Cmd+S：阻止浏览器保存，改为格式化 */
    const formatKeymap = keymap.of([
        {
            key: 'Mod-s',
            preventDefault: true,
            run() {
                if (onFormat) {
                    try {
                        onFormat();
                    } catch (_) {
                        /* 忽略格式化回调异常 */
                    }
                }
                return true;
            },
        },
    ]);

    const state = EditorState.create({
        doc: initialDoc,
        extensions: [
            lineNumbers(),
            drawSelection(),
            history(),
            indentOnInput(),
            bracketMatching(),
            closeBrackets(),
            autocompletion({ activateOnTyping: true }),
            oneDark,
            siteTheme,
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            formatKeymap,
            keymap.of([
                indentWithTab,
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...historyKeymap,
                ...completionKeymap,
            ]),
            indentCompartment.of(indentUnit.of(indentStr)),
            langCompartment.of(langExt),
            // completeFromList 返回 CompletionSource，经 languageData 注入
            completionCompartment.of(
                EditorState.languageData.of(() => [{ autocomplete: completions }])
            ),
            readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
            editableCompartment.of(EditorView.editable.of(!readOnly)),
            updateListener,
            EditorView.contentAttributes.of({ 'aria-label': 'code editor' }),
        ],
    });

    const view = new EditorView({
        state,
        parent: host,
    });

    syncTextarea(view.state.doc.toString());

    return {
        getValue() {
            return view.state.doc.toString();
        },
        setValue(v) {
            const text = v == null ? '' : String(v);
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: text },
            });
            syncTextarea(text);
        },
        setLanguage(lang) {
            const resolved = resolveLanguage(lang);
            view.dispatch({
                effects: [
                    langCompartment.reconfigure(resolved.langExt),
                    completionCompartment.reconfigure(
                        EditorState.languageData.of(() => [
                            { autocomplete: resolved.completions },
                        ])
                    ),
                ],
            });
        },
        setReadOnly(ro) {
            const flag = !!ro;
            view.dispatch({
                effects: [
                    readOnlyCompartment.reconfigure(EditorState.readOnly.of(flag)),
                    editableCompartment.reconfigure(EditorView.editable.of(!flag)),
                ],
            });
        },
        focus() {
            view.focus();
        },
        destroy() {
            view.destroy();
            if (host.parentNode) {
                host.parentNode.removeChild(host);
            }
            if (textarea) {
                textarea.hidden = false;
                textarea.removeAttribute('aria-hidden');
                textarea.style.display = '';
                textarea.tabIndex = 0;
            }
        },
        getView() {
            return view;
        },
    };
}

export { create };
