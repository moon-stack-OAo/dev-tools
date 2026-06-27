import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

// 第三方库在浏览器注入的全局变量
const libGlobals = {
    jsyaml: 'readonly',
    Diff: 'readonly',
    md5: 'readonly',
    sqlFormatter: 'readonly',
    dcodeIO: 'readonly',
    sm2: 'readonly',
    sm3: 'readonly',
    sm4: 'readonly',
    JSONPath: 'readonly',
    Ajv: 'readonly',
    FXP: 'readonly',
    UAParser: 'readonly',
    marked: 'readonly',
    Beautify: 'readonly',
    QRCode: 'readonly',
    jsQR: 'readonly',
    JSZip: 'readonly',
    ASN1: 'readonly',
    PKI: 'readonly',
};

// app.js 在浏览器环境暴露的项目级全局函数/变量
const appGlobals = {
    registerInit: 'readonly',
    openTool: 'readonly',
    loadToolScript: 'readonly',
    loadToolPanel: 'readonly',
    loadLib: 'readonly',
    assetV: 'readonly',
    toolInits: 'writable',
};

export default [
    {
        ignores: ['public/lib/**', 'dist/**', 'node_modules/**'],
    },
    {
        // 浏览器工具脚本（无模块系统，依赖全局）
        files: ['js/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...libGlobals,
                ...appGlobals,
            },
        },
        rules: {
            // 浏览器全局脚本，自定义全局函数较多，关闭未定义检查避免误报
            'no-undef': 'off',
            'no-unused-vars': 'warn',
            // 工具函数常按需声明，允许在块内声明函数
            'no-inner-declarations': 'off',
            'no-console': 'off',
        },
    },
    {
        // Node 环境：构建脚本、Vite/Vitest 配置、测试文件
        files: ['scripts/**/*.js', 'vite.config.js', 'vitest.config.js', 'test/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
        },
    },
    prettierConfig,
];
