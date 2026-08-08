// 图片混淆：Gilbert 曲线可逆像素置换（纯前端 Canvas）

const IMS_MAX_SIDE = 4000;
const IMS_MAX_PIXELS = 8000000;

/** @type {{ file: File, name: string, origUrl: string, origW: number, origH: number, canvas: HTMLCanvasElement, scaled: boolean, scrambleCount: number } | null} */
let imsState = null;
let imsResultUrl = null;

function imsSgn(x) {
    return x < 0 ? -1 : x > 0 ? 1 : 0;
}

/**
 * 生成 Gilbert 曲线坐标序列（jakubcerveny/gilbert 2D 递归实现）
 * @param {number} width
 * @param {number} height
 * @returns {{ xs: Int32Array, ys: Int32Array }}
 */
function generateGilbertCurve(width, height) {
    const w = width | 0;
    const h = height | 0;
    if (w <= 0 || h <= 0) {
        return { xs: new Int32Array(0), ys: new Int32Array(0) };
    }
    const n = w * h;
    const xs = new Int32Array(n);
    const ys = new Int32Array(n);
    let idx = 0;

    function generate2d(x, y, ax, ay, bx, by) {
        const aw = Math.abs(ax + ay);
        const ah = Math.abs(bx + by);
        const dax = imsSgn(ax);
        const day = imsSgn(ay);
        const dbx = imsSgn(bx);
        const dby = imsSgn(by);

        if (ah === 1) {
            for (let i = 0; i < aw; i++) {
                xs[idx] = x;
                ys[idx] = y;
                idx++;
                x += dax;
                y += day;
            }
            return;
        }
        if (aw === 1) {
            for (let i = 0; i < ah; i++) {
                xs[idx] = x;
                ys[idx] = y;
                idx++;
                x += dbx;
                y += dby;
            }
            return;
        }

        let ax2 = Math.floor(ax / 2);
        let ay2 = Math.floor(ay / 2);
        let bx2 = Math.floor(bx / 2);
        let by2 = Math.floor(by / 2);

        const w2 = Math.abs(ax2 + ay2);
        const h2 = Math.abs(bx2 + by2);

        if (2 * aw > 3 * ah) {
            if (w2 % 2 && aw > 2) {
                ax2 += dax;
                ay2 += day;
            }
            generate2d(x, y, ax2, ay2, bx, by);
            generate2d(x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by);
        } else {
            if (h2 % 2 && ah > 2) {
                bx2 += dbx;
                by2 += dby;
            }
            generate2d(x, y, bx2, by2, ax2, ay2);
            generate2d(x + bx2, y + by2, ax, ay, bx - bx2, by - by2);
            generate2d(
                x + (ax - dax) + (bx2 - dbx),
                y + (ay - day) + (by2 - dby),
                -bx2,
                -by2,
                -(ax - ax2),
                -(ay - ay2),
            );
        }
    }

    if (w >= h) {
        generate2d(0, 0, w, 0, 0, h);
    } else {
        generate2d(0, 0, 0, h, w, 0);
    }
    return { xs, ys };
}

/**
 * 等比缩小到合规尺寸
 * @param {number} w
 * @param {number} h
 * @param {number} [maxSide=4000]
 * @param {number} [maxPixels=8e6]
 * @returns {{ w: number, h: number, scaled: boolean }}
 */
function fitImageSize(w, h, maxSide, maxPixels) {
    const ms = maxSide == null ? IMS_MAX_SIDE : maxSide;
    const mp = maxPixels == null ? IMS_MAX_PIXELS : maxPixels;
    let nw = Math.max(1, Math.round(w));
    let nh = Math.max(1, Math.round(h));
    let scaled = false;

    if (nw > ms || nh > ms) {
        const scale = ms / Math.max(nw, nh);
        nw = Math.max(1, Math.round(nw * scale));
        nh = Math.max(1, Math.round(nh * scale));
        scaled = true;
    }
    if (nw * nh > mp) {
        const scale = Math.sqrt(mp / (nw * nh));
        nw = Math.max(1, Math.round(nw * scale));
        nh = Math.max(1, Math.round(nh * scale));
        scaled = true;
        if (nw > ms || nh > ms) {
            const s2 = ms / Math.max(nw, nh);
            nw = Math.max(1, Math.round(nw * s2));
            nh = Math.max(1, Math.round(nh * s2));
        }
        while (nw * nh > mp && (nw > 1 || nh > 1)) {
            if (nw >= nh && nw > 1) nw--;
            else if (nh > 1) nh--;
            else break;
            scaled = true;
        }
    }
    return { w: nw, h: nh, scaled };
}

/**
 * 沿 Gilbert 曲线顺序读像素，再按曲线逆序写回（自逆置换：做两次还原）
 * @param {{ width: number, height: number, data: Uint8ClampedArray|Uint8Array }} imageData
 * @returns {{ width: number, height: number, data: Uint8ClampedArray }}
 */
