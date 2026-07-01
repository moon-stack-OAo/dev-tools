const {
    parseJavaFields,
    fieldAnnoSpec,
    inferValidations,
    collectImports,
    generateBean,
    parseCustomAnnotations,
    renderAnnotation,
    dedupAnnos,
} = require('../../js/codegen/beanval.js');

// ============== parseJavaFields ==============

describe('parseJavaFields 基础解析', () => {
    test('解析单个 private 字段', () => {
        const r = parseJavaFields('private String username;');
        expect(r).toEqual([{ name: 'username', type: 'String', typeRaw: 'String' }]);
    });

    test('解析 public/protected/static/final/transient 修饰', () => {
        const text = [
            'public Integer age;',
            'protected static final String NAME;',
            'private transient Boolean active;',
        ].join('\n');
        const r = parseJavaFields(text);
        const names = r.map((f) => f.name);
        expect(names).toContain('age');
        expect(names).toContain('NAME');
        expect(names).toContain('active');
        expect(r.find((f) => f.name === 'age').type).toBe('Integer');
    });

    test('解析带包路径类型 java.time.LocalDate', () => {
        const r = parseJavaFields('private java.time.LocalDate birthday;');
        expect(r).toHaveLength(1);
        expect(r[0].type).toBe('LocalDate');
        expect(r[0].typeRaw).toBe('java.time.LocalDate');
        expect(r[0].name).toBe('birthday');
    });

    test('空文本返回空数组', () => {
        expect(parseJavaFields('')).toEqual([]);
        expect(parseJavaFields(null)).toEqual([]);
        expect(parseJavaFields(undefined)).toEqual([]);
    });

    test('跳过注释行与方法签名', () => {
        const text = [
            '// private String commented;',
            '/* private String block; */',
            'public void doIt(String x) {}',
            'private String real;',
        ].join('\n');
        const r = parseJavaFields(text);
        expect(r).toHaveLength(1);
        expect(r[0].name).toBe('real');
    });

    test('解析多行混合字段', () => {
        const text = [
            'private String username;',
            'private Integer age;',
            'private java.math.BigDecimal salary;',
            '',
            'private Boolean active;',
        ].join('\n');
        const r = parseJavaFields(text);
        expect(r).toHaveLength(4);
        expect(r.map((f) => f.name)).toEqual(['username', 'age', 'salary', 'active']);
        expect(r[2].type).toBe('BigDecimal');
    });
});

// ============== fieldAnnoSpec ==============

describe('fieldAnnoSpec 类型推断', () => {
    test('String → NotBlank + Size', () => {
        const r = fieldAnnoSpec('String', 'desc');
        const names = r.map((a) => a.anno);
        expect(names).toContain('NotBlank');
        expect(names).toContain('Size');
        expect(r.find((a) => a.anno === 'Size').params).toBe('max = 255');
    });

    test('Integer → Min(0) + Max(默认)', () => {
        const r = fieldAnnoSpec('Integer', 'count');
        expect(r.find((a) => a.anno === 'Min').params).toBe('0');
        expect(r.find((a) => a.anno === 'Max').params).toBe(String(Number.MAX_SAFE_INTEGER));
    });

    test('Long → Min(0) + Max(默认)', () => {
        const r = fieldAnnoSpec('Long', 'total');
        expect(r.find((a) => a.anno === 'Min')).toBeTruthy();
        expect(r.find((a) => a.anno === 'Max')).toBeTruthy();
    });

    test('BigDecimal → Digits(integer=10, fraction=2)', () => {
        const r = fieldAnnoSpec('BigDecimal', 'amount');
        expect(r).toHaveLength(1);
        expect(r[0].anno).toBe('Digits');
        expect(r[0].params).toBe('integer = 10, fraction = 2');
    });

    test('Date 默认不加注解', () => {
        const r = fieldAnnoSpec('Date', 'created');
        expect(r).toEqual([]);
    });

    test('Double → DecimalMin + DecimalMax', () => {
        const r = fieldAnnoSpec('Double', 'rate');
        const names = r.map((a) => a.anno);
        expect(names).toContain('DecimalMin');
        expect(names).toContain('DecimalMax');
    });
});

