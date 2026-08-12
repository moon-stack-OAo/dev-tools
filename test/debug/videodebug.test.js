const {
    vdFormatDuration,
    vdFormatReadyState,
    vdFormatNetworkState,
    vdMediaErrorMessage,
    vdCanPlayLabel,
    vdBuildMediaInfo,
    vdValidateCaptureSource,
    vdParseVideoSnapshot,
    vdLooksLikeM3u,
    vdLooksLikeHlsMediaPlaylist,
    vdUrlPlaylistHint,
    vdParseExtinf,
    vdResolveUrl,
    vdParseM3u,
    vdIsChannelPlaylist,
    vdProxyUrl,
} = require('../../js/debug/videodebug.js');

describe('vdFormatDuration', () => {
    test('null / NaN / Infinity → —', () => {
        expect(vdFormatDuration(null)).toBe('—');
        expect(vdFormatDuration(undefined)).toBe('—');
        expect(vdFormatDuration(NaN)).toBe('—');
        expect(vdFormatDuration(Infinity)).toBe('—');
        expect(vdFormatDuration(-Infinity)).toBe('—');
    });

    test('负数按 0', () => {
        expect(vdFormatDuration(-5)).toBe('0:00.000');
    });

    test('小于 1 小时', () => {
        expect(vdFormatDuration(65.5)).toBe('1:05.500');
        expect(vdFormatDuration(0)).toBe('0:00.000');
        expect(vdFormatDuration(9.001)).toBe('0:09.001');
    });

    test('有小时', () => {
        expect(vdFormatDuration(3661.25)).toBe('1:01:01.250');
    });
});

describe('vdFormatReadyState', () => {
    test('0-4 映射', () => {
        expect(vdFormatReadyState(0)).toBe('HAVE_NOTHING');
        expect(vdFormatReadyState(1)).toBe('HAVE_METADATA');
        expect(vdFormatReadyState(2)).toBe('HAVE_CURRENT_DATA');
        expect(vdFormatReadyState(3)).toBe('HAVE_FUTURE_DATA');
        expect(vdFormatReadyState(4)).toBe('HAVE_ENOUGH_DATA');
    });

    test('未知', () => {
        expect(vdFormatReadyState(9)).toBe('READY(9)');
    });
});

describe('vdFormatNetworkState', () => {
    test('0-3 映射', () => {
        expect(vdFormatNetworkState(0)).toBe('NETWORK_EMPTY');
        expect(vdFormatNetworkState(1)).toBe('NETWORK_IDLE');
        expect(vdFormatNetworkState(2)).toBe('NETWORK_LOADING');
        expect(vdFormatNetworkState(3)).toBe('NETWORK_NO_SOURCE');
    });

    test('未知', () => {
        expect(vdFormatNetworkState(8)).toBe('NETWORK(8)');
    });
});

describe('vdMediaErrorMessage', () => {
    test('1-4 中文说明', () => {
        expect(vdMediaErrorMessage(1)).toMatch(/中止|ABORTED/);
        expect(vdMediaErrorMessage(2)).toMatch(/网络|NETWORK/);
        expect(vdMediaErrorMessage(3)).toMatch(/解码|DECODE/);
        expect(vdMediaErrorMessage(4)).toMatch(/不支持|SRC_NOT_SUPPORTED/);
    });

    test('未知 code', () => {
        expect(vdMediaErrorMessage(99)).toMatch(/未知/);
    });
});

describe('vdCanPlayLabel', () => {
    test('canPlayType 结果', () => {
        expect(vdCanPlayLabel('')).toBe('不支持');
        expect(vdCanPlayLabel('maybe')).toBe('可能');
        expect(vdCanPlayLabel('probably')).toBe('很可能');
    });
});

describe('vdBuildMediaInfo', () => {
    test('含关键字段', () => {
        const text = vdBuildMediaInfo({
            source: 'https://example.com/a.mp4',
            fileName: 'a.mp4',
            fileSize: 1024,
            mime: 'video/mp4',
            width: 1920,
            height: 1080,
            duration: 120.5,
            currentTime: 10,
            paused: true,
            muted: false,
            volume: 0.8,
            playbackRate: 1.5,
            readyState: 4,
            networkState: 1,
            seekable: null,
            buffered: null,
            error: null,
        });
        expect(text).toMatch(/来源: https:\/\/example\.com\/a\.mp4/);
        expect(text).toMatch(/文件名: a\.mp4/);
        expect(text).toMatch(/MIME: video\/mp4/);
        expect(text).toMatch(/1920/);
        expect(text).toMatch(/1080/);
        expect(text).toMatch(/暂停/);
        expect(text).toMatch(/HAVE_ENOUGH_DATA/);
        expect(text).toMatch(/NETWORK_IDLE/);
        expect(text).toMatch(/错误: 无/);
        expect(text).toMatch(/1\.5x/);
    });

    test('有错误对象', () => {
        const text = vdBuildMediaInfo({
            source: '',
            width: 0,
            height: 0,
            duration: NaN,
            currentTime: 0,
            paused: true,
            muted: false,
            volume: 1,
            playbackRate: 1,
            readyState: 0,
            networkState: 3,
            error: { code: 4, message: vdMediaErrorMessage(4) },
        });
        expect(text).toMatch(/不支持/);
    });
});

