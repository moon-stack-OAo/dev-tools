const {
    mpParseCoordInput,
    mpFormatLatLng,
    mpFormatJson,
    mpClampLat,
    mpClampLng,
    mpIsValidLatLng,
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
