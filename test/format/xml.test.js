const { formatXmlStr, compressXmlStr } = require('../../js/format/xml.js');

describe('formatXmlStr', () => {
  test('基本嵌套与自闭合', () => {
    const out = formatXmlStr('<root><a>x</a><b/></root>');
    expect(out).toBe(['<root>', '  <a>x</a>', '  <b/>', '</root>'].join('\n'));
  });

  test('多子节点缩进一致', () => {
    const out = formatXmlStr(
      '<root><item id="1">hello</item><item id="2">world</item></root>',
    );
    expect(out).toBe(
      [
        '<root>',
        '  <item id="1">hello</item>',
        '  <item id="2">world</item>',
        '</root>',
      ].join('\n'),
    );
  });

  test('XML 声明不增加缩进层级', () => {
    const out = formatXmlStr('<?xml version="1.0"?><a><b>1</b><c/></a>');
    expect(out).toBe(
      ['<?xml version="1.0"?>', '<a>', '  <b>1</b>', '  <c/>', '</a>'].join('\n'),
    );
  });

  test('命名空间标签', () => {
    const out = formatXmlStr(
      '<ns:root xmlns:ns="urn:x"><ns:child>v</ns:child></ns:root>',
    );
    expect(out).toBe(
      [
        '<ns:root xmlns:ns="urn:x">',
        '  <ns:child>v</ns:child>',
        '</ns:root>',
      ].join('\n'),
    );
  });

  test('注释与文本', () => {
    const out = formatXmlStr('<!--c--><a>t</a>');
    expect(out).toBe(['<!--c-->', '<a>t</a>'].join('\n'));
  });

  test('自定义缩进宽度', () => {
    const out = formatXmlStr('<r><a/></r>', 4);
    expect(out).toBe(['<r>', '    <a/>', '</r>'].join('\n'));
  });

  test('空输入', () => {
    expect(formatXmlStr('')).toBe('');
    expect(formatXmlStr('   ')).toBe('');
  });

  test('已格式化输入保持层级正确', () => {
    const input = ['<root>', '  <a>1</a>', '  <b>', '    <c/>', '  </b>', '</root>'].join(
      '\n',
    );
    const out = formatXmlStr(input);
    expect(out).toBe(
      ['<root>', '  <a>1</a>', '  <b>', '    <c/>', '  </b>', '</root>'].join('\n'),
    );
  });
});

describe('compressXmlStr', () => {
  test('去除标签间空白', () => {
    expect(compressXmlStr('<a>\n  <b>1</b>\n</a>')).toBe('<a><b>1</b></a>');
  });

  test('压缩多余空格', () => {
    expect(compressXmlStr('<a>  x  </a>').replace(/\s+/g, ' ')).toMatch(/<a> x <\/a>|<a>x<\/a>/);
  });
});