// ============== fieldAnnoSpec 名称启发式 ==============

describe('fieldAnnoSpec 名称启发式', () => {
    test('String + email → Email', () => {
        const r = fieldAnnoSpec('String', 'email');
        expect(r.find((a) => a.anno === 'Email')).toBeTruthy();
    });

    test('String + phone → Pattern(手机号)', () => {
        const r = fieldAnnoSpec('String', 'phone');
        const p = r.find((a) => a.anno === 'Pattern');
        expect(p).toBeTruthy();
        expect(p.params).toMatch(/1\[3-9\]/);
        expect(p.params).toMatch(/\\d\{9\}/);
    });

    test('Integer + age → Max(150)', () => {
        const r = fieldAnnoSpec('Integer', 'age');
        expect(r.find((a) => a.anno === 'Max').params).toBe('150');
    });

    test('Date + birthday → Past', () => {
        const r = fieldAnnoSpec('LocalDate', 'birthday');
        expect(r.find((a) => a.anno === 'Past')).toBeTruthy();
    });

    test('Date + expireTime → Future', () => {
        const r = fieldAnnoSpec('LocalDateTime', 'expireTime');
        expect(r.find((a) => a.anno === 'Future')).toBeTruthy();
    });

    test('String + url → Pattern(URL)', () => {
        const r = fieldAnnoSpec('String', 'homepage');
        expect(r.find((a) => a.anno === 'Pattern')).toBeTruthy();
    });

    test('String + username → Pattern(中文名)', () => {
        const r = fieldAnnoSpec('String', 'username');
        const p = r.find((a) => a.anno === 'Pattern');
        expect(p).toBeTruthy();
        expect(p.params).toMatch(/u4e00/);
        expect(p.params).toMatch(/u9fa5/);
    });

    test('Boolean → 无注解', () => {
        const r = fieldAnnoSpec('Boolean', 'active');
        expect(r).toEqual([]);
    });

    test('Custom 类型 → 无注解', () => {
        const r = fieldAnnoSpec('Custom', 'whatever');
        expect(r).toEqual([]);
    });
});

// ============== inferValidations ==============

describe('inferValidations 必填与组合', () => {
    test('必填 + Integer → NotNull + Min + Max', () => {
        const r = inferValidations([{ name: 'count', type: 'Integer', required: true, custom: '' }], {});
        const names = r[0].annotations.map((a) => a.anno);
        expect(names).toContain('NotNull');
        expect(names).toContain('Min');
        expect(names).toContain('Max');
    });

    test('必填 String → NotBlank 已隐含 NotNull,不重复', () => {
        const r = inferValidations([{ name: 'username', type: 'String', required: true, custom: '' }], {});
        const notNullCount = r[0].annotations.filter((a) => a.anno === 'NotNull' || a.anno === 'NotBlank').length;
        expect(notNullCount).toBe(1);
        expect(r[0].annotations.find((a) => a.anno === 'NotBlank')).toBeTruthy();
    });

    test('自定义注解追加', () => {
        const r = inferValidations(
            [{ name: 'code', type: 'String', required: false, custom: '@Pattern(regexp = "^\\d+$")' }],
            {}
        );
        const has = r[0].annotations.find((a) => a.anno === 'Pattern');
        expect(has).toBeTruthy();
        expect(has.params).toMatch(/d/);
    });

    test('空 fields 数组 → 空结果', () => {
        expect(inferValidations([], {})).toEqual([]);
        expect(inferValidations(null, {})).toEqual([]);
    });

    test('跳过空字段名或类型', () => {
        const r = inferValidations(
            [
                { name: '', type: 'String', required: true, custom: '' },
                { name: 'username', type: '', required: true, custom: '' },
                { name: 'age', type: 'Integer', required: false, custom: '' },
            ],
            {}
        );
        expect(r).toHaveLength(1);
        expect(r[0].name).toBe('age');
    });

    test('10 字段批量推导无错', () => {
        const fields = [];
        for (let i = 0; i < 10; i++) {
            fields.push({ name: 'f' + i, type: 'String', required: i % 2 === 0, custom: '' });
        }
        const r = inferValidations(fields, {});
        expect(r).toHaveLength(10);
    });

    test('用户指定 dateType=Past 覆盖名称启发式', () => {
        const r = inferValidations([{ name: 'eventDay', type: 'LocalDate', required: false, custom: '' }], {
            dateType: 'Past',
        });
        expect(r[0].annotations.find((a) => a.anno === 'Past')).toBeTruthy();
        expect(r[0].annotations.find((a) => a.anno === 'Future')).toBeFalsy();
    });

    test('requiredNotNull=false 时必填不加 @NotNull', () => {
        const r = inferValidations([{ name: 'count', type: 'Integer', required: true, custom: '' }], {
            requiredNotNull: false,
        });
        expect(r[0].annotations.find((a) => a.anno === 'NotNull')).toBeFalsy();
    });

    test('intMax 自定义生效', () => {
        const r = inferValidations([{ name: 'quantity', type: 'Integer', required: false, custom: '' }], {
            intMax: 9999,
        });
        expect(r[0].annotations.find((a) => a.anno === 'Max').params).toBe('9999');
    });
});

