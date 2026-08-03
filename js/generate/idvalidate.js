// 中国身份证 / 手机号 / 银行卡本地校验

// ISO 7064 MOD 11-2 权重与校验码表
var IDV_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
var IDV_CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

// 省级行政区（前 2 位）粗略
var IDV_PROVINCES = {
    11: '北京',
    12: '天津',
    13: '河北',
    14: '山西',
    15: '内蒙古',
    21: '辽宁',
    22: '吉林',
    23: '黑龙江',
    31: '上海',
    32: '江苏',
    33: '浙江',
    34: '安徽',
    35: '福建',
    36: '江西',
    37: '山东',
    41: '河南',
    42: '湖北',
    43: '湖南',
    44: '广东',
    45: '广西',
    46: '海南',
    50: '重庆',
    51: '四川',
    52: '贵州',
    53: '云南',
    54: '西藏',
    61: '陕西',
    62: '甘肃',
    63: '青海',
    64: '宁夏',
    65: '新疆',
    71: '台湾',
    81: '香港',
    82: '澳门',
};

/**
 * 计算 18 位身份证校验位
 * @param {string} body17 前 17 位数字
 * @returns {string}
 */
function idvCalcCheckCode(body17) {
    var sum = 0;
    for (var i = 0; i < 17; i++) {
        sum += parseInt(body17.charAt(i), 10) * IDV_WEIGHTS[i];
    }
    return IDV_CHECK_CODES[sum % 11];
}

/**
 * 校验并解析中国居民身份证（18 位）
 * @param {string} id
 * @returns {{ ok: boolean, valid: boolean, info?: object, msg: string }}
 */
function idValidateIdCard(id) {
    if (id == null || String(id).trim() === '') {
        return { ok: false, valid: false, msg: '请输入身份证号' };
    }
    var s = String(id).trim().toUpperCase();
    // 15 位旧证：仅格式提示
    if (/^\d{15}$/.test(s)) {
        var y15 = '19' + s.slice(6, 8);
        var m15 = s.slice(8, 10);
        var d15 = s.slice(10, 12);
        var birth15 = y15 + '-' + m15 + '-' + d15;
        var seq15 = parseInt(s.charAt(14), 10);
        return {
            ok: true,
            valid: true,
            info: {
                length: 15,
                region: IDV_PROVINCES[s.slice(0, 2)] || '未知',
                regionCode: s.slice(0, 6),
                birth: birth15,
                gender: seq15 % 2 === 1 ? '男' : '女',
                note: '15 位旧证无校验位，仅做格式与日期粗检',
            },
            msg: '15 位旧证格式可接受（无校验位）',
        };
    }

    if (!/^\d{17}[\dX]$/.test(s)) {
        return { ok: true, valid: false, msg: '须为 18 位（末位可为 X）或 15 位数字' };
    }

    var body = s.slice(0, 17);
    var expected = idvCalcCheckCode(body);
    var actual = s.charAt(17);
    var checkOk = expected === actual;

    var regionCode = s.slice(0, 6);
    var province = IDV_PROVINCES[s.slice(0, 2)] || '未知';
    var birthRaw = s.slice(6, 14);
    var by = parseInt(birthRaw.slice(0, 4), 10);
    var bm = parseInt(birthRaw.slice(4, 6), 10);
    var bd = parseInt(birthRaw.slice(6, 8), 10);
    var birth = birthRaw.slice(0, 4) + '-' + birthRaw.slice(4, 6) + '-' + birthRaw.slice(6, 8);

    var dateOk = true;
    if (bm < 1 || bm > 12 || bd < 1 || bd > 31 || by < 1900 || by > 2100) {
        dateOk = false;
    } else {
        var dt = new Date(by, bm - 1, bd);
        if (dt.getFullYear() !== by || dt.getMonth() !== bm - 1 || dt.getDate() !== bd) {
            dateOk = false;
        }
    }

    var seq = parseInt(s.charAt(16), 10);
    var gender = seq % 2 === 1 ? '男' : '女';

    var valid = checkOk && dateOk;
    var msg;
    if (!dateOk) {
        msg = '出生日期无效: ' + birth;
    } else if (!checkOk) {
        msg = '校验位错误，期望 ' + expected + '，实际 ' + actual;
    } else {
        msg = '校验通过';
    }

    return {
        ok: true,
        valid: valid,
        info: {
            length: 18,
            region: province,
            regionCode: regionCode,
            birth: birth,
            gender: gender,
            checkCode: expected,
            actualCheckCode: actual,
        },
        msg: msg,
    };
}

