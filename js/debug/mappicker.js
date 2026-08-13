/* 地图选址 mappicker — Leaflet + OSM */
var _mpMap = null;
var _mpMarker = null;
var _mpTileLayer = null;
var _mpAccuracyCircle = null;
var _mpLat = null;
var _mpLng = null;
var _mpAccuracy = null;
var _mpDecimals = 6;
var _mpGeoWatchId = null;
var _mpGeoTimer = null;
var _mpGeoBest = null;

var MP_DEFAULT_CENTER = [35.0, 105.0];
var MP_DEFAULT_ZOOM = 4;
var MP_DEFAULT_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var MP_DEFAULT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
/** 精定位：持续采样毫秒数 */
var MP_GEO_SAMPLE_MS = 8000;
/** 精度优于该米数可提前结束 */
var MP_GEO_GOOD_ACC_M = 25;

/**
 * 规范化瓦片 URL：把高德/常见写法 wprd0{1-4}、{a-d} 转为 Leaflet 的 {s} + subdomains。
 * Leaflet 会把模板里每个 {xxx} 当变量，{1-4} 会直接报错。
 */
function mpNormalizeTileTemplate(url) {
    var raw = url == null ? '' : String(url).trim();
    if (!raw) {
        return { ok: false, error: '请输入瓦片 URL 模板' };
    }
    var template = raw;
    var subdomains = null;

    // 数字区间：{1-4} {0-3} 等
    var numM = template.match(/\{(\d+)-(\d+)\}/);
    if (numM) {
        var nStart = parseInt(numM[1], 10);
        var nEnd = parseInt(numM[2], 10);
        if (!isFinite(nStart) || !isFinite(nEnd) || nEnd < nStart || nEnd - nStart > 36) {
            return { ok: false, error: '子域区间无效: ' + numM[0] };
        }
        subdomains = [];
        for (var i = nStart; i <= nEnd; i++) {
            subdomains.push(String(i));
        }
        template = template.replace(numM[0], '{s}');
    } else {
        // 字母区间：{a-d} {a-c} 等
        var letM = template.match(/\{([a-z])-([a-z])\}/i);
        if (letM) {
            var c0 = letM[1].toLowerCase().charCodeAt(0);
            var c1 = letM[2].toLowerCase().charCodeAt(0);
            if (c1 < c0 || c1 - c0 > 26) {
                return { ok: false, error: '子域区间无效: ' + letM[0] };
            }
            subdomains = [];
            for (var c = c0; c <= c1; c++) {
                subdomains.push(String.fromCharCode(c));
            }
            template = template.replace(letM[0], '{s}');
        }
    }

    if (template.indexOf('{z}') < 0 || template.indexOf('{x}') < 0 || template.indexOf('{y}') < 0) {
        return { ok: false, error: '模板须包含 {z}/{x}/{y}' };
    }

    // 仍残留未知花括号变量（除 s/z/x/y/r）则提示
    var leftover = template.match(/\{(?![sxyzr]\})[^}]+\}/i);
    if (leftover) {
        return {
            ok: false,
            error: '不支持的模板变量 ' + leftover[0] + '（子域请用 {1-4}/{a-d} 或 {s}）',
        };
    }

    var opts = { maxZoom: 19, attribution: MP_DEFAULT_ATTR };
    if (subdomains && subdomains.length) {
        opts.subdomains = subdomains;
    } else if (template.indexOf('{s}') >= 0) {
        // OSM 默认 a/b/c
        opts.subdomains = ['a', 'b', 'c'];
    }

    return { ok: true, url: template, options: opts, subdomains: subdomains };
}

function mpCreateTileLayer(url) {
    var norm = mpNormalizeTileTemplate(url);
    if (!norm.ok) {
        return norm;
    }
    if (typeof L === 'undefined') {
        return { ok: false, error: 'Leaflet 未加载' };
    }
    return {
        ok: true,
        layer: L.tileLayer(norm.url, norm.options),
        url: norm.url,
        options: norm.options,
    };
}