// ============== collectImports ==============

describe('collectImports', () => {
    test('收集并去重', () => {
        const specs = [
            {
                name: 'a',
                type: 'String',
                typeImport: '',
                annotations: [
                    { anno: 'NotBlank', import: 'javax.validation.constraints.NotBlank' },
                    { anno: 'NotBlank', import: 'javax.validation.constraints.NotBlank' },
                ],
            },
        ];
        const r = collectImports(specs);
        expect(r.filter((x) => x === 'javax.validation.constraints.NotBlank')).toHaveLength(1);
    });

    test('按字母排序', () => {
        const specs = [
            {
                name: 'a',
                type: 'String',
                annotations: [
                    { anno: 'Size', import: 'javax.validation.constraints.Size' },
                    { anno: 'NotBlank', import: 'javax.validation.constraints.NotBlank' },
                    { anno: 'Pattern', import: 'javax.validation.constraints.Pattern' },
                ],
            },
        ];
        const r = collectImports(specs);
        expect(r).toEqual([
            'javax.validation.constraints.NotBlank',
            'javax.validation.constraints.Pattern',
            'javax.validation.constraints.Size',
        ]);
    });

    test('extras 与字段 import 合并排序', () => {
        const specs = [{ name: 'd', type: 'LocalDate', annotations: [], typeImport: 'java.time.LocalDate' }];
        const r = collectImports(specs, ['lombok.Data']);
        expect(r).toContain('lombok.Data');
        expect(r).toContain('java.time.LocalDate');
        expect(r.indexOf('java.time.LocalDate')).toBeLessThan(r.indexOf('lombok.Data'));
    });

    test('空 specs + 空 extras → 空数组', () => {
        expect(collectImports([], [])).toEqual([]);
        expect(collectImports(null, null)).toEqual([]);
    });
});

// ============== generateBean ==============

