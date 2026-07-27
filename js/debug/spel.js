// SpEL 速查 / 简易试算（非完整 SpEL 引擎）

/**
 * 简易 SpEL 子集求值
 * 支持：数字、字符串、布尔、null、+ - * / %、比较、&& || !、三元 ?:、括号、
 * 属性路径 a.b.c 与 a['b'] / a["b"]
 * 不支持：方法调用、T()、@bean、集合投影等
 *
 * @param {string} expr
 * @param {object} [contextObj]
 * @returns {*}
 */
function evalSimpleSpel(expr, contextObj) {
    if (expr == null || String(expr).trim() === '') {
        throw new Error('表达式不能为空');
    }
    const ctx = contextObj && typeof contextObj === 'object' ? contextObj : {};
    const parser = new SpelSimpleParser(String(expr), ctx);
    const value = parser.parseExpression();
    parser.skipWs();
    if (!parser.eof()) {
        throw new Error('表达式未完全解析，残留: ' + parser.rest());
    }
    return value;
}

function SpelSimpleParser(input, context) {
    this.input = input;
    this.pos = 0;
    this.context = context;
}

SpelSimpleParser.prototype.eof = function () {
    return this.pos >= this.input.length;
};

SpelSimpleParser.prototype.rest = function () {
    return this.input.slice(this.pos);
};

SpelSimpleParser.prototype.peek = function () {
    return this.input[this.pos];
};

SpelSimpleParser.prototype.skipWs = function () {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
        this.pos++;
    }
};

SpelSimpleParser.prototype.match = function (s) {
    this.skipWs();
    if (this.input.slice(this.pos, this.pos + s.length) === s) {
        this.pos += s.length;
        return true;
    }
    return false;
};

SpelSimpleParser.prototype.expect = function (s) {
    if (!this.match(s)) {
        throw new Error('期望 "' + s + '"，位置 ' + this.pos);
    }
};

// expression = ternary
SpelSimpleParser.prototype.parseExpression = function () {
    return this.parseTernary();
};

// ternary: or (? or : or)?
SpelSimpleParser.prototype.parseTernary = function () {
    let cond = this.parseOr();
    this.skipWs();
    if (this.match('?')) {
        const whenTrue = this.parseExpression();
        this.expect(':');
        const whenFalse = this.parseExpression();
        return cond ? whenTrue : whenFalse;
    }
    return cond;
};

SpelSimpleParser.prototype.parseOr = function () {
    let left = this.parseAnd();
    for (;;) {
        this.skipWs();
        if (this.match('||') || this.match('or') || this.match('OR')) {
            // 避免匹配 identifier 中的 or
            const right = this.parseAnd();
            left = !!(left || right);
        } else {
            break;
        }
    }
    return left;
};

SpelSimpleParser.prototype.parseAnd = function () {
    let left = this.parseEquality();
    for (;;) {
        this.skipWs();
        if (this.match('&&') || this.match('and') || this.match('AND')) {
            const right = this.parseEquality();
            left = !!(left && right);
        } else {
            break;
        }
    }
    return left;
};

SpelSimpleParser.prototype.parseEquality = function () {
    let left = this.parseComparison();
    for (;;) {
        this.skipWs();
        if (this.match('==') || this.match('eq') || this.match('EQ')) {
            const right = this.parseComparison();
            left = left === right;
        } else if (this.match('!=') || this.match('ne') || this.match('NE')) {
            const right = this.parseComparison();
            left = left !== right;
        } else {
            break;
        }
    }
    return left;
};

SpelSimpleParser.prototype.parseComparison = function () {
    let left = this.parseAdd();
    for (;;) {
        this.skipWs();
        if (this.match('>=') || this.match('ge') || this.match('GE')) {
            const right = this.parseAdd();
            left = left >= right;
        } else if (this.match('<=') || this.match('le') || this.match('LE')) {
            const right = this.parseAdd();
            left = left <= right;
        } else if (this.match('>') || this.match('gt') || this.match('GT')) {
            // 避免把 >= 拆开：已先匹配 >=
            const right = this.parseAdd();
            left = left > right;
        } else if (this.match('<') || this.match('lt') || this.match('LT')) {
            const right = this.parseAdd();
            left = left < right;
        } else {
            break;
        }
    }
    return left;
};

