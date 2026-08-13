const {
    mqttGenClientId,
    mqttValidateBrokerUrl,
    mqttValidateTopic,
    mqttParseSubTopics,
    mqttFormatPayloadPreview,
    mqttLogLineText,
} = require('../../js/debug/mqtt.js');

describe('mqttGenClientId', () => {
    test('以 codedeck- 开头且非空', () => {
        const id = mqttGenClientId();
        expect(id.startsWith('codedeck-')).toBe(true);
        expect(id.length).toBeGreaterThan('codedeck-'.length);
    });

    test('连续生成不完全相同', () => {
        const a = mqttGenClientId();
        const b = mqttGenClientId();
        expect(a).not.toBe(b);
    });
});

describe('mqttValidateBrokerUrl', () => {
    test('接受 ws / wss', () => {
        expect(mqttValidateBrokerUrl('ws://localhost:8083/mqtt').ok).toBe(true);
        expect(mqttValidateBrokerUrl('wss://broker.example.com/mqtt').ok).toBe(true);
        expect(mqttValidateBrokerUrl('  ws://127.0.0.1:9001  ').normalized).toContain('ws://');
    });

    test('拒绝空、mqtt、tcp 与非法协议', () => {
        expect(mqttValidateBrokerUrl('').ok).toBe(false);
        expect(mqttValidateBrokerUrl(null).ok).toBe(false);
        expect(mqttValidateBrokerUrl('mqtt://localhost:1883').ok).toBe(false);
        expect(mqttValidateBrokerUrl('tcp://localhost:1883').ok).toBe(false);
        expect(mqttValidateBrokerUrl('http://localhost/mqtt').ok).toBe(false);
        expect(mqttValidateBrokerUrl('not-a-url').ok).toBe(false);
    });
});

describe('mqttValidateTopic', () => {
    test('发布主题不能含通配符', () => {
        expect(mqttValidateTopic('sensor/temp', false).ok).toBe(true);
        expect(mqttValidateTopic('sensor/+/temp', false).ok).toBe(false);
        expect(mqttValidateTopic('sensor/#', false).ok).toBe(false);
        expect(mqttValidateTopic('', false).ok).toBe(false);
    });

    test('订阅允许合法通配符', () => {
        expect(mqttValidateTopic('sensor/+/temp', true).ok).toBe(true);
        expect(mqttValidateTopic('sensor/#', true).ok).toBe(true);
        expect(mqttValidateTopic('#', true).ok).toBe(true);
        expect(mqttValidateTopic('a/b/+', true).ok).toBe(true);
    });

    test('订阅拒绝非法通配符用法', () => {
        expect(mqttValidateTopic('sensor/foo+', true).ok).toBe(false);
        expect(mqttValidateTopic('sensor/#/x', true).ok).toBe(false);
        expect(mqttValidateTopic('a#', true).ok).toBe(false);
    });
});

describe('mqttParseSubTopics', () => {
    test('换行 / 逗号 / 分号拆分并去重', () => {
        const r = mqttParseSubTopics('a/b\nc/d, e/f; a/b');
        expect(r.ok).toBe(true);
        expect(r.topics).toEqual(['a/b', 'c/d', 'e/f']);
    });

    test('支持通配符批量', () => {
        const r = mqttParseSubTopics('sensor/+/temp\ndevice/#');
        expect(r.ok).toBe(true);
        expect(r.topics).toEqual(['sensor/+/temp', 'device/#']);
    });

    test('全无效时报错', () => {
        const r = mqttParseSubTopics('foo+\na#');
        expect(r.ok).toBe(false);
        expect(r.topics).toEqual([]);
    });

    test('部分无效时返回有效项', () => {
        const r = mqttParseSubTopics('ok/topic\nbad+\n#');
        expect(r.ok).toBe(true);
        expect(r.topics).toEqual(['ok/topic', '#']);
        expect(r.skippedInvalid).toBe(1);
    });

    test('空输入', () => {
        expect(mqttParseSubTopics('').ok).toBe(false);
        expect(mqttParseSubTopics('  \n  ').ok).toBe(false);
    });
});

describe('mqttFormatPayloadPreview', () => {
    test('短文本原样返回', () => {
        expect(mqttFormatPayloadPreview('hello', 200)).toBe('hello');
    });

    test('超长截断并标注长度', () => {
        const long = 'x'.repeat(50);
        const out = mqttFormatPayloadPreview(long, 10);
        expect(out.startsWith('xxxxxxxxxx')).toBe(true);
        expect(out).toContain('50');
        expect(out.length).toBeLessThan(long.length + 20);
    });

    test('null/undefined 安全', () => {
        expect(mqttFormatPayloadPreview(null, 10)).toBe('');
        expect(mqttFormatPayloadPreview(undefined, 10)).toBe('');
    });
});

describe('mqttLogLineText', () => {
    test('格式化收发日志行', () => {
        const line = mqttLogLineText({
            dir: 'in',
            time: '12:00:00',
            topic: 't/1',
            qos: 1,
            retain: true,
            payload: 'hi',
        });
        expect(line).toContain('IN');
        expect(line).toContain('topic=t/1');
        expect(line).toContain('qos=1');
        expect(line).toContain('retain');
        expect(line).toContain('hi');
    });

    test('系统日志用 message', () => {
        const line = mqttLogLineText({
            dir: 'system',
            time: '12:00:01',
            message: '已连接',
        });
        expect(line).toContain('SYS');
        expect(line).toContain('已连接');
    });
});
