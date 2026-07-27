const {
    parseTraceparent,
    buildTraceparent,
    parseB3,
    buildB3,
    generateTraceId,
    generateSpanId,
} = require('../../js/debug/traceheader.js');

describe('generateTraceId / generateSpanId', () => {
    test('长度与 hex', () => {
        const t = generateTraceId();
        const s = generateSpanId();
        expect(t).toMatch(/^[0-9a-f]{32}$/);
        expect(s).toMatch(/^[0-9a-f]{16}$/);
        expect(/^0+$/.test(t)).toBe(false);
        expect(/^0+$/.test(s)).toBe(false);
    });
});

describe('buildTraceparent / parseTraceparent', () => {
    test('往返', () => {
        const tp = buildTraceparent({
            traceId: '0af7651916cd43dd8448eb211c80319c',
            spanId: 'b7ad6b7169203331',
            sampled: true,
        });
        expect(tp).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
        const p = parseTraceparent(tp);
        expect(p.valid).toBe(true);
        expect(p.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
        expect(p.spanId).toBe('b7ad6b7169203331');
        expect(p.sampled).toBe(true);
        expect(p.version).toBe('00');
    });

    test('不采样', () => {
        const tp = buildTraceparent({
            traceId: '0af7651916cd43dd8448eb211c80319c',
            spanId: 'b7ad6b7169203331',
            sampled: false,
        });
        expect(tp.endsWith('-00')).toBe(true);
        expect(parseTraceparent(tp).sampled).toBe(false);
    });

    test('自动生成 id', () => {
        const tp = buildTraceparent({ sampled: true });
        expect(parseTraceparent(tp).valid).toBe(true);
    });

    test('非法输入', () => {
        expect(parseTraceparent('').valid).toBe(false);
        expect(parseTraceparent('00-0-0-01').valid).toBe(false);
        expect(parseTraceparent('00-' + '0'.repeat(32) + '-b7ad6b7169203331-01').valid).toBe(false);
        expect(() =>
            buildTraceparent({
                traceId: '0'.repeat(32),
                spanId: 'b7ad6b7169203331',
            }),
        ).toThrow();
    });
});

describe('buildB3 / parseB3', () => {
    test('单头往返', () => {
        const b = buildB3({
            traceId: '80f198ee56343ba864fe8b2a57d3eff7',
            spanId: 'e457b5a2e4d86bd1',
            sampled: true,
        });
        expect(b.single).toBe('80f198ee56343ba864fe8b2a57d3eff7-e457b5a2e4d86bd1-1');
        const p = parseB3(b.single);
        expect(p.valid).toBe(true);
        expect(p.format).toBe('single');
        expect(p.traceId).toBe('80f198ee56343ba864fe8b2a57d3eff7');
        expect(p.spanId).toBe('e457b5a2e4d86bd1');
        expect(p.sampled).toBe(true);
    });

    test('多头解析', () => {
        const p = parseB3({
            'X-B3-TraceId': '80f198ee56343ba864fe8b2a57d3eff7',
            'X-B3-SpanId': 'e457b5a2e4d86bd1',
            'X-B3-Sampled': '1',
        });
        expect(p.valid).toBe(true);
        expect(p.format).toBe('multi');
        expect(p.sampled).toBe(true);
    });

    test('多行文本多头', () => {
        const text = [
            'X-B3-TraceId: 80f198ee56343ba864fe8b2a57d3eff7',
            'X-B3-SpanId: e457b5a2e4d86bd1',
            'X-B3-Sampled: 0',
        ].join('\n');
        const p = parseB3(text);
        expect(p.valid).toBe(true);
        expect(p.sampled).toBe(false);
    });

    test('带 parent', () => {
        const b = buildB3({
            traceId: '80f198ee56343ba864fe8b2a57d3eff7',
            spanId: 'e457b5a2e4d86bd1',
            parentSpanId: '05e3ac9a4f6e3b90',
            sampled: true,
        });
        expect(b.single).toContain('05e3ac9a4f6e3b90');
        expect(b.multi['X-B3-ParentSpanId']).toBe('05e3ac9a4f6e3b90');
        const p = parseB3(b.single);
        expect(p.parentSpanId).toBe('05e3ac9a4f6e3b90');
    });

    test('非法', () => {
        expect(parseB3('').valid).toBe(false);
        expect(parseB3('abc').valid).toBe(false);
    });
});