SpelSimpleParser.prototype.parseAdd = function () {
    let left = this.parseMul();
    for (;;) {
        this.skipWs();
        if (this.match('+')) {
            const right = this.parseMul();
            // 字符串拼接
            if (typeof left === 'string' || typeof right === 'string') {
                left = String(left) + String(right);
            } else {
                left = left + right;
            }
        } else if (this.match('-')) {
            // 区分负号：若前一 token 后直接数字已在 unary 处理
            const right = this.parseMul();
            left = left - right;
        } else {
            break;
        }
    }
    return left;
};

SpelSimpleParser.prototype.parseMul = function () {
    let left = this.parseUnary();
    for (;;) {
        this.skipWs();
        if (this.match('*')) {
            left = left * this.parseUnary();
        } else if (this.match('/')) {
            left = left / this.parseUnary();
        } else if (this.match('%')) {
            left = left % this.parseUnary();
        } else {
            break;
        }
    }
    return left;
};

SpelSimpleParser.prototype.parseUnary = function () {
    this.skipWs();
    if (this.match('!') || this.match('not') || this.match('NOT')) {
        return !this.parseUnary();
    }
    if (this.match('-')) {
        return -this.parseUnary();
    }
    if (this.match('+')) {
        return +this.parseUnary();
    }
    return this.parsePrimary();
};

SpelSimpleParser.prototype.parsePrimary = function () {
    this.skipWs();
    if (this.eof()) throw new Error('意外的表达式结束');

    // 括号
    if (this.match('(')) {
        const v = this.parseExpression();
        this.expect(')');
        return v;
    }

    // 字符串
    const ch = this.peek();
    if (ch === "'" || ch === '"') {
        return this.parseString();
    }

    // 数字
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(this.input[this.pos + 1] || ''))) {
        return this.parseNumber();
    }

    // 标识符 / 关键字 / 属性路径
    if (/[A-Za-z_$#]/.test(ch)) {
        return this.parsePath();
    }

    // 索引开头？不允许
    throw new Error('无法解析，位置 ' + this.pos + ': ' + this.rest().slice(0, 20));
};

SpelSimpleParser.prototype.parseString = function () {
    const q = this.input[this.pos++];
    let s = '';
    while (!this.eof()) {
        const ch = this.input[this.pos++];
        if (ch === '\\' && !this.eof()) {
            const n = this.input[this.pos++];
            if (n === 'n') s += '\n';
            else if (n === 't') s += '\t';
            else if (n === 'r') s += '\r';
            else s += n;
            continue;
        }
        if (ch === q) return s;
        s += ch;
    }
    throw new Error('未闭合的字符串');
};

SpelSimpleParser.prototype.parseNumber = function () {
    const start = this.pos;
    while (!this.eof() && /[0-9]/.test(this.peek())) this.pos++;
    if (!this.eof() && this.peek() === '.') {
        this.pos++;
        while (!this.eof() && /[0-9]/.test(this.peek())) this.pos++;
    }
    // 科学计数
    if (!this.eof() && /[eE]/.test(this.peek())) {
        this.pos++;
        if (!this.eof() && /[+-]/.test(this.peek())) this.pos++;
        while (!this.eof() && /[0-9]/.test(this.peek())) this.pos++;
    }
    const num = Number(this.input.slice(start, this.pos));
    if (!isFinite(num)) throw new Error('无效数字');
    return num;
};