function mpClampLat(lat) {
    var n = Number(lat);
    if (!isFinite(n)) return NaN;
    if (n > 90) return 90;
    if (n < -90) return -90;
    return n;
}

function mpClampLng(lng) {
    var n = Number(lng);
    if (!isFinite(n)) return NaN;
    if (n > 180) return 180;
    if (n < -180) return -180;
    return n;
}

function mpIsValidLatLng(lat, lng) {
    var la = Number(lat);
    var ln = Number(lng);
    return isFinite(la) && isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

function mpParseCoordInput(text) {
    if (text == null || String(text).trim() === '') {
        return { ok: false, error: '请输入坐标' };
    }
    var raw = String(text).trim().replace(/[，；;|/]/g, ',');
    var parts = raw.split(',').map(function (s) {
        return s.trim();
    }).filter(function (s) {
        return s.length > 0;
    });
    if (parts.length < 2) {
        return { ok: false, error: '格式应为 纬度,经度 或 经度,纬度' };
    }
    var a = Number(parts[0]);
    var b = Number(parts[1]);
    if (!isFinite(a) || !isFinite(b)) {
        return { ok: false, error: '坐标必须为数字' };
    }

    var lat;
    var lng;
    var order;
    // |a|<=90 且 |b|<=180 优先 lat,lng；a 超 90 则当 lng,lat
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        lat = a;
        lng = b;
        order = 'latlng';
    } else if (Math.abs(a) > 90 && Math.abs(a) <= 180 && Math.abs(b) <= 90) {
        lng = a;
        lat = b;
        order = 'lnglat';
    } else if (Math.abs(b) > 90 && Math.abs(b) <= 180 && Math.abs(a) <= 90) {
        // 例如 120,31 已在第一支；若用户写 31,120 也是 latlng
        lat = a;
        lng = b;
        order = 'latlng';
    } else {
        return { ok: false, error: '坐标超出有效范围（lat ±90，lng ±180）' };
    }

    if (!mpIsValidLatLng(lat, lng)) {
        return { ok: false, error: '坐标超出有效范围（lat ±90，lng ±180）' };
    }
    return { ok: true, lat: lat, lng: lng, order: order };
}

function mpFormatLatLng(lat, lng, decimals, order) {
    var d = decimals == null ? 6 : Number(decimals);
    if (!isFinite(d) || d < 0) d = 6;
    d = Math.min(12, Math.floor(d));
    var la = Number(lat).toFixed(d);
    var ln = Number(lng).toFixed(d);
    if (order === 'lnglat') return ln + ',' + la;
    return la + ',' + ln;
}

function mpFormatJson(lat, lng, decimals) {
    var d = decimals == null ? 6 : Number(decimals);
    if (!isFinite(d) || d < 0) d = 6;
    d = Math.min(12, Math.floor(d));
    var la = Number(Number(lat).toFixed(d));
    var ln = Number(Number(lng).toFixed(d));
    return JSON.stringify({ lat: la, lng: ln });
}

function mpEnsureLeafletCss() {
    if (document.getElementById('mp-leaflet-css')) return;
    var link = document.createElement('link');
    link.id = 'mp-leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'lib/leaflet.css' + (typeof assetV === 'function' ? assetV('lib/leaflet.css') : '');
    document.head.appendChild(link);
}

function mpGetDecimals() {
    var el = document.getElementById('mpDecimals');
    var d = el ? parseInt(el.value, 10) : _mpDecimals;
    if (!isFinite(d) || d < 0) d = 6;
    _mpDecimals = d;
    return d;
}

function mpFormatAccuracy(m) {
    if (m == null || !isFinite(m) || m < 0) return '—';
    if (m < 1000) return '±' + Math.round(m) + ' m';
    return '±' + (m / 1000).toFixed(1) + ' km';
}

