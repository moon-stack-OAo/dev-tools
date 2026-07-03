// PDF 合并/拆分工具的纯函数单元测试
// 重点覆盖：parsePageRanges 解析规则、expandRanges 区间展开、PDF 操作的参数传递与异常处理。
const {
  parsePageRanges,
  expandRanges,
  mergePdfs,
  splitPdf,
  splitPdfMultiple,
  getPageCount,
} = require("../../js/format/pdfmerge.js");

// ============== Mock pdf-lib ==============
function createMockPdfLib(pageCount = 2) {
  const calls = {
    loadCount: 0,
    createCount: 0,
    saveCount: 0,
    copyCalls: [],
    addPageCount: 0,
    loadedSizes: [],
  };

  function makeDoc() {
    return {
      _pages: pageCount,
      getPageCount() {
        return this._pages;
      },
      getPageIndices() {
        return Array.from({ length: this._pages }, (_, i) => i);
      },
      copyPages: jest.fn(async (_src, indices) => {
        calls.copyCalls.push(indices.slice());
        return indices.map((i) => ({ _idx: i }));
      }),
      addPage(_p) {
        calls.addPageCount += 1;
      },
      save: jest.fn(async () => {
        calls.saveCount += 1;
        return new Uint8Array([0x25, 0x50, 0x44, 0x46, pageCount]); // %PDF + pageCount
      }),
    };
  }

  return {
    calls,
    PDFDocument: {
      create: jest.fn(() => {
        calls.createCount += 1;
        return makeDoc();
      }),
      load: jest.fn(async (bytes) => {
        calls.loadCount += 1;
        calls.loadedSizes.push(bytes.length);
        return makeDoc();
      }),
    },
  };
}

function setupMock(mockLib) {
  global.window = { PDFLib: mockLib };
}

beforeEach(() => {
  // 默认 mock：每份 2 页
  const mock = createMockPdfLib(2);
  setupMock(mock);
});

// ============== parsePageRanges ==============
describe("parsePageRanges", () => {
  test("解析单页", () => {
    expect(parsePageRanges("5")).toEqual([[5, 5]]);
    expect(parsePageRanges("1")).toEqual([[1, 1]]);
  });

  test("解析区间", () => {
    expect(parsePageRanges("1-3")).toEqual([[1, 3]]);
    expect(parsePageRanges("10-20")).toEqual([[10, 20]]);
  });

  test("解析多段", () => {
    expect(parsePageRanges("1-3,5,7-9")).toEqual([
      [1, 3],
      [5, 5],
      [7, 9],
    ]);
  });

  test("支持空格容错", () => {
    expect(parsePageRanges(" 1 - 3 , 5 ")).toEqual([
      [1, 3],
      [5, 5],
    ]);
    expect(parsePageRanges("  ")).toEqual([]);
  });

  test("空字符串/null/undefined 返回空数组", () => {
    expect(parsePageRanges("")).toEqual([]);
    expect(parsePageRanges(null)).toEqual([]);
    expect(parsePageRanges(undefined)).toEqual([]);
    expect(parsePageRanges(123)).toEqual([]);
  });

  test("非法格式抛错", () => {
    expect(() => parsePageRanges("abc")).toThrow("无效的页码段");
    expect(() => parsePageRanges("1-")).toThrow("无效的页码段");
    expect(() => parsePageRanges("-3")).toThrow("无效的页码段");
    expect(() => parsePageRanges("1.5")).toThrow("无效的页码段");
    expect(() => parsePageRanges("1,abc,3")).toThrow("无效的页码段");
  });

  test("结束页小于起始页抛错", () => {
    expect(() => parsePageRanges("5-3")).toThrow("结束页不能小于起始页");
  });

  test("页码从 0 抛错", () => {
    expect(() => parsePageRanges("0")).toThrow("页码必须从 1 开始");
    expect(() => parsePageRanges("0-5")).toThrow("页码必须从 1 开始");
  });
});