describe('generateBean 输出完整性', () => {
    test('输出含 package / import / 类头 / 字段 / getter', () => {
        const specs = inferValidations(
            [
                { name: 'username', type: 'String', required: true, custom: '' },
                { name: 'age', type: 'Integer', required: false, custom: '' },
            ],
            {}
        );
        const code = generateBean('com.example.dto', 'UserDTO', specs, {
            lombokData: true,
            getterSetter: true,
            validated: false,
        });
        expect(code).toContain('package com.example.dto;');
        expect(code).toMatch(/import javax\.validation\.constraints\.NotBlank;/);
        expect(code).toMatch(/import javax\.validation\.constraints\.Size;/);
        expect(code).toMatch(/import javax\.validation\.constraints\.Min;/);
        expect(code).toContain('import lombok.Data;');
        expect(code).toContain('@Data');
        expect(code).toContain('public class UserDTO {');
        expect(code).toContain('private String username;');
        expect(code).toContain('private Integer age;');
        expect(code).toContain('public String getUsername()');
        expect(code).toContain('public void setUsername(String username)');
        expect(code).toContain('public Integer getAge()');
    });

    test('validated=true 时类级加 @Validated', () => {
        const code = generateBean('', 'X', [], { validated: true });
        expect(code).toContain('@Validated');
        expect(code).toContain('import org.springframework.validation.annotation.Validated;');
    });

    test('lombokData=false 时不加 @Data', () => {
        const code = generateBean('', 'X', [], { lombokData: false });
        expect(code).not.toContain('@Data');
        expect(code).not.toContain('import lombok.Data');
    });

    test('getterSetter=false 时不生成 getter/setter', () => {
        const specs = inferValidations([{ name: 'a', type: 'String', required: false, custom: '' }], {});
        const code = generateBean('', 'X', specs, { getterSetter: false });
        expect(code).not.toContain('public String getA()');
    });

    test('空字段列表仍输出合法类', () => {
        const code = generateBean('p', 'Empty', [], {});
        expect(code).toContain('public class Empty');
        expect(code.trim().endsWith('}')).toBe(true);
    });

    test('5 字段 UserDTO 真实样例 (username/email/age/birthday/salary)', () => {
        const fields = [
            { name: 'username', type: 'String', required: true, custom: '' },
            { name: 'email', type: 'String', required: true, custom: '' },
            { name: 'age', type: 'Integer', required: false, custom: '' },
            { name: 'birthday', type: 'LocalDate', required: false, custom: '' },
            { name: 'salary', type: 'BigDecimal', required: false, custom: '' },
        ];
        const specs = inferValidations(fields, {});
        const code = generateBean('com.example.demo.dto', 'UserDTO', specs, {
            lombokData: true,
            getterSetter: true,
            validated: true,
        });
        expect(code).toContain('@Validated');
        expect(code).toContain('@Data');
        expect(code).toContain('@NotBlank');
        expect(code).toContain('@Size');
        expect(code).toContain('@Email');
        expect(code).toContain('@Max(150)');
        expect(code).toContain('@Past');
        expect(code).toContain('@Digits');
        expect(code).toContain('import java.math.BigDecimal;');
        expect(code).toContain('import java.time.LocalDate;');
        expect(code).toContain('public class UserDTO');
        expect(code).toContain('private String username;');
        expect(code).toContain('private BigDecimal salary;');
        expect(code).toContain('public LocalDate getBirthday()');
    });
});

// ============== parseCustomAnnotations ==============

describe('parseCustomAnnotations', () => {
    test('单注解', () => {
        const r = parseCustomAnnotations('@Pattern(regexp = "^\\d+$")');
        expect(r).toHaveLength(1);
        expect(r[0].anno).toBe('Pattern');
        expect(r[0].params).toMatch(/d\+/);
    });

    test('多行注解', () => {
        const text = ['@Pattern(regexp = "^[a-z]+$")', '@Size(min = 1, max = 50)'].join('\n');
        const r = parseCustomAnnotations(text);
        expect(r).toHaveLength(2);
        expect(r[0].anno).toBe('Pattern');
        expect(r[1].anno).toBe('Size');
    });

    test('忽略非 @ 开头行', () => {
        const r = parseCustomAnnotations('not annotation\n@Min(0)');
        expect(r).toHaveLength(1);
        expect(r[0].anno).toBe('Min');
    });

    test('空文本返回空数组', () => {
        expect(parseCustomAnnotations('')).toEqual([]);
        expect(parseCustomAnnotations(null)).toEqual([]);
    });
});

// ============== renderAnnotation / dedupAnnos ==============

describe('renderAnnotation / dedupAnnos', () => {
    test('renderAnnotation 无参数', () => {
        expect(renderAnnotation({ anno: 'NotNull' })).toBe('@NotNull');
    });

    test('renderAnnotation 带参数', () => {
        expect(renderAnnotation({ anno: 'Size', params: 'max = 10' })).toBe('@Size(max = 10)');
    });

    test('dedupAnnos 按 anno+params 去重', () => {
        const arr = [
            { anno: 'Min', params: '0', import: 'x' },
            { anno: 'Min', params: '0', import: 'x' },
            { anno: 'Min', params: '1', import: 'x' },
        ];
        const r = dedupAnnos(arr);
        expect(r).toHaveLength(2);
    });
});
