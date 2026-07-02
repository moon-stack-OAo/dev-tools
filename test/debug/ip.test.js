const { ipClassify, ipSubnetCalc, ipIsPrivate, ipIsLoopback, numToIp } = require('../../js/debug/ip.js');

describe('ipClassify - 类别判定 (A/B/C/D/E)', () => {
    test('A 类: 1-126', () => {
        expect(ipClassify('10.0.0.1').class).toBe('A');
        expect(ipClassify('126.255.255.255').class).toBe('A');
    });
    test('B 类: 128-191', () => {
        expect(ipClassify('128.0.0.1').class).toBe('B');
        expect(ipClassify('172.20.0.1').class).toBe('B');
        expect(ipClassify('191.255.255.255').class).toBe('B');
    });
    test('C 类: 192-223', () => {
        expect(ipClassify('192.168.1.1').class).toBe('C');
        expect(ipClassify('223.255.255.255').class).toBe('C');
    });
    test('D 类 (多播): 224-239', () => {
        expect(ipClassify('224.0.0.1').class).toBe('D (多播)');
        expect(ipClassify('239.255.255.255').class).toBe('D (多播)');
    });
    test('E 类 (保留): 240-255', () => {
        expect(ipClassify('240.0.0.1').class).toBe('E (保留)');
        expect(ipClassify('255.255.255.255').class).toBe('E (保留)');
    });
});

describe('ipClassify - 私有地址判定', () => {
    test('10.0.0.0/8 全部为私网', () => {
        expect(ipClassify('10.0.0.1').isPrivate).toBe(true);
        expect(ipClassify('10.255.255.255').isPrivate).toBe(true);
    });
    test('172.16.0.0/12 范围内为私网 (172.16-172.31)', () => {
        expect(ipClassify('172.15.0.1').isPrivate).toBe(false);
        expect(ipClassify('172.16.0.1').isPrivate).toBe(true);
        expect(ipClassify('172.20.5.5').isPrivate).toBe(true);
        expect(ipClassify('172.31.255.255').isPrivate).toBe(true);
        expect(ipClassify('172.32.0.1').isPrivate).toBe(false);
    });
    test('192.168.0.0/16 全部为私网', () => {
        expect(ipClassify('192.168.0.1').isPrivate).toBe(true);
        expect(ipClassify('192.168.255.255').isPrivate).toBe(true);
        expect(ipClassify('192.169.0.1').isPrivate).toBe(false);
    });
    test('公网 IP 不标记 private', () => {
        expect(ipClassify('8.8.8.8').isPrivate).toBe(false);
        expect(ipClassify('1.1.1.1').isPrivate).toBe(false);
    });
});

describe('ipClassify - 回环地址判定', () => {
    test('127.0.0.0/8 都是回环', () => {
        expect(ipClassify('127.0.0.1').isLoopback).toBe(true);
        expect(ipClassify('127.255.255.254').isLoopback).toBe(true);
        expect(ipClassify('128.0.0.1').isLoopback).toBe(false);
    });
});

describe('ipClassify - 边界与错误', () => {
    test('无效 IP (段数错)', () => {
        expect(ipClassify('1.2.3').ok).toBe(false);
        expect(ipClassify('1.2.3.4.5').ok).toBe(false);
    });
    test('无效 IP (越界值)', () => {
        expect(ipClassify('256.0.0.1').ok).toBe(false);
        expect(ipClassify('-1.0.0.1').ok).toBe(false);
        expect(ipClassify('1.2.3.x').ok).toBe(false);
    });
    test('正常 IP 返回 hex/bin 表示', () => {
        const r = ipClassify('192.168.1.1');
        expect(r.hex).toBe('C0A80101');
        expect(r.bin).toBe('11000000.10101000.00000001.00000001');
    });
});