// ============== expandRanges ==============
describe("expandRanges", () => {
  test("单页展开", () => {
    expect(expandRanges([[3, 3]], 10)).toEqual([2]);
  });

  test("区间展开为 0-based 数组", () => {
    expect(expandRanges([[1, 3]], 10)).toEqual([0, 1, 2]);
    expect(expandRanges([[2, 4]], 10)).toEqual([1, 2, 3]);
  });

  test("多段合并去重", () => {
    expect(
      expandRanges(
        [
          [1, 3],
          [2, 5],
        ],
        10,
      ),
    ).toEqual([0, 1, 2, 3, 4]);
  });

  test("区间越界自动裁剪", () => {
    expect(expandRanges([[1, 100]], 5)).toEqual([0, 1, 2, 3, 4]);
    expect(expandRanges([[3, 100]], 5)).toEqual([2, 3, 4]);
  });

  test("区间全部越界返回空数组", () => {
    expect(expandRanges([[100, 200]], 5)).toEqual([]);
  });

  test("跨段部分越界", () => {
    expect(
      expandRanges(
        [
          [3, 100],
          [1, 2],
        ],
        5,
      ),
    ).toEqual([2, 3, 4, 0, 1]);
  });

  test("空 ranges 返回空数组", () => {
    expect(expandRanges([], 10)).toEqual([]);
  });

  test("非法 totalPages 抛错", () => {
    expect(() => expandRanges([[1, 3]], 0)).toThrow("totalPages 必须为正整数");
    expect(() => expandRanges([[1, 3]], -1)).toThrow("totalPages 必须为正整数");
    expect(() => expandRanges([[1, 3]], 1.5)).toThrow(
      "totalPages 必须为正整数",
    );
  });

  test("非法 ranges 类型抛错", () => {
    expect(() => expandRanges(null, 10)).toThrow("ranges 必须是数组");
    expect(() => expandRanges("abc", 10)).toThrow("ranges 必须是数组");
  });
});

// ============== mergePdfs ==============
describe("mergePdfs", () => {
  test("空列表抛错", async () => {
    await expect(mergePdfs([])).rejects.toThrow("PDF 列表为空");
    await expect(mergePdfs(null)).rejects.toThrow("PDF 列表为空");
  });

  test("非 Uint8Array 抛错", async () => {
    await expect(mergePdfs(["not bytes"])).rejects.toThrow(
      "不是有效的 PDF 字节数据",
    );
    await expect(mergePdfs([new ArrayBuffer(10)])).rejects.toThrow(
      "不是有效的 PDF 字节数据",
    );
  });

  test("pdf-lib 未加载抛错", async () => {
    global.window = {};
    await expect(mergePdfs([new Uint8Array(10)])).rejects.toThrow(
      "pdf-lib 库未加载",
    );
  });

  test("合并多 PDF 返回 Uint8Array", async () => {
    const list = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
    const out = await mergePdfs(list);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);
    // 3 段调用：load (2) + create (1) + save (1)
    const mock = global.window.PDFLib;
    expect(mock.PDFDocument.load).toHaveBeenCalledTimes(2);
    expect(mock.PDFDocument.create).toHaveBeenCalledTimes(1);
  });

  test("按顺序复制所有页面", async () => {
    // 自定义 3 页 PDF
    const mock = createMockPdfLib(3);
    setupMock(mock);
    const list = [new Uint8Array([1, 2, 3])];
    await mergePdfs(list);
    expect(mock.calls.copyCalls[0]).toEqual([0, 1, 2]);
  });
});