SpelSimpleParser.prototype.parseIdent = function () {
    this.skipWs();
    const start = this.pos;
    if (this.eof() || !/[A-Za-z_$#]/.test(this.peek())) {
        throw new Error('期望标识符，位置 ' + this.pos);
    }
    this.pos++;
    while (!this.eof() && /[A-Za-z0-9_$]/.test(this.peek())) this.pos++;
    return this.input.slice(start, this.pos);
};

/**
 * 解析属性路径：user.age / user['name'] / #root
 */
SpelSimpleParser.prototype.parsePath = function () {
    // 关键字字面量
    const save = this.pos;
    const ident = this.parseIdent();
    if (ident === 'true') return true;
    if (ident === 'false') return false;
    if (ident === 'null' || ident === 'nil') return null;

    // 方法调用不支持：ident(
    this.skipWs();
    if (this.peek() === '(') {
        throw new Error('不支持方法调用: ' + ident + '()（浏览器无法实现完整 SpEL）');
    }

    // T( 类型引用
    if (ident === 'T' && this.peek() === '(') {
        throw new Error('不支持 T() 类型引用');
    }

    // @bean
    if (ident.charAt(0) === '@' || (ident === '' && this.input[save] === '@')) {
        throw new Error('不支持 @bean 引用');
    }

    let value;
    if (ident === '#root' || ident === 'root') {
        value = this.context;
    } else if (ident.charAt(0) === '#') {
        const key = ident.slice(1);
        if (Object.prototype.hasOwnProperty.call(this.context, key)) {
            value = this.context[key];
        } else if (Object.prototype.hasOwnProperty.call(this.context, ident)) {
            value = this.context[ident];
        } else {
            value = undefined;
        }
    } else if (Object.prototype.hasOwnProperty.call(this.context, ident)) {
        value = this.context[ident];
    } else {
        // 允许从 root 直接读
        value = this.context[ident];
    }

    // 继续 .prop 或 ['key'] 或 [0]
    for (;;) {
        this.skipWs();
        if (this.match('.')) {
            this.skipWs();
            // 安全导航 ?.
            // 已消费 .
            if (this.peek() === '?') {
                // 实际上 ?. 应在 . 之前；这里处理 a?.b：match 了 . 就不对
            }
            const prop = this.parseIdent();
            this.skipWs();
            if (this.peek() === '(') {
                throw new Error('不支持方法调用: ' + prop + '()');
            }
            if (value == null) {
                value = undefined;
            } else {
                value = value[prop];
            }
            continue;
        }
        // 安全导航 ?.
        if (this.input.slice(this.pos, this.pos + 2) === '?.') {
            this.pos += 2;
            this.skipWs();
            const prop = this.parseIdent();
            this.skipWs();
            if (this.peek() === '(') {
                throw new Error('不支持方法调用: ' + prop + '()');
            }
            if (value == null) {
                value = null;
            } else {
                value = value[prop];
            }
            continue;
        }
        if (this.match('[')) {
            this.skipWs();
            let key;
            if (this.peek() === "'" || this.peek() === '"') {
                key = this.parseString();
            } else {
                key = this.parseExpression();
            }
            this.expect(']');
            if (value == null) {
                value = undefined;
            } else {
                value = value[key];
            }
            continue;
        }
        break;
    }
    return value;
};

// ---------- UI ----------

function spelEval() {
    const expr = document.getElementById('spelExpr').value;
    const ctxRaw = document.getElementById('spelContext').value;
    const out = document.getElementById('spelOutput');
    try {
        let ctx = {};
        if (ctxRaw && ctxRaw.trim()) {
            ctx = JSON.parse(ctxRaw);
            if (ctx === null || typeof ctx !== 'object' || Array.isArray(ctx)) {
                throw new Error('Context 须为 JSON 对象');
            }
        }
        const result = evalSimpleSpel(expr, ctx);
        let text;
        if (result === undefined) text = 'undefined';
        else if (typeof result === 'string') text = JSON.stringify(result);
        else text = JSON.stringify(result, null, 2);
        out.textContent = text;
        out.className = 'output-box';
        setStatus('求值成功');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function spelLoadSample() {
    document.getElementById('spelExpr').value = "user.age > 18 && user.name == 'a' ? 'adult' : 'minor'";
    document.getElementById('spelContext').value = JSON.stringify(
        { user: { age: 20, name: 'a', tags: ['java', 'spring'] } },
        null,
        2,
    );
    setStatus('已加载示例');
}

function spelClear() {
    document.getElementById('spelExpr').value = '';
    document.getElementById('spelContext').value = '';
    document.getElementById('spelOutput').textContent = '';
    setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        evalSimpleSpel: evalSimpleSpel,
    };
}
