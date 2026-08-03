const {
    springBindingConvert,
    springBindingTokenize,
    springBindingFromTokens,
} = require('../../js/generate/springbinding.js');

describe('springBindingTokenize', () => {
    test('kebab / snake / camel / env', () => {
        expect(springBindingTokenize('my-prop-name')).toEqual(['my', 'prop', 'name']);
        expect(springBindingTokenize('my_prop_name')).toEqual(['my', 'prop', 'name']);
        expect(springBindingTokenize('myPropName')).toEqual(['my', 'prop', 'name']);
        expect(springBindingTokenize('MY_PROP_NAME')).toEqual(['my', 'prop', 'name']);
        expect(springBindingTokenize('my.prop-name')).toEqual(['my', 'prop', 'name']);
    });

    test('点分路径', () => {
        expect(springBindingTokenize('spring.datasource.url')).toEqual([
            'spring',
            'datasource',
            'url',
        ]);
    });
});

describe('springBindingConvert', () => {
    test('输出多种形式', () => {
        const r = springBindingConvert('my.prop-name');
        expect(r.ok).toBe(true);
        expect(r.results.camel).toBe('myPropName');
        expect(r.results.kebab).toBe('my-prop-name');
        expect(r.results.snake).toBe('my_prop_name');
        expect(r.results.env).toBe('MY_PROP_NAME');
        expect(r.results.canonical).toBe('my.prop.name');
        expect(r.results.systemProp).toBe('my.prop.name');
    });

    test('ENV 输入归一化', () => {
        const r = springBindingConvert('SPRING_DATASOURCE_URL');
        expect(r.ok).toBe(true);
        expect(r.results.kebab).toBe('spring-datasource-url');
        expect(r.results.camel).toBe('springDatasourceUrl');
        expect(r.results.env).toBe('SPRING_DATASOURCE_URL');
    });

    test('camel 输入', () => {
        const r = springBindingConvert('myPropName');
        expect(r.results.kebab).toBe('my-prop-name');
        expect(r.results.env).toBe('MY_PROP_NAME');
    });

    test('target 指定', () => {
        const r = springBindingConvert('my-prop-name', 'env');
        expect(r.ok).toBe(true);
        expect(r.primary).toBe('MY_PROP_NAME');
    });

    test('空与非法', () => {
        expect(springBindingConvert('').ok).toBe(false);
        expect(springBindingConvert(null).ok).toBe(false);
        expect(springBindingConvert('   ').ok).toBe(false);
    });

    test('fromTokens', () => {
        const r = springBindingFromTokens(['a', 'b', 'c']);
        expect(r.camel).toBe('aBC');
        expect(r.kebab).toBe('a-b-c');
    });
});