// ============== splitPdf ==============
describe("splitPdf", () => {
  test("非法字节抛错", async () => {
    await expect(splitPdf(null, [[1, 1]])).rejects.toThrow("PDF 字节数据无效");
    await expect(splitPdf("not bytes", [[1, 1]])).rejects.toThrow(
      "PDF 字节数据无效",
    );
  });

  test("空 ranges 抛错", async () => {
    await expect(splitPdf(new Uint8Array(10), [])).rejects.toThrow(
      "页码范围为空",
    );
    await expect(splitPdf(new Uint8Array(10), null)).rejects.toThrow(
      "页码范围为空",
    );
  });

  test("pdf-lib 未加载抛错", async () => {
    global.window = {};
    await expect(splitPdf(new Uint8Array(10), [[1, 1]])).rejects.toThrow(
      "pdf-lib 库未加载",
    );
  });

  test("单段区间拆分", async () => {
    const out = await splitPdf(new Uint8Array([1, 2, 3]), [[1, 2]]);
    expect(out).toBeInstanceOf(Uint8Array);
    const mock = global.window.PDFLib;
    expect(mock.calls.copyCalls[0]).toEqual([0, 1]);
  });

  test("多段区间合并为一个 PDF", async () => {
    const out = await splitPdf(new Uint8Array([1]), [
      [1, 1],
      [2, 2],
    ]);
    expect(out).toBeInstanceOf(Uint8Array);
    const mock = global.window.PDFLib;
    // 单次 copyPages 调用，传入合并去重的 [0, 1]
    expect(mock.calls.copyCalls[0]).toEqual([0, 1]);
  });

  test("区间越界裁剪", async () => {
    const out = await splitPdf(new Uint8Array([1]), [[1, 100]]);
    expect(out).toBeInstanceOf(Uint8Array);
    // mock 是 2 页，越界裁剪为 [0, 1]
    const mock = global.window.PDFLib;
    expect(mock.calls.copyCalls[0]).toEqual([0, 1]);
  });

  test("所有页码越界抛错", async () => {
    await expect(splitPdf(new Uint8Array([1]), [[100, 200]])).rejects.toThrow(
      "没有有效的页码落在文档范围内",
    );
  });
});

// ============== splitPdfMultiple ==============
describe("splitPdfMultiple", () => {
  test("空 ranges 抛错", async () => {
    await expect(splitPdfMultiple(new Uint8Array(10), [])).rejects.toThrow(
      "页码范围为空",
    );
  });

  test("按段独立输出多个 PDF", async () => {
    // 自定义 5 页
    const mock = createMockPdfLib(5);
    setupMock(mock);
    const outs = await splitPdfMultiple(new Uint8Array([1]), [
      [1, 2],
      [4, 5],
    ]);
    expect(outs).toHaveLength(2);
    expect(outs[0]).toBeInstanceOf(Uint8Array);
    expect(outs[1]).toBeInstanceOf(Uint8Array);
    // 每次 copyPages 调用对应一段
    expect(mock.calls.copyCalls[0]).toEqual([0, 1]);
    expect(mock.calls.copyCalls[1]).toEqual([3, 4]);
  });

  test("区间越界裁剪", async () => {
    const mock = createMockPdfLib(5);
    setupMock(mock);
    const outs = await splitPdfMultiple(new Uint8Array([1]), [[1, 100]]);
    expect(outs).toHaveLength(1);
    expect(mock.calls.copyCalls[0]).toEqual([0, 1, 2, 3, 4]);
  });

  test("所有段都越界抛错", async () => {
    await expect(
      splitPdfMultiple(new Uint8Array([1]), [
        [100, 200],
        [300, 400],
      ]),
    ).rejects.toThrow("没有有效的页码落在文档范围内");
  });
});

// ============== getPageCount ==============
describe("getPageCount", () => {
  test("返回页数", async () => {
    const n = await getPageCount(new Uint8Array([1, 2, 3]));
    expect(n).toBe(2); // mock 默认 2 页
  });

  test("非法字节抛错", async () => {
    await expect(getPageCount(null)).rejects.toThrow("PDF 字节数据无效");
    await expect(getPageCount("bytes")).rejects.toThrow("PDF 字节数据无效");
  });

  test("pdf-lib 未加载抛错", async () => {
    global.window = {};
    await expect(getPageCount(new Uint8Array(10))).rejects.toThrow(
      "pdf-lib 库未加载",
    );
  });
});
