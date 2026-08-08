const {
  generateGilbertCurve,
  scrambleImageData,
  fitImageSize,
  IMS_MAX_SIDE,
  IMS_MAX_PIXELS,
} = require("../../js/generate/imgshuffle.js");

function makeImageData(w, h, fillFn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (fillFn) {
        const p = fillFn(x, y, i);
        data[i] = p[0];
        data[i + 1] = p[1];
        data[i + 2] = p[2];
        data[i + 3] = p[3];
      } else {
        data[i] = (x * 17 + y * 31) & 255;
        data[i + 1] = (x * 13 + y * 7) & 255;
        data[i + 2] = (x * 3 + y * 11) & 255;
        data[i + 3] = 255;
      }
    }
  }
  return { width: w, height: h, data };
}

function assertCurveValid(w, h) {
  const { xs, ys } = generateGilbertCurve(w, h);
  expect(xs.length).toBe(w * h);
  expect(ys.length).toBe(w * h);
  const seen = new Set();
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(w);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(h);
    const key = x + "," + y;
    expect(seen.has(key)).toBe(false);
    seen.add(key);
  }
  expect(seen.size).toBe(w * h);
}

function pixelsEqual(a, b) {
  if (a.width !== b.width || a.height !== b.height) return false;
  if (a.data.length !== b.data.length) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) return false;
  }
  return true;
}

describe("generateGilbertCurve", () => {
  test("3x2 全覆盖无重复", () => {
    assertCurveValid(3, 2);
  });

  test("4x4 全覆盖无重复", () => {
    assertCurveValid(4, 4);
  });

  test("8x5 全覆盖无重复", () => {
    assertCurveValid(8, 5);
  });

  test("1x1 / 1x5 / 5x1", () => {
    assertCurveValid(1, 1);
    assertCurveValid(1, 5);
    assertCurveValid(5, 1);
  });

  test("7x3 与 3x7", () => {
    assertCurveValid(7, 3);
    assertCurveValid(3, 7);
  });

  test("0 尺寸返回空", () => {
    const r = generateGilbertCurve(0, 4);
    expect(r.xs.length).toBe(0);
    expect(r.ys.length).toBe(0);
  });
});

describe("scrambleImageData", () => {
  test("偶数次后完全还原（4x4）", () => {
    const orig = makeImageData(4, 4);
    const s1 = scrambleImageData(orig);
    expect(pixelsEqual(s1, orig)).toBe(false);
    const s2 = scrambleImageData(s1);
    expect(pixelsEqual(s2, orig)).toBe(true);
  });

  test("偶数次后完全还原（3x2）", () => {
    const orig = makeImageData(3, 2);
    const s2 = scrambleImageData(scrambleImageData(orig));
    expect(pixelsEqual(s2, orig)).toBe(true);
  });

  test("偶数次后完全还原（8x5）", () => {
    const orig = makeImageData(8, 5);
    let cur = orig;
    for (let i = 0; i < 4; i++) cur = scrambleImageData(cur);
    expect(pixelsEqual(cur, orig)).toBe(true);
  });

  test("奇数次不等于原图（非全同色）", () => {
    const orig = makeImageData(5, 4);
    const s1 = scrambleImageData(orig);
    const s3 = scrambleImageData(scrambleImageData(s1));
    expect(pixelsEqual(s1, orig)).toBe(false);
    expect(pixelsEqual(s3, orig)).toBe(false);
    expect(pixelsEqual(s1, s3)).toBe(true);
  });

  test("不修改原 ImageData", () => {
    const orig = makeImageData(4, 3);
    const copy = new Uint8ClampedArray(orig.data);
    scrambleImageData(orig);
    expect(Array.from(orig.data)).toEqual(Array.from(copy));
  });
});

describe("fitImageSize", () => {
  test("小图不缩放", () => {
    const r = fitImageSize(800, 600);
    expect(r.w).toBe(800);
    expect(r.h).toBe(600);
    expect(r.scaled).toBe(false);
  });

  test("单边超限等比缩小", () => {
    const r = fitImageSize(8000, 2000, 4000, 8e6);
    expect(r.scaled).toBe(true);
    expect(Math.max(r.w, r.h)).toBeLessThanOrEqual(4000);
    expect(r.w / r.h).toBeCloseTo(8000 / 2000, 1);
  });

  test("总像素超限", () => {
    const r = fitImageSize(4000, 3000, 4000, 8e6);
    expect(r.scaled).toBe(true);
    expect(r.w * r.h).toBeLessThanOrEqual(8e6);
    expect(Math.max(r.w, r.h)).toBeLessThanOrEqual(4000);
  });

  test("默认常量", () => {
    expect(IMS_MAX_SIDE).toBe(4000);
    expect(IMS_MAX_PIXELS).toBe(8000000);
  });
});
