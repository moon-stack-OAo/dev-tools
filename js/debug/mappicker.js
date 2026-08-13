/* 地图选址 mappicker — Leaflet + OSM */
var _mpMap = null;
var _mpMarker = null;
var _mpTileLayer = null;
var _mpLat = null;
var _mpLng = null;
var _mpDecimals = 6;

var MP_DEFAULT_CENTER = [35.0, 105.0];
var MP_DEFAULT_ZOOM = 4;
var MP_DEFAULT_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var MP_DEFAULT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

function mpSyncPanel() {
    var d = mpGetDecimals();
    var latEl = document.getElementById('mpLat');
    var lngEl = document.getElementById('mpLng');
    var zoomEl = document.getElementById('mpZoom');
    var centerEl = document.getElementById('mpCenter');

    if (latEl) {
        latEl.value = _mpLat != null && isFinite(_mpLat) ? Number(_mpLat).toFixed(d) : '';
    }
    if (lngEl) {
        lngEl.value = _mpLng != null && isFinite(_mpLng) ? Number(_mpLng).toFixed(d) : '';
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

function mpSetPoint(lat, lng, pan) {
    if (!mpIsValidLatLng(lat, lng)) return;
    _mpLat = mpClampLat(lat);
    _mpLng = mpClampLng(lng);

    if (_mpMap && typeof L !== 'undefined') {
        var ll = L.latLng(_mpLat, _mpLng);
        if (_mpMarker) {
            _mpMarker.setLatLng(ll);
        } else {
            _mpMarker = L.marker(ll, { draggable: true }).addTo(_mpMap);
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
    mpSetPoint(e.latlng.lat, e.latlng.lng, false);
    if (typeof setStatus === 'function') {
        setStatus('已选点');
    }
}

function mpLocateInput() {
    var input = document.getElementById('mpCoordInput');
    var text = input ? input.value : '';
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
    _mpLat = null;
    _mpLng = null;
    if (_mpMarker && _mpMap) {
        _mpMap.removeLayer(_mpMarker);
    }
    _mpMarker = null;
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
    if (!url) {
        if (typeof toast === 'function') toast('请输入瓦片 URL 模板');
        return;
    }
    if (url.indexOf('{z}') < 0 || url.indexOf('{x}') < 0 || url.indexOf('{y}') < 0) {
        if (typeof toast === 'function') toast('模板须包含 {z}/{x}/{y}');
        return;
    }
    if (_mpTileLayer) {
        _mpMap.removeLayer(_mpTileLayer);
    }
    _mpTileLayer = L.tileLayer(url, {
        attribution: MP_DEFAULT_ATTR,
        maxZoom: 19,
    }).addTo(_mpMap);
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

    if (L.Icon && L.Icon.Default) {
        L.Icon.Default.mergeOptions({
            iconUrl: 'lib/images/marker-icon.png',
            iconRetinaUrl: 'lib/images/marker-icon-2x.png',
            shadowUrl: 'lib/images/marker-shadow.png',
        });
    }

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

    _mpTileLayer = L.tileLayer(tileUrl, {
        attribution: MP_DEFAULT_ATTR,
        maxZoom: 19,
    }).addTo(_mpMap);

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
    };
}