function mpSyncPanel() {
    var d = mpGetDecimals();
    var latEl = document.getElementById('mpLat');
    var lngEl = document.getElementById('mpLng');
    var zoomEl = document.getElementById('mpZoom');
    var centerEl = document.getElementById('mpCenter');
    var accEl = document.getElementById('mpAccuracy');

    if (latEl) {
        latEl.value = _mpLat != null && isFinite(_mpLat) ? Number(_mpLat).toFixed(d) : '';
    }
    if (lngEl) {
        lngEl.value = _mpLng != null && isFinite(_mpLng) ? Number(_mpLng).toFixed(d) : '';
    }
    if (accEl) {
        accEl.textContent = mpFormatAccuracy(_mpAccuracy);
    }

    if (_mpMap) {
        var z = _mpMap.getZoom();
        var c = _mpMap.getCenter();
        if (zoomEl) zoomEl.textContent = String(z);
        if (centerEl) {
            centerEl.textContent = Number(c.lat).toFixed(d) + ', ' + Number(c.lng).toFixed(d);
        }
    } else {
        if (zoomEl) zoomEl.textContent = '—';
        if (centerEl) centerEl.textContent = '—';
    }
}

function mpSetAccuracyCircle(lat, lng, accuracy) {
    if (!_mpMap || typeof L === 'undefined') return;
    var r = typeof accuracy === 'number' && isFinite(accuracy) && accuracy > 0 ? accuracy : 0;
    if (r <= 0) {
        if (_mpAccuracyCircle) {
            _mpMap.removeLayer(_mpAccuracyCircle);
            _mpAccuracyCircle = null;
        }
        return;
    }
    var ll = L.latLng(lat, lng);
    if (_mpAccuracyCircle) {
        _mpAccuracyCircle.setLatLng(ll);
        _mpAccuracyCircle.setRadius(r);
    } else {
        _mpAccuracyCircle = L.circle(ll, {
            radius: r,
            color: '#3b82f6',
            weight: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            interactive: false,
        }).addTo(_mpMap);
    }
}

function mpZoomForAccuracy(accuracy) {
    if (accuracy == null || !isFinite(accuracy)) return 16;
    if (accuracy <= 20) return 18;
    if (accuracy <= 50) return 17;
    if (accuracy <= 100) return 16;
    if (accuracy <= 300) return 15;
    if (accuracy <= 1000) return 14;
    return 13;
}

function mpMarkerIcon() {
    if (typeof L === 'undefined') return null;
    return L.divIcon({
        className: 'mp-marker-icon',
        html: '<span class="mp-pin" aria-hidden="true"></span>',
        iconSize: [28, 40],
        iconAnchor: [14, 38],
        popupAnchor: [0, -34],
    });
}

function mpSetPoint(lat, lng, pan) {
    if (!mpIsValidLatLng(lat, lng)) return;
    _mpLat = mpClampLat(lat);
    _mpLng = mpClampLng(lng);

    if (_mpMap && typeof L !== 'undefined') {
        var ll = L.latLng(_mpLat, _mpLng);
        if (_mpMarker) {
            _mpMarker.setLatLng(ll);
        } else {
            _mpMarker = L.marker(ll, {
                draggable: true,
                icon: mpMarkerIcon(),
                keyboard: true,
                title: '拖动调整位置',
            }).addTo(_mpMap);
            _mpMarker.on('dragend', function () {
                var p = _mpMarker.getLatLng();
                _mpLat = p.lat;
                _mpLng = p.lng;
                mpSyncPanel();
                if (typeof setStatus === 'function') {
                    setStatus('标记已移动');
                }
            });
        }
        if (pan !== false) {
            var z = Math.max(_mpMap.getZoom(), 12);
            _mpMap.setView(ll, z);
        }
    }
    mpSyncPanel();
}

function mpOnMapClick(e) {
    if (!e || !e.latlng) return;
    mpStopGeoWatch();
    _mpGeoBest = null;
    _mpAccuracy = null;
    mpSetAccuracyCircle(null, null, 0);
    mpSetPoint(e.latlng.lat, e.latlng.lng, false);
    if (typeof setStatus === 'function') {
        setStatus('已选点');
    }
}

