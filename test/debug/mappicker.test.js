const {
    mpParseCoordInput,
    mpFormatLatLng,
    mpFormatJson,
    mpClampLat,
    mpClampLng,
    mpIsValidLatLng,
    mpNormalizeTileTemplate,
    mpFormatAccuracy,
    mpZoomForAccuracy,
} = require('../../js/debug/mappicker.js');

describe('mpParseCoordInput', () => {
    test('空输入失败', () => {
        expect(mpParseCoordInput('').ok).toBe(false);
        expect(mpParseCoordInput(null).ok).toBe(false);
        expect(mpParseCoordInput('   ').ok).toBe(false);
    });

    test('lat,lng 优先', () => {
        const r = mpParseCoordInput('39.9042,116.4074');
        expect(r.ok).toBe(true);
        expect(r.lat).toBeCloseTo(39.9042);
        expect(r.lng).toBeCloseTo(116.4074);
        expect(r.order).toBe('latlng');
    });

    test('中文逗号与空格', () => {
        const r = mpParseCoordInput(' 31.23， 121.47 ');
        expect(r.ok).toBe(true);
        expect(r.lat).toBeCloseTo(31.23);
        expect(r.lng).toBeCloseTo(121.47);
        expect(r.order).toBe('latlng');
    });

    test('a 超 90 时按 lng,lat', () => {
        const r = mpParseCoordInput('116.4074,39.9042');
        expect(r.ok).toBe(true);
        expect(r.lat).toBeCloseTo(39.9042);
        expect(r.lng).toBeCloseTo(116.4074);
        expect(r.order).toBe('lnglat');
    });

    test('两者均在 lat/lng 合法范围优先 latlng', () => {
        const r = mpParseCoordInput('45,90');
        expect(r.ok).toBe(true);
        expect(r.lat).toBe(45);
        expect(r.lng).toBe(90);
        expect(r.order).toBe('latlng');
    });

    test('非数字失败', () => {
        expect(mpParseCoordInput('abc,def').ok).toBe(false);
        expect(mpParseCoordInput('1').ok).toBe(false);
    });

    test('a 在 90–180 且 b 为 lat 时按 lng,lat', () => {
        const r = mpParseCoordInput('91,10');
        expect(r.ok).toBe(true);
        expect(r.lat).toBe(10);
        expect(r.lng).toBe(91);
        expect(r.order).toBe('lnglat');
    });

    test('越界失败', () => {
        expect(mpParseCoordInput('10,181').ok).toBe(false);
        expect(mpParseCoordInput('200,100').ok).toBe(false);
        expect(mpParseCoordInput('91,100').ok).toBe(false);
    });
});

describe('mpFormatLatLng / mpFormatJson', () => {
    test('默认 latlng 6 位', () => {
        expect(mpFormatLatLng(39.9042, 116.4074, 6, 'latlng')).toBe('39.904200,116.407400');
    });

    test('lnglat 顺序', () => {
        expect(mpFormatLatLng(39.9, 116.4, 1, 'lnglat')).toBe('116.4,39.9');
    });

    test('JSON', () => {
        expect(mpFormatJson(39.9042, 116.4074, 4)).toBe('{"lat":39.9042,"lng":116.4074}');
    });
});

describe('mpClampLat / mpClampLng / mpIsValidLatLng', () => {
    test('clamp lat', () => {
        expect(mpClampLat(100)).toBe(90);
        expect(mpClampLat(-100)).toBe(-90);
        expect(mpClampLat(35.5)).toBe(35.5);
    });

    test('clamp lng', () => {
        expect(mpClampLng(200)).toBe(180);
        expect(mpClampLng(-200)).toBe(-180);
        expect(mpClampLng(116.4)).toBe(116.4);
    });

    test('isValid', () => {
        expect(mpIsValidLatLng(0, 0)).toBe(true);
        expect(mpIsValidLatLng(90, 180)).toBe(true);
        expect(mpIsValidLatLng(-90, -180)).toBe(true);
        expect(mpIsValidLatLng(91, 0)).toBe(false);
        expect(mpIsValidLatLng(0, 181)).toBe(false);
        expect(mpIsValidLatLng(NaN, 0)).toBe(false);
        expect(mpIsValidLatLng('x', 0)).toBe(false);
    });
});

describe('mpNormalizeTileTemplate', () => {
    test('高德 {1-4} 转为 {s} + subdomains', () => {
        const url =
            'http://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}';
        const r = mpNormalizeTileTemplate(url);
        expect(r.ok).toBe(true);
        expect(r.url).toBe(
            'http://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}'
        );
        expect(r.options.subdomains).toEqual(['1', '2', '3', '4']);
        expect(r.url).not.toContain('{1-4}');
    });

    test('字母区间 {a-d}', () => {
        const r = mpNormalizeTileTemplate('https://{a-d}.example.com/{z}/{x}/{y}.png');
        expect(r.ok).toBe(true);
        expect(r.url).toBe('https://{s}.example.com/{z}/{x}/{y}.png');
        expect(r.options.subdomains).toEqual(['a', 'b', 'c', 'd']);
    });

    test('已有 {s} 默认 a/b/c', () => {
        const r = mpNormalizeTileTemplate('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
        expect(r.ok).toBe(true);
        expect(r.options.subdomains).toEqual(['a', 'b', 'c']);
    });

    test('缺 z/x/y 失败', () => {
        expect(mpNormalizeTileTemplate('http://x.com/{z}/{x}').ok).toBe(false);
        expect(mpNormalizeTileTemplate('').ok).toBe(false);
    });
});

describe('mpFormatAccuracy / mpZoomForAccuracy', () => {
    test('格式化精度', () => {
        expect(mpFormatAccuracy(null)).toBe('—');
        expect(mpFormatAccuracy(12.3)).toBe('±12 m');
        expect(mpFormatAccuracy(1500)).toBe('±1.5 km');
    });

    test('精度对应缩放', () => {
        expect(mpZoomForAccuracy(10)).toBe(18);
        expect(mpZoomForAccuracy(80)).toBe(16);
        expect(mpZoomForAccuracy(2000)).toBe(13);
    });
});