describe('vdValidateCaptureSource', () => {
    test('无元素失败', () => {
        const r = vdValidateCaptureSource(null);
        expect(r.ok).toBe(false);
        expect(r.error).toBeTruthy();
    });

    test('无尺寸失败', () => {
        const r = vdValidateCaptureSource({ videoWidth: 0, videoHeight: 0, currentTime: 0 });
        expect(r.ok).toBe(false);
    });

    test('有尺寸成功', () => {
        const r = vdValidateCaptureSource({
            videoWidth: 640,
            videoHeight: 360,
            currentTime: 12.34,
        });
        expect(r.ok).toBe(true);
        expect(r.width).toBe(640);
        expect(r.height).toBe(360);
        expect(r.time).toBe(12.34);
    });
});

describe('vdParseVideoSnapshot', () => {
    test('从 mock video 读取字段', () => {
        const snap = vdParseVideoSnapshot({
            currentSrc: 'blob:x',
            src: '',
            videoWidth: 100,
            videoHeight: 50,
            duration: 30,
            currentTime: 5,
            paused: false,
            muted: true,
            volume: 0.5,
            playbackRate: 2,
            readyState: 3,
            networkState: 2,
            seekable: null,
            buffered: null,
            error: null,
        });
        expect(snap.source).toBe('blob:x');
        expect(snap.width).toBe(100);
        expect(snap.height).toBe(50);
        expect(snap.paused).toBe(false);
        expect(snap.muted).toBe(true);
        expect(snap.readyState).toBe(3);
    });

    test('空 video', () => {
        const snap = vdParseVideoSnapshot(null);
        expect(snap.paused).toBe(true);
        expect(snap.width).toBe(0);
    });
});

describe('M3U / 播放列表', () => {
    const IPTV = `#EXTM3U x-tvg-url="https://example.com/epg.xml"
#EXTINF:-1 tvg-id="CCTV1" tvg-name="CCTV1综合" group-title="央视",CCTV1综合
https://example.com/live/cctv1
#EXTINF:-1 tvg-name="CCTV2" group-title="央视",CCTV2财经
https://example.com/live/cctv2
`;

    const HLS_MEDIA = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:9.0,
segment0.ts
#EXTINF:9.0,
segment1.ts
#EXT-X-ENDLIST
`;

    test('vdLooksLikeM3u', () => {
        expect(vdLooksLikeM3u(IPTV)).toBe(true);
        expect(vdLooksLikeM3u('not a playlist')).toBe(false);
        expect(vdLooksLikeM3u('')).toBe(false);
    });

    test('vdLooksLikeHlsMediaPlaylist', () => {
        expect(vdLooksLikeHlsMediaPlaylist(HLS_MEDIA)).toBe(true);
        expect(vdLooksLikeHlsMediaPlaylist(IPTV)).toBe(false);
    });

    test('vdUrlPlaylistHint', () => {
        expect(vdUrlPlaylistHint('https://x/a.m3u')).toEqual({ isM3u: true, isM3u8: false });
        expect(vdUrlPlaylistHint('https://x/a.m3u8?token=1')).toEqual({ isM3u: false, isM3u8: true });
        expect(vdUrlPlaylistHint('https://x/v.mp4')).toEqual({ isM3u: false, isM3u8: false });
    });

    test('vdParseExtinf', () => {
        const r = vdParseExtinf(
            '#EXTINF:-1 tvg-id="id1" group-title="G",频道名'
        );
        expect(r.duration).toBe(-1);
        expect(r.title).toBe('频道名');
        expect(r.attrs['group-title']).toBe('G');
        expect(r.attrs['tvg-id']).toBe('id1');
    });

    test('vdResolveUrl', () => {
        expect(vdResolveUrl('https://a.com/dir/list.m3u', 'https://b.com/x')).toBe(
            'https://b.com/x'
        );
        expect(vdResolveUrl('https://a.com/dir/list.m3u', 'ch1')).toBe(
            'https://a.com/dir/ch1'
        );
    });

    test('vdParseM3u IPTV 多频道', () => {
        const parsed = vdParseM3u(IPTV, 'https://example.com/list.m3u');
        expect(parsed.items.length).toBe(2);
        expect(parsed.items[0].title).toBe('CCTV1综合');
        expect(parsed.items[0].group).toBe('央视');
        expect(parsed.items[0].url).toBe('https://example.com/live/cctv1');
        expect(parsed.items[1].title).toBe('CCTV2财经');
        expect(vdIsChannelPlaylist(parsed, IPTV)).toBe(true);
    });

    test('单流 HLS 不当作频道列表', () => {
        const parsed = vdParseM3u(HLS_MEDIA, 'https://cdn.example/stream.m3u8');
        expect(parsed.items.length).toBeGreaterThanOrEqual(1);
        expect(vdIsChannelPlaylist(parsed, HLS_MEDIA)).toBe(false);
    });

    test('vdProxyUrl', () => {
        expect(vdProxyUrl('https://a.com/x.m3u')).toBe(
            '/__cors_proxy?target=' + encodeURIComponent('https://a.com/x.m3u')
        );
    });
});
