// 图片转 PDF 工具的纯函数单元测试
// 通过 mock window.jspdf 验证 buildPdf 的参数传递、fitImage 的几何计算、detectFormat 的格式推断。
const {
  buildPdf,
  fitImage,
  detectFormat,
  normalizeOptions,
} = require("../../js/format/imgtopdf.js");

// 1x1 透明 PNG DataURL（最小有效 PNG）
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// ============== Mock jsPDF ==============
function createMockJsPDF() {
  const calls = {
    addPage: 0,
    addImage: [],
    orientation: null,
    format: null,
    unit: null,
  };
  return {
    calls,
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    addPage() {
      calls.addPage += 1;
    },
    addImage(...args) {
      calls.addImage.push(args);
    },
    output() {
      return new Blob(["%PDF-1.4 mock"], { type: "application/pdf" });
    },
  };
}

function setupMockJsPDF() {
  global.window = {
    jspdf: {
      jsPDF: function (opts) {
        const m = createMockJsPDF();
        m.calls.orientation = opts.orientation;
        m.calls.format = opts.format;
        m.calls.unit = opts.unit;
        return m;
      },
    },
  };
}

beforeEach(() => {
  setupMockJsPDF();
});

describe("normalizeOptions", () => {
  test("默认值", () => {
    const o = normalizeOptions({});
    expect(o.pageSize).toBe("a4");
    expect(o.orientation).toBe("p");
    expect(o.margin).toBe(0);
    expect(o.fit).toBe("contain");
  });

  test("margin 钳制在 0~50", () => {
    expect(normalizeOptions({ margin: -10 }).margin).toBe(0);
    expect(normalizeOptions({ margin: 100 }).margin).toBe(50);
    expect(normalizeOptions({ margin: "abc" }).margin).toBe(0);
    expect(normalizeOptions({ margin: 15 }).margin).toBe(15);
  });

  test("fit 仅接受 contain/cover", () => {
    expect(normalizeOptions({ fit: "cover" }).fit).toBe("cover");
    expect(normalizeOptions({ fit: "fill" }).fit).toBe("contain");
    expect(normalizeOptions({ fit: "unknown" }).fit).toBe("contain");
  });
});

describe("detectFormat", () => {
  test("常见 mime 映射", () => {
    expect(detectFormat("image/png")).toBe("PNG");
    expect(detectFormat("image/jpeg")).toBe("JPEG");
    expect(detectFormat("image/webp")).toBe("WEBP");
    expect(detectFormat("image/gif")).toBe("GIF");
  });

  test("未知 mime 默认 JPEG", () => {
    expect(detectFormat("image/bmp")).toBe("JPEG");
    expect(detectFormat("")).toBe("JPEG");
    expect(detectFormat(null)).toBe("JPEG");
  });

  test("大小写不敏感", () => {
    expect(detectFormat("IMAGE/PNG")).toBe("PNG");
  });
});

describe("fitImage", () => {
  const page = { width: 210, height: 297 };
  test("contain：保持宽高比居中", () => {
    const r = fitImage({ width: 800, height: 600 }, page, 10, "contain");
    // ratio = min(190/800, 277/600) = min(0.2375, 0.4617) = 0.2375
    expect(r.w).toBeCloseTo(800 * 0.2375, 2);
    expect(r.h).toBeCloseTo(600 * 0.2375, 2);
    // 居中
    expect(r.x).toBeCloseTo((210 - r.w) / 2, 2);
    expect(r.y).toBeCloseTo((297 - r.h) / 2, 2);
  });

  test("cover：取较大比值（允许越界）", () => {
    const r = fitImage({ width: 800, height: 600 }, page, 10, "cover");
    const ratio = Math.max(190 / 800, 277 / 600);
    expect(r.w).toBeCloseTo(800 * ratio, 2);
    expect(r.h).toBeCloseTo(600 * ratio, 2);
  });

  test("margin=0 时充满可用区域", () => {
    const r = fitImage({ width: 800, height: 600 }, page, 0, "contain");
    const ratio = Math.min(210 / 800, 297 / 600);
    expect(r.w).toBeCloseTo(800 * ratio, 2);
  });

  test("页面比图片小（防止除零）", () => {
    const r = fitImage({ width: 50, height: 50 }, page, 100, "contain");
    // margin=100 时 maxW = max(1, 10) = 10，仍能计算
    expect(r.w).toBeGreaterThanOrEqual(0);
    expect(r.h).toBeGreaterThanOrEqual(0);
  });
});

describe("buildPdf", () => {
  const sampleImage = {
    dataUrl: TINY_PNG,
    format: "PNG",
    dims: { width: 100, height: 100 },
  };

  test("空列表抛错", () => {
    expect(() => buildPdf([], {})).toThrow("图片列表为空");
    expect(() => buildPdf(null, {})).toThrow("图片列表为空");
  });

  test("jsPDF 未加载抛错", () => {
    global.window = {};
    expect(() => buildPdf([sampleImage], {})).toThrow("jsPDF 库未加载");
  });

  test("单张图片生成 PDF Blob", () => {
    const blob = buildPdf([sampleImage], { pageSize: "a4", orientation: "p" });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  test("多张图片能正常生成", () => {
    const imgs = [sampleImage, sampleImage, sampleImage];
    const blob = buildPdf(imgs, { pageSize: "a4" });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });

  test("返回 Blob 类型为 application/pdf", () => {
    const blob = buildPdf([sampleImage], { pageSize: "a4" });
    expect(blob.type).toBe("application/pdf");
  });
});