describe('ipSubnetCalc - 子网计算', () => {
    test('/24 标准情形', () => {
        const r = ipSubnetCalc('10.0.0.50', 24);
        expect(r.ok).toBe(true);
        expect(r.network).toBe('10.0.0.0');
        expect(r.broadcast).toBe('10.0.0.255');
        expect(r.firstUsable).toBe('10.0.0.1');
        expect(r.lastUsable).toBe('10.0.0.254');
        expect(r.mask).toBe('255.255.255.0');
        expect(r.cidr).toBe('/24');
        expect(r.total).toBe(256);
        expect(r.usable).toBe(254);
    });
    test('/30 点对点链路 (仅 2 可用主机)', () => {
        const r = ipSubnetCalc('192.168.1.0', 30);
        expect(r.network).toBe('192.168.1.0');
        expect(r.broadcast).toBe('192.168.1.3');
        expect(r.firstUsable).toBe('192.168.1.1');
        expect(r.lastUsable).toBe('192.168.1.2');
        expect(r.usable).toBe(2);
    });
    test('/31 掩码无可用主机 (RFC 3021 点对点)', () => {
        const r = ipSubnetCalc('10.0.0.0', 31);
        expect(r.firstUsable).toBe('10.0.0.0');
        expect(r.lastUsable).toBe('10.0.0.1');
    });
    test('/32 主机路由 (单地址)', () => {
        const r = ipSubnetCalc('8.8.8.8', 32);
        expect(r.network).toBe('8.8.8.8');
        expect(r.broadcast).toBe('8.8.8.8');
        expect(r.firstUsable).toBe('8.8.8.8');
        expect(r.lastUsable).toBe('8.8.8.8');
        expect(r.usable).toBe(0);
    });
    test('/0 默认路由 (整个 IPv4)', () => {
        const r = ipSubnetCalc('1.2.3.4', 0);
        expect(r.network).toBe('0.0.0.0');
        expect(r.broadcast).toBe('255.255.255.255');
        expect(r.usable).toBe(4294967294);
    });
});

describe('ipSubnetCalc - 错误处理', () => {
    test('掩码越界', () => {
        expect(ipSubnetCalc('10.0.0.1', 33).ok).toBe(false);
        expect(ipSubnetCalc('10.0.0.1', -1).ok).toBe(false);
    });
    test('IP 无效', () => {
        expect(ipSubnetCalc('999.0.0.1', 24).ok).toBe(false);
        expect(ipSubnetCalc('1.2.3', 24).ok).toBe(false);
    });
});

describe('ipIsPrivate / ipIsLoopback 快捷判断', () => {
    test('isPrivate', () => {
        expect(ipIsPrivate('10.0.0.1')).toBe(true);
        expect(ipIsPrivate('172.16.5.5')).toBe(true);
        expect(ipIsPrivate('192.168.1.1')).toBe(true);
        expect(ipIsPrivate('8.8.8.8')).toBe(false);
    });
    test('isLoopback', () => {
        expect(ipIsLoopback('127.0.0.1')).toBe(true);
        expect(ipIsLoopback('127.5.5.5')).toBe(true);
        expect(ipIsLoopback('128.0.0.1')).toBe(false);
    });
    test('无效 IP 视为 false 而非抛错', () => {
        expect(ipIsPrivate('not.an.ip')).toBe(false);
        expect(ipIsLoopback('999.0.0.1')).toBe(false);
    });
});

describe('numToIp - number ↔ IP 互转', () => {
    test('0 → 0.0.0.0', () => {
        expect(numToIp(0)).toBe('0.0.0.0');
    });
    test('0xFFFFFFFF → 255.255.255.255 (无符号)', () => {
        expect(numToIp(0xffffffff)).toBe('255.255.255.255');
    });
    test('0xC0A80101 ↔ 192.168.1.1', () => {
        expect(numToIp(0xc0a80101)).toBe('192.168.1.1');
    });
    test('可与 parseInt 复合实现互逆', () => {
        const original = '172.16.5.99';
        const n = original.split('.').reduce((acc, p) => (acc << 8) + parseInt(p), 0) >>> 0;
        expect(numToIp(n)).toBe(original);
    });
});