/**
 * 手机号粗校验与运营商号段
 * @param {string} mobile
 * @returns {{ ok: boolean, valid: boolean, carrier?: string, msg: string }}
 */
function idValidateMobile(mobile) {
    if (mobile == null || String(mobile).trim() === '') {
        return { ok: false, valid: false, msg: '请输入手机号' };
    }
    var s = String(mobile).trim().replace(/[\s-]/g, '');
    if (s.indexOf('+86') === 0) s = s.slice(3);
    if (s.charAt(0) === '86' && s.length === 13) s = s.slice(2);

    if (!/^\d{11}$/.test(s)) {
        return { ok: true, valid: false, msg: '须为 11 位数字（可带 +86）' };
    }
    if (s.charAt(0) !== '1') {
        return { ok: true, valid: false, msg: '手机号须以 1 开头' };
    }

    var prefix3 = s.slice(0, 3);
    var prefix4 = s.slice(0, 4);
    var carrier = idvDetectCarrier(prefix3);
    // 第二位 3-9
    var second = s.charAt(1);
    if (second < '3' || second > '9') {
        return { ok: true, valid: false, carrier: carrier, msg: '号段看起来不像大陆手机号' };
    }

    return {
        ok: true,
        valid: true,
        carrier: carrier,
        msg: '格式有效' + (carrier && carrier !== '未知' ? '，运营商粗分: ' + carrier : '，运营商: 未知'),
    };
}

/**
 * @param {string} p3
 * @returns {string}
 */
function idvDetectCarrier(p3) {
    // 号段会变，仅粗分
    var yd = {
        134: 1,
        135: 1,
        136: 1,
        137: 1,
        138: 1,
        139: 1,
        147: 1,
        148: 1,
        150: 1,
        151: 1,
        152: 1,
        157: 1,
        158: 1,
        159: 1,
        172: 1,
        178: 1,
        182: 1,
        183: 1,
        184: 1,
        187: 1,
        188: 1,
        195: 1,
        197: 1,
        198: 1,
    };
    var lt = {
        130: 1,
        131: 1,
        132: 1,
        145: 1,
        146: 1,
        155: 1,
        156: 1,
        166: 1,
        167: 1,
        171: 1,
        175: 1,
        176: 1,
        185: 1,
        186: 1,
        196: 1,
    };
    var dx = {
        133: 1,
        149: 1,
        153: 1,
        173: 1,
        174: 1,
        177: 1,
        180: 1,
        181: 1,
        189: 1,
        190: 1,
        191: 1,
        193: 1,
        199: 1,
    };
    // 1349 电信卫星等边缘忽略；170/171 虚拟运营商
    if (p3 === '170' || p3 === '171') return '虚拟运营商';
    if (yd[p3]) return '移动';
    if (lt[p3]) return '联通';
    if (dx[p3]) return '电信';
    // 广电等
    if (p3 === '192') return '广电';
    return '未知';
}

/**
 * 银行卡 Luhn 校验（本地实现，不依赖 cnyamount）
 * @param {string} no
 * @returns {{ ok: boolean, valid: boolean, msg: string }}
 */
function idValidateBankCard(no) {
    if (no == null || String(no).trim() === '') {
        return { ok: false, valid: false, msg: '请输入银行卡号' };
    }
    var digits = String(no).replace(/[\s-]/g, '');
    if (!/^\d{12,19}$/.test(digits)) {
        return { ok: true, valid: false, msg: '卡号须为 12~19 位数字' };
    }
    var sum = 0;
    var alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
        var n = parseInt(digits.charAt(i), 10);
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    if (sum % 10 === 0) {
        return { ok: true, valid: true, msg: 'Luhn 校验通过' };
    }
    return { ok: true, valid: false, msg: 'Luhn 校验失败' };
}

/**
 * 统一入口
 * @param {string} text
 * @param {string} [type] idcard|mobile|bank|auto
 * @returns {{ ok: boolean, valid?: boolean, type?: string, info?: object, carrier?: string, msg: string }}
 */