function mpGeoErrorMessage(err) {
    if (!err) return '定位失败';
    // 1 PERMISSION_DENIED  2 POSITION_UNAVAILABLE  3 TIMEOUT
    if (err.code === 1) return '定位被拒绝，请在浏览器中允许位置权限';
    if (err.code === 2) return '暂时无法获取位置';
    if (err.code === 3) return '定位超时，请重试';
    return err.message ? String(err.message) : '定位失败';
}

function mpStopGeoWatch() {
    if (_mpGeoWatchId != null && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
            navigator.geolocation.clearWatch(_mpGeoWatchId);
        } catch (e) {
            /* ignore */
        }
    }
    _mpGeoWatchId = null;
    if (_mpGeoTimer) {
        clearTimeout(_mpGeoTimer);
        _mpGeoTimer = null;
    }
}

function mpApplyGeoPosition(pos, opts) {
    opts = opts || {};
    if (!pos || !pos.coords) return false;
    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;
    if (!mpIsValidLatLng(lat, lng)) return false;
    var acc =
        typeof pos.coords.accuracy === 'number' && isFinite(pos.coords.accuracy)
            ? pos.coords.accuracy
            : null;
    _mpAccuracy = acc;
    // fitAccuracy 时由 fitBounds 控制视野，避免 mpSetPoint 再 setView
    mpSetPoint(lat, lng, opts.fitAccuracy ? false : opts.pan !== false);
    mpSetAccuracyCircle(lat, lng, acc);
    if (_mpMap && opts.fitAccuracy && acc != null && acc > 0) {
        try {
            var circle = L.circle([lat, lng], { radius: Math.max(acc, 15) });
            _mpMap.fitBounds(circle.getBounds().pad(0.35), {
                maxZoom: mpZoomForAccuracy(acc),
                animate: true,
            });
        } catch (e2) {
            _mpMap.setView([lat, lng], mpZoomForAccuracy(acc));
        }
    }
    var input = document.getElementById('mpCoordInput');
    if (input) {
        input.value = mpFormatLatLng(lat, lng, mpGetDecimals(), 'latlng');
    }
    mpSyncPanel();
    return true;
}

function mpFinishGeoLocate(hadError) {
    mpStopGeoWatch();
    if (!_mpGeoBest) {
        if (!hadError) {
            if (typeof toast === 'function') toast('未能获取有效位置');
            if (typeof setStatus === 'function') setStatus('定位无有效结果');
        }
        return;
    }
    mpApplyGeoPosition(_mpGeoBest, { pan: true, fitAccuracy: true });
    var acc = _mpGeoBest.coords.accuracy;
    var accText = mpFormatAccuracy(acc);
    if (typeof toast === 'function') toast('精定位完成 ' + accText);
    if (typeof setStatus === 'function') {
        setStatus(
            '当前位置 ' +
                mpFormatLatLng(
                    _mpGeoBest.coords.latitude,
                    _mpGeoBest.coords.longitude,
                    mpGetDecimals(),
                    'latlng'
                ) +
                ' ' +
                accText
        );
    }
    _mpGeoBest = null;
}

