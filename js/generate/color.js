function colorConvert() {
    const raw = document.getElementById('colorInput').value.trim();
    const outHex = document.getElementById('colorHex');
    const outRgb = document.getElementById('colorRgb');
    const outHsl = document.getElementById('colorHsl');
    const preview = document.getElementById('colorPreview');
    if (!raw) {
        outHex.textContent = '请输入颜色';
        outHex.className = 'output-box error';
        return;
    }
    let r, g, b;
    let m = raw.match(/^#?([0-9a-fA-F]{3,8})$/);
    if (m) {
        let hex = m[1];
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else if (hex.length === 8) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }
    }
    if (r === undefined) {
        m = raw.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/i);
        if (m) {
            r = parseInt(m[1]);
            g = parseInt(m[2]);
            b = parseInt(m[3]);
        }
    }
    if (r === undefined) {
        m = raw.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*[\d.]+\s*)?\)/i);
        if (m) {
            const h = parseInt(m[1]) / 360, s = parseInt(m[2]) / 100, l = parseInt(m[3]) / 100;
            const rgb = hslToRgb(h, s, l);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        }
    }
    if (r === undefined) {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = raw;
        const computed = ctx.fillStyle;
        if (computed && computed.startsWith('rgb')) {
            m = computed.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (m) {
                r = parseInt(m[1]);
                g = parseInt(m[2]);
                b = parseInt(m[3]);
            }
        }
    }
    if (r === undefined || isNaN(r)) {
        outHex.textContent = '无法识别颜色格式';
        outHex.className = 'output-box error';
        outRgb.textContent = '';
        outHsl.textContent = '';
        return;
    }
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    const hsl = rgbToHsl(r, g, b);
    outHex.textContent = hex.toUpperCase();
    outHex.className = 'output-box';
    outRgb.textContent = `rgb(${r}, ${g}, ${b})`;
    outRgb.className = 'output-box';
    outHsl.textContent = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    outHsl.className = 'output-box';
    preview.style.background = hex;
    setStatus('颜色转换完成');
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