function idValidateAll(text, type) {
    if (text == null || String(text).trim() === '') {
        return { ok: false, msg: '请输入待校验内容' };
    }
    var t = (type || 'auto').toLowerCase();
    var raw = String(text).trim();

    if (t === 'auto') {
        var cleaned = raw.replace(/[\s-]/g, '');
        if (/^\d{17}[\dXx]$/.test(cleaned) || /^\d{15}$/.test(cleaned)) {
            t = 'idcard';
        } else if (/^(\+?86)?1\d{10}$/.test(cleaned)) {
            t = 'mobile';
        } else if (/^\d{12,19}$/.test(cleaned)) {
            t = 'bank';
        } else {
            return { ok: true, valid: false, type: 'unknown', msg: '无法自动识别类型，请手动选择' };
        }
    }

    if (t === 'idcard') {
        var r1 = idValidateIdCard(raw);
        return {
            ok: r1.ok,
            valid: r1.valid,
            type: 'idcard',
            info: r1.info,
            msg: r1.msg,
        };
    }
    if (t === 'mobile') {
        var r2 = idValidateMobile(raw);
        return {
            ok: r2.ok,
            valid: r2.valid,
            type: 'mobile',
            carrier: r2.carrier,
            msg: r2.msg,
        };
    }
    if (t === 'bank') {
        var r3 = idValidateBankCard(raw);
        return {
            ok: r3.ok,
            valid: r3.valid,
            type: 'bank',
            msg: r3.msg,
        };
    }
    return { ok: false, msg: '未知 type，可选: idcard | mobile | bank | auto' };
}

// === UI ===

function idvSetOut(text, isError) {
    var out = document.getElementById('idvOutput');
    if (!out) return;
    out.textContent = text;
    out.className = isError ? 'output-box error' : 'output-box';
}

function idvValidateUi() {
    var text = document.getElementById('idvInput').value;
    var typeEl = document.getElementById('idvType');
    var type = typeEl ? typeEl.value : 'auto';
    var r = idValidateAll(text, type);
    if (!r.ok && r.valid !== true && r.valid !== false) {
        idvSetOut(r.msg || '校验失败', true);
        if (typeof setStatus === 'function') setStatus('校验失败');
        return;
    }

    var lines = [];
    lines.push('类型: ' + (r.type || type));
    lines.push('结果: ' + (r.valid ? '有效' : '无效'));
    lines.push('说明: ' + r.msg);
    if (r.info) {
        if (r.info.region) lines.push('地区: ' + r.info.region + ' (' + (r.info.regionCode || '') + ')');
        if (r.info.birth) lines.push('出生: ' + r.info.birth);
        if (r.info.gender) lines.push('性别: ' + r.info.gender);
        if (r.info.checkCode != null) lines.push('校验位: 期望 ' + r.info.checkCode + ' / 实际 ' + r.info.actualCheckCode);
        if (r.info.note) lines.push('备注: ' + r.info.note);
    }
    if (r.carrier) lines.push('运营商: ' + r.carrier);
    lines.push('');
    lines.push('纯本地校验，不调用外部 API');

    idvSetOut(lines.join('\n'), !r.valid);
    if (typeof setStatus === 'function') setStatus(r.valid ? '校验通过' : '校验未通过');
}

function idvLoadSample() {
    var typeEl = document.getElementById('idvType');
    var type = typeEl ? typeEl.value : 'auto';
    // 使用算法生成的合法身份证
    var body = '11010119900307851';
    var id = body + idvCalcCheckCode(body);
    if (type === 'mobile') {
        document.getElementById('idvInput').value = '13800138000';
    } else if (type === 'bank') {
        document.getElementById('idvInput').value = '4111111111111111';
    } else {
        document.getElementById('idvInput').value = id;
        if (typeEl && type === 'auto') typeEl.value = 'idcard';
    }
    idvValidateUi();
}

function idvClear() {
    var el = document.getElementById('idvInput');
    if (el) el.value = '';
    idvSetOut('', false);
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        idValidateIdCard: idValidateIdCard,
        idValidateMobile: idValidateMobile,
        idValidateBankCard: idValidateBankCard,
        idValidateAll: idValidateAll,
        idvCalcCheckCode: idvCalcCheckCode,
    };
}
