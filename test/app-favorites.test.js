// localStorage 内存 mock:Node 环境无 localStorage,这里提供一个最小实现。
// 每个测试用例通过 beforeEach 清空,确保状态隔离。
const _store = {};
global.localStorage = {
    getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null;
    },
    setItem: function (k, v) {
        _store[k] = String(v);
    },
    removeItem: function (k) {
        delete _store[k];
    },
    clear: function () {
        for (const k in _store) delete _store[k];
    },
};

const { getFavorites, isFavorite, toggleFavorite, clearFavorites } = require('../../js/app.js');

describe('Favorites 工具收藏 (localStorage)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('getFavorites', () => {
        test('空存储返回空数组', () => {
            expect(getFavorites()).toEqual([]);
        });

        test('有数据时正确反序列化', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify(['json', 'jwt']));
            expect(getFavorites()).toEqual(['json', 'jwt']);
        });

        test('非法 JSON 容错返回空数组', () => {
            localStorage.setItem('devtools.favorites', '{not valid json');
            expect(getFavorites()).toEqual([]);
        });

        test('非数组值(对象)容错返回空数组', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify({ a: 1 }));
            expect(getFavorites()).toEqual([]);
        });

        test('非数组值(字符串)容错返回空数组', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify('hello'));
            expect(getFavorites()).toEqual([]);
        });

        test('数组中含非字符串项时过滤掉', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify(['json', 123, null, 'jwt', true]));
            expect(getFavorites()).toEqual(['json', 'jwt']);
        });

        test('不污染其他 key 的数据', () => {
            localStorage.setItem('devtools.theme', 'light');
            localStorage.setItem('devtools.favorites', JSON.stringify(['hash']));
            expect(getFavorites()).toEqual(['hash']);
        });
    });

    describe('isFavorite', () => {
        test('未收藏的工具返回 false', () => {
            expect(isFavorite('json')).toBe(false);
        });

        test('已收藏的工具返回 true', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify(['json']));
            expect(isFavorite('json')).toBe(true);
        });

        test('区分大小写:工具 id 严格匹配', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify(['json']));
            expect(isFavorite('JSON')).toBe(false);
            expect(isFavorite('Json')).toBe(false);
        });
    });

    describe('toggleFavorite', () => {
        test('未收藏时调用后变为已收藏,返回 true', () => {
            const result = toggleFavorite('json');
            expect(result).toBe(true);
            expect(isFavorite('json')).toBe(true);
            expect(JSON.parse(localStorage.getItem('devtools.favorites'))).toEqual(['json']);
        });

        test('已收藏时调用后变为未收藏,返回 false', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify(['json']));
            const result = toggleFavorite('json');
            expect(result).toBe(false);
            expect(isFavorite('json')).toBe(false);
            expect(JSON.parse(localStorage.getItem('devtools.favorites'))).toEqual([]);
        });

        test('多次切换状态正确', () => {
            expect(toggleFavorite('json')).toBe(true);
            expect(toggleFavorite('json')).toBe(false);
            expect(toggleFavorite('json')).toBe(true);
            expect(toggleFavorite('json')).toBe(false);
            expect(isFavorite('json')).toBe(false);
        });

        test('切换不同 id 互不影响', () => {
            toggleFavorite('json');
            toggleFavorite('jwt');
            expect(isFavorite('json')).toBe(true);
            expect(isFavorite('jwt')).toBe(true);
            const arr = JSON.parse(localStorage.getItem('devtools.favorites'));
            expect(arr).toContain('json');
            expect(arr).toContain('jwt');
            expect(arr.length).toBe(2);
        });

        test('取消其中一个不影响其他', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify(['json', 'jwt', 'hash']));
            toggleFavorite('jwt');
            const arr = JSON.parse(localStorage.getItem('devtools.favorites'));
            expect(arr).toEqual(['json', 'hash']);
            expect(isFavorite('jwt')).toBe(false);
        });

        test('返回新状态:true 表示已收藏,false 表示已取消', () => {
            expect(toggleFavorite('hash')).toBe(true);
            expect(toggleFavorite('hash')).toBe(false);
        });

        test('持久化到 localStorage 后跨调用保持', () => {
            toggleFavorite('json');
            expect(isFavorite('json')).toBe(true);
            // 模拟新一次会话(重新读取)
            expect(getFavorites()).toEqual(['json']);
        });
    });

    describe('clearFavorites', () => {
        test('清空后所有工具变为未收藏', () => {
            localStorage.setItem('devtools.favorites', JSON.stringify(['json', 'jwt']));
            clearFavorites();
            expect(isFavorite('json')).toBe(false);
            expect(isFavorite('jwt')).toBe(false);
            expect(localStorage.getItem('devtools.favorites')).toBe(null);
        });

        test('空状态下调用不报错', () => {
            expect(() => clearFavorites()).not.toThrow();
        });
    });

    describe('综合场景:典型用户操作流', () => {
        test('添加 → 切换显示 → 移除', () => {
            // 1. 用户打开 JSON 工具并点击星标
            toggleFavorite('json');
            expect(isFavorite('json')).toBe(true);

            // 2. 用户打开 JWT 工具并点击星标
            toggleFavorite('jwt');
            expect(getFavorites()).toEqual(['json', 'jwt']);

            // 3. 用户改变主意,取消收藏 JSON
            toggleFavorite('json');
            expect(getFavorites()).toEqual(['jwt']);

            // 4. 关闭浏览器再打开(localStorage 保持)
            const persisted = getFavorites();
            expect(persisted).toEqual(['jwt']);
            expect(isFavorite('jwt')).toBe(true);
        });
    });
});
