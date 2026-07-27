const { parseChmod, formatChmod, chmodToRwx } = require('../../js/generate/chmodcalc.js');

describe('parseChmod 八进制', () => {
    test('644', () => {
        const r = parseChmod('644');
        expect(r.ok).toBe(true);
        expect(r.octal).toBe('644');
        expect(r.rwx).toBe('rw-r--r--');
        expect(r.parts).toEqual({ u: 6, g: 4, o: 4 });
    });

    test('755', () => {
        const r = parseChmod('755');
        expect(r.ok).toBe(true);
        expect(r.rwx).toBe('rwxr-xr-x');
    });

    test('777', () => {
        const r = parseChmod(777);
        expect(r.ok).toBe(true);
        expect(r.rwx).toBe('rwxrwxrwx');
    });

    test('600', () => {
        const r = parseChmod('600');
        expect(r.rwx).toBe('rw-------');
    });

    test('4755 setuid', () => {
        const r = parseChmod('4755');
        expect(r.ok).toBe(true);
        expect(r.special.setuid).toBe(true);
        expect(r.rwx).toBe('rwsr-xr-x');
    });

    test('0755 前导 0', () => {
        const r = parseChmod('0755');
        expect(r.ok).toBe(true);
        expect(r.rwx).toBe('rwxr-xr-x');
    });
});

describe('parseChmod rwx', () => {
    test('rwxr-xr-x', () => {
        const r = parseChmod('rwxr-xr-x');
        expect(r.ok).toBe(true);
        expect(r.octal).toBe('755');
    });

    test('ls -l 形式 -rw-r--r--', () => {
        const r = parseChmod('-rw-r--r--');
        expect(r.ok).toBe(true);
        expect(r.octal).toBe('644');
    });
});

describe('chmodToRwx', () => {
    test('数字 mode', () => {
        expect(chmodToRwx(0o644)).toBe('rw-r--r--');
        expect(chmodToRwx(0o755)).toBe('rwxr-xr-x');
    });
    test('字符串八进制', () => {
        expect(chmodToRwx('644')).toBe('rw-r--r--');
    });
});

describe('formatChmod', () => {
    test('摘要含命令', () => {
        const r = formatChmod('755');
        expect(r.ok).toBe(true);
        expect(r.ls).toBe('-rwxr-xr-x');
        expect(r.commands[0]).toContain('chmod 755');
        expect(r.desc).toContain('所有者');
    });
});

describe('符号操作 u+x g-w', () => {
    test('从 000 应用 u+x g-w', () => {
        const r = parseChmod('u+x g-w');
        expect(r.ok).toBe(true);
        // u+x → 100, g-w 从 000 无效果 → 100 → 100 八进制
        expect(r.parts.u & 1).toBe(1);
        expect(r.rwx[2]).toBe('x');
    });

    test('u=rwx,g=rx,o=r', () => {
        const r = parseChmod('u=rwx,g=rx,o=r');
        expect(r.ok).toBe(true);
        expect(r.octal).toBe('754');
        expect(r.rwx).toBe('rwxr-xr--');
    });
});

describe('无效输入', () => {
    test('空', () => {
        expect(parseChmod('').ok).toBe(false);
    });
    test('非法', () => {
        expect(parseChmod('999').ok).toBe(false);
    });
});
