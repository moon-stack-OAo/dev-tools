const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳丰鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴宋茅庞熊纪舒屈项祝董杜阮蓝闽席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴郁胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公';
const GIVEN = '明华军强杰飞斌丽敏芳静霞秀娟英玲萍红莲云琼桂香兰凤娣玉花英妹荷洁梅芳琴珍艳芳淑贞桂芝瑞琳媛婷岚瑶瑶怡萱彤倩妍颖钰霖琪思雨薇欣玥珂琦慧';
const EMAIL_DOMAINS = ['gmail.com', 'qq.com', '163.com', '126.com', 'outlook.com', 'foxmail.com', 'aliyun.com', 'sina.com'];
const CITIES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市', '天津市', '苏州市', '长沙市', '郑州市', '东莞市', '青岛市', '沈阳市', '宁波市', '昆明市', '大连市'];

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function mockName() {
    const surname = pick(Array.from(SURNAMES));
    const givenLen = Math.random() > 0.4 ? 2 : 1;
    let given = '';
    for (let i = 0; i < givenLen; i++) given += pick(Array.from(GIVEN));
    return surname + given;
}

function mockPhone() {
    const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
        '150', '151', '152', '153', '155', '156', '157', '158', '159',
        '170', '171', '173', '175', '176', '177', '178',
        '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
        '198', '199'];
    const prefix = pick(prefixes);
    let num = '';
    for (let i = 0; i < 8; i++) num += randInt(0, 9);
    return prefix + num;
}

function mockEmail() {
    const name = mockName().toLowerCase() + randInt(1, 999);
    return name + '@' + pick(EMAIL_DOMAINS);
}

function mockIdCard() {
    const area = randInt(110000, 659000).toString();
    const year = randInt(1960, 2005).toString();
    const month = ('0' + randInt(1, 12)).slice(-2);
    const day = ('0' + randInt(1, 28)).slice(-2);
    const seq = ('00' + randInt(1, 999)).slice(-3);
    const base = area + year + month + day + seq;
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkChars = '10X98765432';
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += parseInt(base[i]) * weights[i];
    return base + checkChars[sum % 11];
}

function mockCompany() {
    const prefixes = ['杭州', '北京', '上海', '深圳', '广州', '成都', '南京', '武汉', '苏州', '西安'];
    const cores = ['云帆', '星辰', '明源', '宏图', '鼎新', '智联', '恒通', '卓越', '华信', '中科',
        '蓝海', '创想', '天辰', '锐思', '博远', '金诚', '嘉华', '云创', '世纪', '万象'];
    const suffixes = ['科技', '信息', '数据', '智能', '网络', '软件', '技术', '咨询', '传媒', '实业'];
    return pick(prefixes) + pick(cores) + pick(suffixes) + '有限公司';
}

function mockCity() {
    return pick(CITIES);
}

function mockAddress() {
    const city = mockCity();
    const district = pick(['西湖区', '朝阳区', '浦东新区', '福田区', '武侯区', '鼓楼区', '天河区', '高新区', '工业园区', '滨海新区']);
    const road = pick(['科技路', '创新路', '中山路', '人民路', '建设大道', '数码街', '创业路', '湖滨路', '江南大道', '金融街']);
    const num = randInt(1, 999) + '号';
    return city + district + road + num;
}

function mockUrl() {
    const schemes = ['https', 'http'];
    const domains = ['example', 'demo', 'test', 'api', 'app', 'cloud', 'data', 'shop', 'blog', 'web'];
    const tlds = ['com', 'cn', 'net', 'org', 'io', 'tech'];
    return pick(schemes) + '://www.' + pick(domains) + randInt(1, 99) + '.' + pick(tlds);
}

function mockIp() {
    return randInt(1, 254) + '.' + randInt(0, 255) + '.' + randInt(0, 255) + '.' + randInt(1, 254);
}

function mockGen(type) {
    const map = {
        'name': mockName, 'phone': mockPhone, 'email': mockEmail, 'idcard': mockIdCard,
        'company': mockCompany, 'city': mockCity, 'address': mockAddress, 'url': mockUrl, 'ip': mockIp
    };
    return (map[type] || mockName)();
}

function mockBatch() {
    const type = document.getElementById('mockType').value;
    const count = parseInt(document.getElementById('mockCount').value) || 5;
    const list = document.getElementById('mockList');
    list.innerHTML = '';
    const capped = Math.min(count, 50);
    for (let i = 0; i < capped; i++) {
        const item = document.createElement('div');
        item.className = 'uuid-item';
        const val = mockGen(type);
        const copyId = 'mockCopy' + i;
        item.innerHTML = '<span>' + (i + 1) + '. ' + val + '</span><button class="copy-btn" id="' + copyId + '" style="opacity:0.6;padding:2px 8px;font-size:11px">复制</button>';
        const btn = item.querySelector('#' + copyId);
        btn.addEventListener('mouseenter', function () {
            this.style.opacity = '1';
        });
        btn.addEventListener('mouseleave', function () {
            this.style.opacity = '0.6';
        });
        btn.addEventListener('click', function () {
            navigator.clipboard.writeText(val).then(() => toast('已复制'));
        });
        list.appendChild(item);
    }
}