function scrambleImageData(imageData) {
    const width = imageData.width | 0;
    const height = imageData.height | 0;
    const src = imageData.data;
    const n = width * height;
    const out = new Uint8ClampedArray(src.length);
    if (n === 0) {
        return imsMakeImageData(width, height, out);
    }
    const { xs, ys } = generateGilbertCurve(width, height);
    // 沿曲线读到缓冲，再逆序写回同一曲线位置
    const buf = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
        const si = (ys[i] * width + xs[i]) * 4;
        const di = i * 4;
        buf[di] = src[si];
        buf[di + 1] = src[si + 1];
        buf[di + 2] = src[si + 2];
        buf[di + 3] = src[si + 3];
    }
    for (let i = 0; i < n; i++) {
        const di = (ys[i] * width + xs[i]) * 4;
        const si = (n - 1 - i) * 4;
        out[di] = buf[si];
        out[di + 1] = buf[si + 1];
        out[di + 2] = buf[si + 2];
        out[di + 3] = buf[si + 3];
    }
    return imsMakeImageData(width, height, out);
}

function imsMakeImageData(width, height, data) {
    if (typeof ImageData !== "undefined") {
        try {
            return new ImageData(data, width, height);
        } catch (e) {
            // 部分环境不接受 Uint8ClampedArray 构造
        }
    }
    return { width: width, height: height, data: data };
}

function imsFormatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(2) + " MB";
}

function imsBaseName(name) {
    const i = name.lastIndexOf(".");
    return i > 0 ? name.substring(0, i) : name;
}

function imsGetFormat() {
    const el = document.getElementById("imsFormat");
    return el ? el.value : "image/jpeg";
}

function imsGetQuality() {
    const el = document.getElementById("imsQuality");
    const v = el ? parseInt(el.value, 10) : 95;
    return Math.min(100, Math.max(1, isNaN(v) ? 95 : v)) / 100;
}

function imsUpdateQualityLabel() {
    const q = document.getElementById("imsQuality");
    const lab = document.getElementById("imsQualityVal");
    if (q && lab) lab.textContent = q.value;
}

function imsOnFormatChange() {
    const fmt = imsGetFormat();
    const isPng = fmt === "image/png";
    const slider = document.getElementById("imsQuality");
    const field = document.getElementById("imsQualityField");
    if (slider) slider.disabled = isPng;
    if (field) field.classList.toggle("disabled", isPng);
}

function imsSetHint(msg, isWarn) {
    const el = document.getElementById("imsHint");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("ims-hint-warn", !!isWarn && !!msg);
}

function imsRevokeResult() {
    if (imsResultUrl) {
        URL.revokeObjectURL(imsResultUrl);
        imsResultUrl = null;
    }
}

function imsClearPreview() {
    const orig = document.getElementById("imsOrigPreview");
    const res = document.getElementById("imsResultPreview");
    if (orig) {
        orig.removeAttribute("src");
        orig.style.display = "none";
    }
    if (res) {
        res.removeAttribute("src");
        res.style.display = "none";
    }
    const emptyO = document.getElementById("imsOrigEmpty");
    const emptyR = document.getElementById("imsResultEmpty");
    if (emptyO) emptyO.style.display = "";
    if (emptyR) emptyR.style.display = "";
}

function imsShowOrig(url) {
    const img = document.getElementById("imsOrigPreview");
    const empty = document.getElementById("imsOrigEmpty");
    if (img) {
        img.src = url;
        img.style.display = "";
    }
    if (empty) empty.style.display = "none";
}

function imsShowResult(url) {
    const img = document.getElementById("imsResultPreview");
    const empty = document.getElementById("imsResultEmpty");
    if (img) {
        img.src = url;
        img.style.display = "";
    }
    if (empty) empty.style.display = "none";
}

function imsUpdateMeta() {
    const el = document.getElementById("imsMeta");
    if (!el) return;
    if (!imsState) {
        el.textContent = "";
        return;
    }
    const s = imsState;
    const scaleNote = s.scaled ? "（已等比缩小）" : "";
    el.textContent =
        s.name +
        " · " +
        s.origW +
        "×" +
        s.origH +
        scaleNote +
        " · 混淆次数 " +
        s.scrambleCount +
        (s.file && s.file.size ? " · " + imsFormatBytes(s.file.size) : "");
}

function imsResetState() {
    if (imsState && imsState.origUrl) URL.revokeObjectURL(imsState.origUrl);
    imsRevokeResult();
    imsState = null;
    imsClearPreview();
    imsUpdateMeta();
    const file = document.getElementById("imsFile");
    if (file) file.value = "";
    imsSetHint("");
}

