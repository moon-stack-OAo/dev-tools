delete require.cache[require.resolve('./js/codegen/beanval.js')];
const m = require('./js/codegen/beanval.js');
const tests = [
    'private String username;',
    'public Integer age;',
    'protected static final String NAME;',
    'private transient Boolean active;',
    'private java.time.LocalDate birthday;',
];
for (const t of tests) {
    const r = m.parseJavaFields(t);
    console.log(JSON.stringify(t), '->', JSON.stringify(r));
}
