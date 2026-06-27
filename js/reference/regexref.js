const REGEX_REF = [
    {
        cat: '字符类简写',
        items: [
            { pattern: '\\d', desc: '数字字符 等价于 [0-9]' },
            { pattern: '\\D', desc: '非数字字符 等价于 [^0-9]' },
            { pattern: '\\w', desc: '单词字符 等价于 [a-zA-Z0-9_]' },
            { pattern: '\\W', desc: '非单词字符' },
            { pattern: '\\s', desc: '空白字符 (空格/制表/换行/回车)' },
            { pattern: '\\S', desc: '非空白字符' },
            { pattern: '.', desc: '除换行外的任意单字符' },
            { pattern: '[\\s\\S]', desc: '任意字符 (含换行)' },
        ],
    },
    {
        cat: '锚点与边界',
        items: [
            { pattern: '^', desc: '字符串开头 / 行首 (m 模式下)' },
            { pattern: '$', desc: '字符串结尾 / 行尾 (m 模式下)' },
            { pattern: '\\b', desc: '单词边界' },
            { pattern: '\\B', desc: '非单词边界' },
            { pattern: '\\A', desc: '字符串开头 (忽略 m 修饰符)' },
            { pattern: '\\Z', desc: '字符串结尾 (忽略 m 修饰符)' },
        ],
    },
    {
        cat: '量词',
        items: [
            { pattern: '*', desc: '0 次或多次 (贪婪)' },
            { pattern: '+', desc: '1 次或多次 (贪婪)' },
            { pattern: '?', desc: '0 次或 1 次 (贪婪)' },
            { pattern: '{n}', desc: '恰好 n 次' },
            { pattern: '{n,}', desc: '至少 n 次' },
            { pattern: '{n,m}', desc: 'n 到 m 次' },
            { pattern: '*?', desc: '0+ 次 (非贪婪, 尽可能少)' },
            { pattern: '+?', desc: '1+ 次 (非贪婪, 尽可能少)' },
            { pattern: '??', desc: '0/1 次 (非贪婪, 尽可能少)' },
            { pattern: '{n,m}?', desc: 'n~m 次 (非贪婪, 尽可能少)' },
        ],
    },
    {
        cat: '字符集',
        items: [
            { pattern: '[abc]', desc: 'a/b/c 中任一字符' },
            { pattern: '[^abc]', desc: '非 a/b/c 的任一字符' },
            { pattern: '[a-z]', desc: 'a 到 z 范围内任一字符' },
            { pattern: '[A-Za-z0-9]', desc: '字母 + 数字' },
            { pattern: '[\\u4e00-\\u9fa5]', desc: '中文字符 Unicode 范围' },
        ],
    },
    {
        cat: '分组与引用',
        items: [
            { pattern: '(abc)', desc: '捕获组: 匹配并记住 abc' },
            { pattern: '(?:abc)', desc: '非捕获组: 匹配但不创建引用' },
            { pattern: '(?<name>abc)', desc: '命名捕获组: 通过 name 访问' },
            { pattern: '\\1', desc: '反向引用第 1 个捕获组' },
            { pattern: '\\k<name>', desc: '反向引用命名捕获组' },
        ],
    },
    {
        cat: '零宽断言',
        items: [
            { pattern: 'a(?=b)', desc: '正向先行: a 后面必须是 b' },
            { pattern: 'a(?!b)', desc: '负向先行: a 后面不能是 b' },
            { pattern: '(?<=b)a', desc: '正向后行: a 前面必须是 b' },
            { pattern: '(?<!b)a', desc: '负向后行: a 前面不能是 b' },
        ],
    },
    {
        cat: '模式修饰符',
        items: [
            { pattern: '(?i)', desc: '忽略大小写 i 模式 (case-insensitive)' },
            { pattern: '(?s)', desc: '单行模式 s 模式: 点匹配换行 (dotall)' },
            { pattern: '(?m)', desc: '多行模式 m 模式: ^ $ 匹配行首尾 (multiline)' },
            { pattern: '(?x)', desc: '扩展模式 x 模式: 忽略空白与 # 注释 (extended)' },
            { pattern: '(?i)(?m)', desc: '组合修饰: i + m 忽略大小写 + 多行' },
            { pattern: '(?i:abc)', desc: '局部修饰: 仅本组应用 i 模式' },
        ],
    },
    {
        cat: '数字',
        items: [
            { pattern: '^\\d+$', desc: '纯数字' },
            { pattern: '^\\d{6}$', desc: '6 位数字' },
            { pattern: '^\\d{11}$', desc: '11 位数字 (手机号)' },
            { pattern: '^\\d{15,18}$', desc: '15-18 位数字 (身份证)' },
            { pattern: '^-?\\d+(\\.\\d+)?$', desc: '整数或小数' },
            { pattern: '^\\d{1,3}(\\.\\d{1,3}){3}$', desc: 'IPv4 IP 地址' },
            { pattern: '^[+-]?\\d+$', desc: '整数 (含正负)' },
            { pattern: '^\\d+(\\.\\d{1,2})?$', desc: '金额 (两位小数)' },
        ],
    },
    {
        cat: '字母',
        items: [
            { pattern: '^[a-zA-Z]+$', desc: '纯英文字母' },
            { pattern: '^[A-Z]+$', desc: '大写字母' },
            { pattern: '^[a-z]+$', desc: '小写字母' },
            { pattern: '^[a-zA-Z0-9]+$', desc: '字母 + 数字' },
            { pattern: '^[a-zA-Z0-9_]+$', desc: '字母 + 数字 + 下划线' },
            { pattern: '^[a-zA-Z0-9_\\-]+$', desc: '字母数字下划线连字符' },
        ],
    },
    {
        cat: '中文',
        items: [
            { pattern: '^[\\u4e00-\\u9fa5]+$', desc: '纯中文' },
            { pattern: '^[\\u4e00-\\u9fa5]{2,4}$', desc: '2-4 个中文 (姓名)' },
            { pattern: '[\\u4e00-\\u9fa5]', desc: '是否包含中文' },
        ],
    },
    {
        cat: '常用格式',
        items: [
            { pattern: '^1[3-9]\\d{9}$', desc: '手机号 (中国大陆)' },
            { pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$', desc: 'Email 邮箱 (简化版)' },
            { pattern: "^[\\w.!#$%&'*+/=?^_`{|}~-]+@[\\w-]+(\\.[\\w-]+)+$", desc: 'Email 邮箱 (RFC 5322 完整版)' },
            { pattern: '^https?://[\\w./?&=#%-]+$', desc: 'URL 网址 链接' },
            { pattern: '^\\d{17}[\\dXx]$', desc: '身份证 (18 位)' },
            { pattern: '^\\d{6}$', desc: '邮政编码 邮编 (6 位)' },
            { pattern: '^\\d{4}-\\d{1,2}-\\d{1,2}$', desc: '日期 (YYYY-MM-DD)' },
            { pattern: '^\\d{4}-\\d{1,2}-\\d{1,2} \\d{1,2}:\\d{2}$', desc: '日期时间' },
            { pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', desc: '时间 (HH:mm)' },
            { pattern: '^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$', desc: '时间 (HH:mm:ss)' },
            { pattern: '^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$', desc: 'IPv6 IP 地址' },
            { pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$', desc: 'MAC 地址' },
            {
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
                desc: 'UUID 唯一标识 (格式校验)',
            },
        ],
    },
    {
        cat: '业务校验',
        items: [
            {
                pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$',
                desc: '强密码: 大小写+数字+特殊+8位+',
            },
            { pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$', desc: '中等密码: 大小写+数字+8位+' },
            { pattern: '^[a-zA-Z][a-zA-Z0-9_]{3,15}$', desc: '用户名: 字母开头 4-16 位' },
            {
                pattern:
                    '^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{4,5}[A-Z0-9挂学警港澳]$',
                desc: '车牌号 (含新能源/挂学警港澳)',
            },
            { pattern: '^[1-9]\\d{4,11}$', desc: 'QQ 号 (5-12 位, 非零开头)' },
            { pattern: '^[a-zA-Z][a-zA-Z0-9_-]{5,19}$', desc: '微信号 (6-20 位字母开头)' },
            { pattern: '^[\\u4e00-\\u9fa5\\w]{2,16}$', desc: '中文昵称 2-16 字 (含字母数字)' },
            { pattern: '^\\d{16,19}$', desc: '银行卡号 (16-19 位)' },
            { pattern: '^(0\\d{2,3}-?)?[1-9]\\d{6,7}$', desc: '固定电话 (区号+号码)' },
            { pattern: '^400-?\\d{3}-?\\d{4}$', desc: '400/800 服务电话' },
            { pattern: '^((0\\d{2,3}-?)?\\d{7,8}|1[3-9]\\d{9})$', desc: '手机号或固话 (统一)' },
            { pattern: '^(?:\\d{15}|\\d{17}[\\dXx])$', desc: '身份证 (15/18 位统一)' },
            { pattern: '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}$', desc: '域名 (多级, 含子域名)' },
            { pattern: '^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.-]+)?(\\+[a-zA-Z0-9.-]+)?$', desc: '语义化版本号 (SemVer)' },
            { pattern: '^(0|[1-9]\\d{0,9})$', desc: '正整数 (无前导 0)' },
        ],
    },
    {
        cat: 'Java 相关',
        items: [
            { pattern: '^[a-z_$][a-zA-Z0-9_$]*$', desc: 'Java 变量名' },
            { pattern: '^[A-Z][a-zA-Z0-9_]*$', desc: 'Java 类名 (PascalCase)' },
            { pattern: '^[a-z]+([A-Z][a-z]*)*$', desc: 'camelCase (驼峰)' },
            { pattern: '^[a-z]+(_[a-z]+)*$', desc: 'snake_case (下划线)' },
            { pattern: '^[A-Z_][A-Z0-9_]*$', desc: 'UPPER_SNAKE_CASE 常量' },
            { pattern: '^(com|org|net|io)\\.[\\w.]+$', desc: 'Java 包名' },
            { pattern: '@\\w+', desc: 'Java/Spring 注解 (含 @Override 等)' },
            {
                pattern: '@(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping)\\([^)]*\\)',
                desc: 'Spring Web 注解及路径',
            },
            { pattern: '//.*', desc: 'Java 单行注释' },
            { pattern: '/\\*[\\s\\S]*?\\*/', desc: 'Java 多行注释' },
            { pattern: '^import\\s+[\\w.*]+;?$', desc: 'Java import 语句' },
            { pattern: '^package\\s+[\\w.]+;?$', desc: 'Java package 语句' },
            { pattern: '^\\d+[LlFfDd]?$', desc: 'Java 数字字面量 (含后缀)' },
            { pattern: '^public\\s+class\\s+[A-Z]\\w*', desc: 'public class 声明' },
            { pattern: '<[A-Z][\\w, ?<>]*>', desc: 'Java 泛型类型 (简化)' },
        ],
    },
    {
        cat: '文本提取',
        items: [
            { pattern: 'https?://[^\\s]+', desc: '提取文本中所有 URL 网址 链接' },
            { pattern: '(?<=://)[\\w.-]+', desc: '从 URL 中提取域名' },
            { pattern: '(?<=://[\\w.-]+)(/[\\w./?&=#%-]*)?', desc: '从 URL 中提取路径+参数' },
            { pattern: '[\\w.-]+@[\\w.-]+\\.\\w+', desc: '提取文本中所有 Email 邮箱' },
            { pattern: '(?<=@)[\\w.-]+', desc: '从 Email 邮箱提取 @ 前用户名' },
            { pattern: '[\\u4e00-\\u9fa5]+', desc: '提取文本中所有中文' },
            { pattern: '\\d+(?:\\.\\d+)?', desc: '提取数字 (整数或小数)' },
            { pattern: '1[3-9]\\d{9}', desc: '提取 11 位手机号' },
            { pattern: '\\b[A-Z][a-zA-Z0-9_]*\\b', desc: '提取首字母大写的标识符 (类名等)' },
            { pattern: '"[^"]*"', desc: '提取双引号字符串内容' },
            { pattern: '\\$([a-zA-Z_]\\w*)', desc: '提取 PHP/Shell 变量名' },
        ],
    },
    {
        cat: '其他',
        items: [
            { pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$', desc: '十六进制颜色' },
            { pattern: '^[\\w\\s]+$', desc: '单词 + 空格' },
            { pattern: '^[\\s\\S]*$', desc: '任意字符 (含换行)' },
            { pattern: '^\\s*$', desc: '空行或空白' },
            { pattern: '<!--[\\s\\S]*?-->', desc: 'HTML 注释' },
            { pattern: '<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>([\\s\\S]*?)</\\1>', desc: 'HTML 配对标签 (含内容)' },
            { pattern: '\"([^\"\\\\]|\\\\.)*\"', desc: '双引号字符串 (含转义)' },
            { pattern: '\\(([^)]+)\\)', desc: '圆括号内内容' },
        ],
    },
];

// 使用全局 safeCopy()（定义于 app.js）

let _regexRefSearchTimer = null;

function regexRefSearch() {
    clearTimeout(_regexRefSearchTimer);
    _regexRefSearchTimer = setTimeout(() => {
        const el = document.getElementById('regexRefSearch');
        regexRefRender(el ? el.value : '');
    }, 180);
}

function regexRefRender(filter) {
    const container = document.getElementById('regexRefContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    REGEX_REF.forEach((group) => {
        const matched = filter
            ? group.items.filter(
                  (it) =>
                      it.pattern.toLowerCase().includes(filter) ||
                      it.desc.toLowerCase().includes(filter) ||
                      group.cat.toLowerCase().includes(filter)
              )
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const section = document.createElement('div');
        section.className = 'ref-group';
        section.innerHTML = `<div class="ref-group-title">${group.cat}</div>`;
        matched.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            card.innerHTML = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.pattern.replace(/</g, '&lt;')}</code><span class="ref-cmd-desc">${item.desc}</span><button class="sm outline" onclick="safeCopy('${item.pattern.replace(/'/g, "\\'")}')">复制</button></div>`;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML =
            '<div style="color:var(--text-muted);padding:24px;text-align:center;font-size:12.5px">未找到匹配 "' +
            escapeHtml(filter) +
            '" 的正则</div>';
    }
}

registerInit('regexref', regexRefRender);