function mpLocateCurrentPosition() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (typeof toast === 'function') toast('当前环境不支持定位');
        if (typeof setStatus === 'function') setStatus('不支持 Geolocation');
        return;
    }

    // 取消上一次精定位
    mpStopGeoWatch();
    _mpGeoBest = null;

    if (typeof setStatus === 'function') setStatus('精定位中…（约 ' + MP_GEO_SAMPLE_MS / 1000 + 's，取最优精度）');
    if (typeof toast === 'function') toast('精定位中，请稍候…');

    var geoOpts = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
    };
    var settledError = null;

    function onSample(pos) {
        if (!pos || !pos.coords || !mpIsValidLatLng(pos.coords.latitude, pos.coords.longitude)) {
            return;
        }
        var acc =
            typeof pos.coords.accuracy === 'number' && isFinite(pos.coords.accuracy)
                ? pos.coords.accuracy
                : Infinity;
        if (
            !_mpGeoBest ||
            acc <
                (typeof _mpGeoBest.coords.accuracy === 'number'
                    ? _mpGeoBest.coords.accuracy
                    : Infinity)
        ) {
            _mpGeoBest = pos;
            // 实时更新到更优点，便于用户看到收敛
            mpApplyGeoPosition(pos, { pan: true, fitAccuracy: false });
            if (typeof setStatus === 'function') {
                setStatus('精定位采样中… 当前最佳 ' + mpFormatAccuracy(acc));
            }
        }
        // 已足够准则提前结束
        if (acc <= MP_GEO_GOOD_ACC_M) {
            mpFinishGeoLocate(false);
        }
    }

    function onError(err) {
        // watch 过程中偶发错误：若已有样本则忽略，否则记录
        if (_mpGeoBest) return;
        settledError = err;
    }

    // 先快速拿一次（可能是网络粗定位），再 watch 细化
    navigator.geolocation.getCurrentPosition(onSample, onError, geoOpts);
    _mpGeoWatchId = navigator.geolocation.watchPosition(onSample, onError, geoOpts);
    _mpGeoTimer = setTimeout(function () {
        if (_mpGeoBest) {
            mpFinishGeoLocate(false);
        } else {
            mpStopGeoWatch();
            var msg = mpGeoErrorMessage(settledError) || '定位超时';
            if (typeof toast === 'function') toast(msg);
            if (typeof setStatus === 'function') setStatus(msg);
        }
    }, MP_GEO_SAMPLE_MS);
}

function mpLocateInput() {
    var input = document.getElementById('mpCoordInput');
    var text = input ? String(input.value || '').trim() : '';
    // 未输入坐标 → 浏览器当前位置
    if (!text) {
        mpLocateCurrentPosition();
        return;
    }
    var r = mpParseCoordInput(text);
    if (!r.ok) {
        if (typeof toast === 'function') toast(r.error || '坐标无效');
        if (typeof setStatus === 'function') setStatus(r.error || '坐标无效');
        return;
    }
    mpSetPoint(r.lat, r.lng, true);
    if (typeof toast === 'function') toast('已定位');
    if (typeof setStatus === 'function') setStatus('已定位到 ' + mpFormatLatLng(r.lat, r.lng, mpGetDecimals(), 'latlng'));
}

function mpClear() {
    mpStopGeoWatch();
    _mpGeoBest = null;
    _mpLat = null;
    _mpLng = null;
    _mpAccuracy = null;
    if (_mpMarker && _mpMap) {
        _mpMap.removeLayer(_mpMarker);
    }
    _mpMarker = null;
    if (_mpAccuracyCircle && _mpMap) {
        _mpMap.removeLayer(_mpAccuracyCircle);
    }
    _mpAccuracyCircle = null;
    var input = document.getElementById('mpCoordInput');
    if (input) input.value = '';
    mpSyncPanel();
    if (typeof setStatus === 'function') setStatus('已清空标记');
}

function mpResetView() {
    if (_mpMap) {
        _mpMap.setView(MP_DEFAULT_CENTER, MP_DEFAULT_ZOOM);
    }
    mpSyncPanel();
    if (typeof setStatus === 'function') setStatus('已重置视图');
}

function mpCopy(mode) {
    if (_mpLat == null || _mpLng == null || !mpIsValidLatLng(_mpLat, _mpLng)) {
        if (typeof toast === 'function') toast('请先在地图上选点或定位');
        return;
    }
    var d = mpGetDecimals();
    var text;
    if (mode === 'lnglat') {
        text = mpFormatLatLng(_mpLat, _mpLng, d, 'lnglat');
    } else if (mode === 'json') {
        text = mpFormatJson(_mpLat, _mpLng, d);
    } else {
        text = mpFormatLatLng(_mpLat, _mpLng, d, 'latlng');
    }
    if (typeof safeCopy === 'function') {
        safeCopy(text, '已复制');
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        if (typeof toast === 'function') toast('已复制');
    }
}

