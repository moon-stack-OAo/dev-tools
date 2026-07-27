// 工具收藏（localStorage）纯逻辑，可被 app.js 与单元测试共用
const FAVORITES_KEY = 'devtools.favorites';

function getFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((x) => typeof x === 'string');
    } catch (e) {
        return [];
    }
}

function isFavorite(id) {
    return getFavorites().indexOf(id) !== -1;
}

function toggleFavorite(id) {
    const list = getFavorites();
    const idx = list.indexOf(id);
    if (idx === -1) {
        list.push(id);
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
        } catch (e) {
        }
        return true;
    }
    list.splice(idx, 1);
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    } catch (e) {
    }
    return false;
}

function clearFavorites() {
    try {
        localStorage.removeItem(FAVORITES_KEY);
    } catch (e) {
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getFavorites,
        isFavorite,
        toggleFavorite,
        clearFavorites,
        FAVORITES_KEY,
    };
}