function imsLoadFile(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
        if (typeof toast === "function") toast("请选择图片文件");
        return;
    }
    imsResetState();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        const fit = fitImageSize(natW, natH, IMS_MAX_SIDE, IMS_MAX_PIXELS);
        const canvas = document.createElement("canvas");
        canvas.width = fit.w;
        canvas.height = fit.h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, fit.w, fit.h);
        imsState = {
            file: file,
            name: file.name,
            origUrl: url,
            origW: fit.w,
            origH: fit.h,
            canvas: canvas,
            scaled: fit.scaled,
            scrambleCount: 0,
        };
        imsShowOrig(url);
        // 结果先显示当前画布
        imsSyncResultFromCanvas();
        imsUpdateMeta();
        if (fit.scaled) {
            imsSetHint(
                "图片过大（总像素 > 800 万或单边 > 4000），已等比缩小至 " +
                    fit.w +
                    "×" +
                    fit.h +
                    " 再处理。",
                true,
            );
            if (typeof toast === "function") toast("图片已自动缩小至合规尺寸");
        } else {
            imsSetHint("已加载，可点击「混淆」或「解混淆」。");
        }
        if (typeof setStatus === "function") setStatus("已加载图片: " + file.name);
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        if (typeof toast === "function") toast("图片解码失败");
    };
    img.src = url;
}

function imsSyncResultFromCanvas() {
    if (!imsState) return;
    imsRevokeResult();
    const mime = imsGetFormat();
    const quality = imsGetQuality();
    imsState.canvas.toBlob(
        (blob) => {
            if (!blob || !imsState) return;
            imsResultUrl = URL.createObjectURL(blob);
            imsShowResult(imsResultUrl);
        },
        mime,
        mime === "image/png" ? undefined : quality,
    );
}

function imsProcessOnce() {
    if (!imsState) {
        if (typeof toast === "function") toast("请先上传图片");
        return false;
    }
    const canvas = imsState.canvas;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const scrambled = scrambleImageData(imageData);
    ctx.putImageData(scrambled, 0, 0);
    return true;
}

function imsScramble() {
    if (!imsProcessOnce()) return;
    imsState.scrambleCount += 1;
    imsSyncResultFromCanvas();
    imsUpdateMeta();
    imsSetHint("已混淆 1 次（累计 " + imsState.scrambleCount + "）。解混淆需相同次数。");
    if (typeof setStatus === "function") setStatus("混淆完成 · 累计 " + imsState.scrambleCount);
}

function imsUnscramble() {
    if (!imsProcessOnce()) return;
    imsState.scrambleCount -= 1;
    imsSyncResultFromCanvas();
    imsUpdateMeta();
    imsSetHint(
        "已解混淆 1 次（累计混淆净次数 " +
            imsState.scrambleCount +
            "）。净次数为 0 时接近原图（JPEG 有损除外）。",
    );
    if (typeof setStatus === "function") setStatus("解混淆完成 · 净次数 " + imsState.scrambleCount);
}

function imsRestore() {
    if (!imsState || !imsState.origUrl) {
        if (typeof toast === "function") toast("请先上传图片");
        return;
    }
    const img = new Image();
    img.onload = () => {
        if (!imsState) return;
        const canvas = imsState.canvas;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        imsState.scrambleCount = 0;
        imsSyncResultFromCanvas();
        imsUpdateMeta();
        imsSetHint("已还原为上传时的图像。");
        if (typeof setStatus === "function") setStatus("已还原原图");
    };
    img.onerror = () => {
        if (typeof toast === "function") toast("还原失败");
    };
    img.src = imsState.origUrl;
}

function imsDownload() {
    if (!imsState) {
        if (typeof toast === "function") toast("请先上传图片");
        return;
    }
    const mime = imsGetFormat();
    const quality = imsGetQuality();
    const ext = mime === "image/png" ? "png" : "jpg";
    const name = imsBaseName(imsState.name) + "-shuffled." + ext;
    imsState.canvas.toBlob(
        (blob) => {
            if (!blob) {
                if (typeof toast === "function") toast("导出失败");
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            if (typeof toast === "function") toast("已下载 " + name);
            if (mime === "image/jpeg" && typeof setStatus === "function") {
                setStatus("已下载 JPEG（有损，可能影响完美还原）");
            }
        },
        mime,
        mime === "image/png" ? undefined : quality,
    );
}

function imsClear() {
    imsResetState();
    if (typeof setStatus === "function") setStatus("已清空");
}

function imsInit() {
    imsUpdateQualityLabel();
    imsOnFormatChange();
    const drop = document.getElementById("imsDrop");
    const file = document.getElementById("imsFile");
    if (!drop || !file) return;

    drop.addEventListener("click", () => file.click());
    drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("dragover");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
    drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("dragover");
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            imsLoadFile(e.dataTransfer.files[0]);
        }
    });
    file.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) imsLoadFile(e.target.files[0]);
        e.target.value = "";
    });
    const q = document.getElementById("imsQuality");
    if (q) q.addEventListener("input", imsUpdateQualityLabel);
    const fmt = document.getElementById("imsFormat");
    if (fmt) fmt.addEventListener("change", imsOnFormatChange);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        generateGilbertCurve: generateGilbertCurve,
        scrambleImageData: scrambleImageData,
        fitImageSize: fitImageSize,
        IMS_MAX_SIDE: IMS_MAX_SIDE,
        IMS_MAX_PIXELS: IMS_MAX_PIXELS,
    };
}

if (typeof registerInit === "function") {
    registerInit("imgshuffle", imsInit);
}