function mpApplyTileUrl() {
    if (!_mpMap || typeof L === 'undefined') {
        if (typeof toast === 'function') toast('地图未初始化');
        return;
    }
    var el = document.getElementById('mpTileUrl');
    var url = el ? String(el.value || '').trim() : '';
    var created = mpCreateTileLayer(url);
    if (!created.ok) {
        if (typeof toast === 'function') toast(created.error);
        return;
    }
    if (_mpTileLayer) {
        _mpMap.removeLayer(_mpTileLayer);
    }
    _mpTileLayer = created.layer.addTo(_mpMap);
    if (typeof toast === 'function') toast('瓦片已应用');
    if (typeof setStatus === 'function') setStatus('已切换瓦片底图');
}

function mpOnDecimalsChange() {
    mpGetDecimals();
    mpSyncPanel();
}

function mpOnResize() {
    if (_mpMap) {
        setTimeout(function () {
            if (_mpMap) _mpMap.invalidateSize();
        }, 100);
    }
}

function mpInitMap() {
    if (_mpMap) {
        mpOnResize();
        return;
    }
    if (typeof L === 'undefined') {
        if (typeof toast === 'function') toast('Leaflet 未加载');
        return;
    }
    var el = document.getElementById('mpMap');
    if (!el) return;

    _mpMap = L.map('mpMap', {
        center: MP_DEFAULT_CENTER,
        zoom: MP_DEFAULT_ZOOM,
        zoomControl: true,
    });

    var tileEl = document.getElementById('mpTileUrl');
    var tileUrl = tileEl && tileEl.value.trim() ? tileEl.value.trim() : MP_DEFAULT_TILE;
    if (tileEl && !tileEl.value.trim()) {
        tileEl.value = MP_DEFAULT_TILE;
    }

    var created = mpCreateTileLayer(tileUrl);
    if (!created.ok) {
        // 回退默认 OSM
        created = mpCreateTileLayer(MP_DEFAULT_TILE);
    }
    if (created.ok) {
        _mpTileLayer = created.layer.addTo(_mpMap);
    }

    _mpMap.on('click', mpOnMapClick);
    _mpMap.on('moveend zoomend', function () {
        mpSyncPanel();
    });

    setTimeout(function () {
        if (_mpMap) _mpMap.invalidateSize();
        mpSyncPanel();
    }, 80);
    setTimeout(function () {
        if (_mpMap) _mpMap.invalidateSize();
    }, 300);

    if (typeof window !== 'undefined') {
        window.addEventListener('resize', mpOnResize);
    }
}

function mpInit() {
    mpEnsureLeafletCss();
    var tileEl = document.getElementById('mpTileUrl');
    if (tileEl && !tileEl.value) {
        tileEl.value = MP_DEFAULT_TILE;
    }
    var input = document.getElementById('mpCoordInput');
    if (input && !input._mpBound) {
        input._mpBound = true;
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                mpLocateInput();
            }
        });
    }
    mpInitMap();
    mpSyncPanel();
    if (typeof setStatus === 'function') setStatus('地图选址就绪 · 点击地图落点');
}

if (typeof registerInit === 'function') {
    registerInit('mappicker', mpInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mpParseCoordInput: mpParseCoordInput,
        mpFormatLatLng: mpFormatLatLng,
        mpFormatJson: mpFormatJson,
        mpClampLat: mpClampLat,
        mpClampLng: mpClampLng,
        mpIsValidLatLng: mpIsValidLatLng,
        mpNormalizeTileTemplate: mpNormalizeTileTemplate,
        mpFormatAccuracy: mpFormatAccuracy,
        mpZoomForAccuracy: mpZoomForAccuracy,
    };
}
