const {
    mqttGenClientId,
    mqttValidateBrokerUrl,
    mqttBuildBrokerUrl,
    mqttParseBrokerUrl,
    mqttValidateTopic,
    mqttParseSubTopics,
    mqttFormatPayloadPreview,
    mqttLogLineText,
    mqttTopicMatchesFilter,
    mqttFilterLogs,
    mqttPrettyPayload,
    mqttColorForIndex,
    MQTT_TOPIC_COLORS,
    MQTT_PRESET_MAX,
    mqttNormalizePreset,
    mqttUpsertPreset,
    mqttRemovePreset,
    mqttSerializePresets,
    mqttParsePresets,
    mqttFormatDuration,
    mqttFormatBytes,
    mqttStatsText,
    mqttBuildExport,
    mqttEncodePublishPayload,
    mqttPubFormatPlaceholder,
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

describe('mqttBuildBrokerUrl / mqttParseBrokerUrl', () => {
    test('拼装 ws URL', () => {
        const r = mqttBuildBrokerUrl({
            scheme: 'ws:',
            host: '192.168.110.220',
            port: 8083,
            path: '/mqtt',
        });
        expect(r.ok).toBe(true);
        expect(r.url).toContain('ws://192.168.110.220:8083/mqtt');
    });

    test('默认 path 与 wss', () => {
        const r = mqttBuildBrokerUrl({ scheme: 'wss:', host: 'broker.example.com', port: 443 });
        expect(r.ok).toBe(true);
        // URL 规范会省略 wss 默认端口 443
        expect(r.url).toMatch(/^wss:\/\/broker\.example\.com(?::443)?\/?/);
    });

    test('缺主机失败', () => {
        expect(mqttBuildBrokerUrl({ scheme: 'ws:', host: '', port: 8083 }).ok).toBe(false);
    });

    test('解析完整 URL', () => {
        const p = mqttParseBrokerUrl('ws://192.168.1.1:8083/mqtt');
        expect(p.ok).toBe(true);
        expect(p.scheme).toBe('ws:');
        expect(p.host).toBe('192.168.1.1');
        expect(p.port).toBe(8083);
        expect(p.path).toBe('/mqtt');
    });

    test('往返一致', () => {
        const built = mqttBuildBrokerUrl({
            scheme: 'wss:',
            host: 'a.b.com',
            port: 443,
            path: '/ws',
        });
        const parsed = mqttParseBrokerUrl(built.url);
        expect(parsed.ok).toBe(true);
        expect(parsed.host).toBe('a.b.com');
        expect(parsed.path).toBe('/ws');
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

describe('mqttTopicMatchesFilter', () => {
    test('空/null 过滤匹配全部', () => {
        expect(mqttTopicMatchesFilter('a/b', null)).toBe(true);
        expect(mqttTopicMatchesFilter('a/b', '')).toBe(true);
        expect(mqttTopicMatchesFilter('a/b', '   ')).toBe(true);
        expect(mqttTopicMatchesFilter('', null)).toBe(true);
    });

    test('精确相等', () => {
        expect(mqttTopicMatchesFilter('sensor/temp', 'sensor/temp')).toBe(true);
        expect(mqttTopicMatchesFilter('sensor/temp', 'sensor/hum')).toBe(false);
    });

    test('+ 单层通配', () => {
        expect(mqttTopicMatchesFilter('sensor/temp', 'sensor/+')).toBe(true);
        expect(mqttTopicMatchesFilter('sensor/hum', 'sensor/+')).toBe(true);
        expect(mqttTopicMatchesFilter('sensor/a/b', 'sensor/+')).toBe(false);
        expect(mqttTopicMatchesFilter('other/temp', 'sensor/+')).toBe(false);
        expect(mqttTopicMatchesFilter('a/b/c', 'a/+/c')).toBe(true);
        expect(mqttTopicMatchesFilter('a/x/c', '+/+/c')).toBe(true);
    });

    test('# 多层通配', () => {
        expect(mqttTopicMatchesFilter('sensor/temp', 'sensor/#')).toBe(true);
        expect(mqttTopicMatchesFilter('sensor/a/b', 'sensor/#')).toBe(true);
        expect(mqttTopicMatchesFilter('sensor', 'sensor/#')).toBe(true);
        expect(mqttTopicMatchesFilter('other/temp', 'sensor/#')).toBe(false);
        expect(mqttTopicMatchesFilter('a/b/c', '#')).toBe(true);
    });

    test('$ 系统主题不被首层通配命中', () => {
        expect(mqttTopicMatchesFilter('$SYS/broker/uptime', '#')).toBe(false);
        expect(mqttTopicMatchesFilter('$SYS/broker/uptime', '+/broker/uptime')).toBe(false);
        expect(mqttTopicMatchesFilter('$SYS/broker/uptime', '$SYS/#')).toBe(true);
        expect(mqttTopicMatchesFilter('$SYS/broker/uptime', '$SYS/broker/uptime')).toBe(true);
    });
});

describe('mqttFilterLogs', () => {
    const logs = [
        { dir: 'system', message: '已连接', topic: '', payload: '' },
        { dir: 'in', topic: 'sensor/temp', payload: '{"v":1}', message: '' },
        { dir: 'out', topic: 'cmd/fan', payload: 'on', message: 'PUBLISH' },
        { dir: 'in', topic: 'sensor/hum', payload: '55', message: '' },
        { dir: 'out', topic: 'sensor/temp', payload: 'set', message: '' },
    ];

    test('不改原数组', () => {
        const copy = logs.slice();
        const out = mqttFilterLogs(logs, { topic: 'sensor/temp', dir: 'all' });
        expect(logs).toEqual(copy);
        expect(out).not.toBe(logs);
    });

    test('dir=all 且无 topic 时保留 system', () => {
        const out = mqttFilterLogs(logs, { topic: null, dir: 'all' });
        expect(out).toHaveLength(5);
        expect(out.some((e) => e.dir === 'system')).toBe(true);
    });

    test('选了具体 topic 时隐藏 SYS', () => {
        const out = mqttFilterLogs(logs, { topic: 'sensor/temp', dir: 'all' });
        expect(out.every((e) => e.dir !== 'system')).toBe(true);
        expect(out.map((e) => e.topic)).toEqual(['sensor/temp', 'sensor/temp']);
    });

    test('通配 topic 过滤', () => {
        const out = mqttFilterLogs(logs, { topic: 'sensor/+', dir: 'all' });
        expect(out.map((e) => e.topic)).toEqual(['sensor/temp', 'sensor/hum', 'sensor/temp']);
    });

    test('dir=in/out 去掉 system', () => {
        const inn = mqttFilterLogs(logs, { topic: null, dir: 'in' });
        expect(inn.every((e) => e.dir === 'in')).toBe(true);
        expect(inn).toHaveLength(2);
        const outt = mqttFilterLogs(logs, { topic: null, dir: 'out' });
        expect(outt.every((e) => e.dir === 'out')).toBe(true);
        expect(outt).toHaveLength(2);
    });

    test('keyword 大小写不敏感匹配 payload/topic/message', () => {
        expect(mqttFilterLogs(logs, { keyword: 'FAN' }).map((e) => e.topic)).toEqual(['cmd/fan']);
        expect(mqttFilterLogs(logs, { keyword: '已连' })[0].dir).toBe('system');
        expect(mqttFilterLogs(logs, { keyword: 'set' })).toHaveLength(1);
        expect(mqttFilterLogs(logs, { keyword: 'nope' })).toEqual([]);
    });
});

describe('mqttPrettyPayload', () => {
    test('合法 JSON 美化', () => {
        const r = mqttPrettyPayload('{"a":1,"b":[2]}');
        expect(r.json).toBe(true);
        expect(r.text).toBe(JSON.stringify({ a: 1, b: [2] }, null, 2));
    });

    test('非 JSON 返回原文', () => {
        expect(mqttPrettyPayload('hello')).toEqual({ json: false, text: 'hello' });
        expect(mqttPrettyPayload('{oops')).toEqual({ json: false, text: '{oops' });
    });

    test('空与空白', () => {
        expect(mqttPrettyPayload('')).toEqual({ json: false, text: '' });
        expect(mqttPrettyPayload('   ')).toEqual({ json: false, text: '   ' });
        expect(mqttPrettyPayload(null).json).toBe(false);
    });
});

describe('mqttColorForIndex', () => {
    test('循环取 8 色', () => {
        expect(MQTT_TOPIC_COLORS).toHaveLength(8);
        expect(mqttColorForIndex(0)).toBe('#34d399');
        expect(mqttColorForIndex(8)).toBe(mqttColorForIndex(0));
        expect(mqttColorForIndex(9)).toBe(mqttColorForIndex(1));
    });
});

describe('mqttNormalizePreset', () => {
    test('非法输入返回 null', () => {
        expect(mqttNormalizePreset(null)).toBeNull();
        expect(mqttNormalizePreset(undefined)).toBeNull();
        expect(mqttNormalizePreset('x')).toBeNull();
        expect(mqttNormalizePreset({})).toBeNull();
        expect(mqttNormalizePreset({ name: 'a' })).toBeNull();
        expect(mqttNormalizePreset({ url: '   ' })).toBeNull();
    });

    test('缺字段补默认', () => {
        const p = mqttNormalizePreset({ url: 'ws://localhost:8083/mqtt' });
        expect(p).not.toBeNull();
        expect(p.id).toBeTruthy();
        expect(p.name).toBe('localhost');
        expect(p.clientId).toBe('');
        expect(p.username).toBe('');
        expect(p.password).toBe('');
        expect(p.protocolVersion).toBe(5);
        expect(p.clean).toBe(true);
        expect(p.keepalive).toBe(60);
        expect(p.connectTimeoutSec).toBe(30);
        expect(p.will).toEqual({
            enabled: false,
            topic: '',
            payload: '',
            qos: 0,
            retain: false,
        });
    });

    test('保留合法字段并规范协议/QoS', () => {
        const p = mqttNormalizePreset({
            id: 'p1',
            name: '  线上  ',
            url: '  wss://broker.example.com/mqtt  ',
            clientId: 'c1',
            username: 'u',
            password: 'secret',
            protocolVersion: 5,
            clean: false,
            keepalive: 15,
            connectTimeoutSec: 10,
            will: { enabled: 1, topic: 'lwt', payload: 'down', qos: 2, retain: true },
        });
        expect(p.id).toBe('p1');
        expect(p.name).toBe('线上');
        expect(p.url).toBe('wss://broker.example.com/mqtt');
        expect(p.protocolVersion).toBe(5);
        expect(p.clean).toBe(false);
        expect(p.keepalive).toBe(15);
        expect(p.connectTimeoutSec).toBe(10);
        expect(p.will.qos).toBe(2);
        expect(p.will.enabled).toBe(true);
        expect(p.will.retain).toBe(true);
        expect(p.password).toBe('secret');
    });

    test('非法 protocolVersion / will.qos 回落默认', () => {
        const p = mqttNormalizePreset({
            url: 'ws://h/mqtt',
            protocolVersion: 3,
            will: { qos: 9 },
        });
        expect(p.protocolVersion).toBe(5);
        expect(p.will.qos).toBe(0);
    });
});

describe('mqttUpsertPreset / mqttRemovePreset', () => {
    const base = {
        id: 'a',
        name: 'A',
        url: 'ws://a/mqtt',
    };

    test('同 id 替换，否则头插', () => {
        const first = mqttNormalizePreset(base);
        let list = mqttUpsertPreset([], first);
        expect(list).toHaveLength(1);
        const updated = mqttNormalizePreset({ ...base, name: 'A2' });
        list = mqttUpsertPreset(list, updated);
        expect(list).toHaveLength(1);
        expect(list[0].name).toBe('A2');
        const second = mqttNormalizePreset({ id: 'b', name: 'B', url: 'ws://b/mqtt' });
        list = mqttUpsertPreset(list, second);
        expect(list.map((p) => p.id)).toEqual(['b', 'a']);
    });

    test('超过上限截断', () => {
        expect(MQTT_PRESET_MAX).toBe(5);
        let list = [];
        for (let i = 0; i < 6; i++) {
            list = mqttUpsertPreset(list, { id: 'id' + i, name: 'n' + i, url: 'ws://h' + i + '/mqtt' });
        }
        expect(list).toHaveLength(5);
        expect(list[0].id).toBe('id5');
        expect(list.some((p) => p.id === 'id0')).toBe(false);
    });

    test('非法 preset 不改列表', () => {
        const list = [mqttNormalizePreset(base)];
        const out = mqttUpsertPreset(list, { name: 'no-url' });
        expect(out).toEqual(list);
        expect(out).not.toBe(list);
    });

    test('按 id 删除', () => {
        const list = [
            mqttNormalizePreset({ id: 'a', url: 'ws://a/mqtt', name: 'A' }),
            mqttNormalizePreset({ id: 'b', url: 'ws://b/mqtt', name: 'B' }),
        ];
        expect(mqttRemovePreset(list, 'a').map((p) => p.id)).toEqual(['b']);
        expect(mqttRemovePreset(list, 'missing')).toHaveLength(2);
        expect(mqttRemovePreset(null, 'a')).toEqual([]);
    });
});

describe('mqttSerializePresets / mqttParsePresets', () => {
    test('往返一致', () => {
        const list = [
            mqttNormalizePreset({
                id: 'p1',
                name: '本机',
                url: 'ws://localhost:8083/mqtt',
                password: 'pw',
            }),
        ];
        const json = mqttSerializePresets(list);
        expect(JSON.parse(json)).toHaveLength(1);
        expect(mqttParsePresets(json)).toEqual(list);
    });

    test('容错：空、非法 JSON、非数组', () => {
        expect(mqttParsePresets('')).toEqual([]);
        expect(mqttParsePresets(null)).toEqual([]);
        expect(mqttParsePresets('{')).toEqual([]);
        expect(mqttParsePresets('{"a":1}')).toEqual([]);
        expect(mqttParsePresets('[{}]')).toEqual([]);
    });

    test('解析时跳过非法项并截断', () => {
        const arr = [];
        for (let i = 0; i < 7; i++) {
            arr.push({ id: 'id' + i, url: 'ws://h' + i + '/mqtt', name: 'n' + i });
        }
        arr.push({ name: 'bad' });
        const out = mqttParsePresets(JSON.stringify(arr));
        expect(out).toHaveLength(5);
        expect(out[0].id).toBe('id0');
    });
});

describe('mqttFormatDuration / mqttFormatBytes', () => {
    test('时长补零', () => {
        expect(mqttFormatDuration(0)).toBe('00:00:00');
        expect(mqttFormatDuration(5000)).toBe('00:00:05');
        expect(mqttFormatDuration(3723000)).toBe('01:02:03');
        expect(mqttFormatDuration(-1)).toBe('00:00:00');
        expect(mqttFormatDuration(NaN)).toBe('00:00:00');
    });

    test('字节本地实现', () => {
        expect(mqttFormatBytes(0)).toBe('0 B');
        expect(mqttFormatBytes(512)).toBe('512 B');
        expect(mqttFormatBytes(1024)).toBe('1.0 KB');
        expect(mqttFormatBytes(1536)).toBe('1.5 KB');
        expect(mqttFormatBytes(1024 * 1024)).toBe('1.00 MB');
        expect(mqttFormatBytes(-8)).toBe('0 B');
    });
});

describe('mqttStatsText', () => {
    test('生成展示字符串', () => {
        const text = mqttStatsText(
            { connectedAt: 0, recv: 48, sent: 12, recvBytes: 1000, sentBytes: 228 },
            201000
        );
        expect(text).toBe('↑12 ↓48 · 1.2 KB · 00:03:21');
    });

    test('未连接时时长为 0；stoppedAt 停表', () => {
        expect(mqttStatsText({ recv: 1, sent: 0, recvBytes: 10, sentBytes: 0 })).toBe(
            '↑0 ↓1 · 10 B · 00:00:00'
        );
        const text = mqttStatsText(
            { connectedAt: 1000, stoppedAt: 6000, recv: 0, sent: 1, recvBytes: 0, sentBytes: 3 },
            99999
        );
        expect(text).toBe('↑1 ↓0 · 3 B · 00:00:05');
    });
});

describe('mqttBuildExport', () => {
    test('组装导出对象', () => {
        const logs = [{ dir: 'in', topic: 't', payload: 'x' }];
        const out = mqttBuildExport(logs, {
            exportedAt: '2026-08-13T00:00:00.000Z',
            filter: { dir: 'in', keyword: 'x' },
            stats: { recv: 1, sent: 0 },
        });
        expect(out).toEqual({
            exportedAt: '2026-08-13T00:00:00.000Z',
            filter: { dir: 'in', keyword: 'x' },
            stats: { recv: 1, sent: 0 },
            messages: logs,
        });
        expect(out.messages).toBe(logs);
    });

    test('缺省与非数组 logs', () => {
        const out = mqttBuildExport(null, {});
        expect(out.messages).toEqual([]);
        expect(out.filter).toEqual({});
        expect(out.stats).toEqual({});
        expect(typeof out.exportedAt).toBe('string');
    });
});

describe('mqttEncodePublishPayload', () => {
    test('text 原样', () => {
        const r = mqttEncodePublishPayload('hello', 'text');
        expect(r.ok).toBe(true);
        expect(r.data).toBe('hello');
        expect(r.logText).toBe('hello');
    });

    test('json 校验并压缩', () => {
        const r = mqttEncodePublishPayload('{"a": 1}', 'json');
        expect(r.ok).toBe(true);
        expect(r.data).toBe('{"a":1}');
        expect(mqttEncodePublishPayload('{bad', 'json').ok).toBe(false);
        expect(mqttEncodePublishPayload('', 'json').ok).toBe(false);
    });

    test('hex 解码', () => {
        const r = mqttEncodePublishPayload('48656c6c6f', 'hex');
        expect(r.ok).toBe(true);
        expect(Array.from(r.data)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        expect(r.logText).toContain('[hex]');
        expect(mqttEncodePublishPayload('xyz', 'hex').ok).toBe(false);
        expect(mqttEncodePublishPayload('abc', 'hex').ok).toBe(false);
    });

    test('base64 解码', () => {
        const r = mqttEncodePublishPayload('SGVsbG8=', 'base64');
        expect(r.ok).toBe(true);
        expect(Array.from(r.data)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        expect(mqttEncodePublishPayload('!!!', 'base64').ok).toBe(false);
    });

    test('placeholder', () => {
        expect(mqttPubFormatPlaceholder('json')).toContain('{');
        expect(mqttPubFormatPlaceholder('hex')).toMatch(/hex|0x/i);
        expect(mqttPubFormatPlaceholder('text')).toContain('Payload');
    });
});
