const MIME_TYPES = [
    // 文本
    {ext: '.html, .htm', mime: 'text/html', cat: '文本', desc: 'HTML 文档'},
    {ext: '.css', mime: 'text/css', cat: '文本', desc: 'CSS 样式表'},
    {ext: '.js, .mjs', mime: 'text/javascript', cat: '文本', desc: 'JavaScript（module 常用 application/javascript）'},
    {ext: '.json', mime: 'application/json', cat: '文本', desc: 'JSON 数据'},
    {ext: '.xml', mime: 'application/xml', cat: '文本', desc: 'XML 文档'},
    {ext: '.txt', mime: 'text/plain', cat: '文本', desc: '纯文本'},
    {ext: '.csv', mime: 'text/csv', cat: '文本', desc: 'CSV 表格'},
    {ext: '.md', mime: 'text/markdown', cat: '文本', desc: 'Markdown'},
    {ext: '.yml, .yaml', mime: 'application/x-yaml', cat: '文本', desc: 'YAML（也常用 application/yaml）'},
    {ext: '.properties', mime: 'text/plain', cat: '文本', desc: 'Java properties'},
    {ext: '.ts', mime: 'application/typescript', cat: '文本', desc: 'TypeScript 源码'},
    {ext: '.tsx, .jsx', mime: 'text/jsx', cat: '文本', desc: 'React JSX/TSX'},
    {ext: '.vue', mime: 'text/x-vue', cat: '文本', desc: 'Vue SFC（运行时常自定义）'},
    {ext: '.sql', mime: 'application/sql', cat: '文本', desc: 'SQL 脚本'},
    {ext: '.log', mime: 'text/plain', cat: '文本', desc: '日志文件'},

    // 图片
    {ext: '.png', mime: 'image/png', cat: '图片', desc: 'PNG 图像（无损）'},
    {ext: '.jpg, .jpeg', mime: 'image/jpeg', cat: '图片', desc: 'JPEG 图像（有损）'},
    {ext: '.gif', mime: 'image/gif', cat: '图片', desc: 'GIF 图像（动图）'},
    {ext: '.svg', mime: 'image/svg+xml', cat: '图片', desc: 'SVG 矢量图'},
    {ext: '.webp', mime: 'image/webp', cat: '图片', desc: 'Google WebP（有损/无损）'},
    {ext: '.ico', mime: 'image/x-icon', cat: '图片', desc: '网站 favicon'},
    {ext: '.bmp', mime: 'image/bmp', cat: '图片', desc: 'BMP 位图'},
    {ext: '.tiff', mime: 'image/tiff', cat: '图片', desc: 'TIFF 图像'},
    {ext: '.heic, .heif', mime: 'image/heic', cat: '图片', desc: 'HEIC 高效图像（iOS）'},

    // 音频
    {ext: '.mp3', mime: 'audio/mpeg', cat: '音频', desc: 'MP3 音频'},
    {ext: '.wav', mime: 'audio/wav', cat: '音频', desc: 'WAV 无损音频'},
    {ext: '.ogg', mime: 'audio/ogg', cat: '音频', desc: 'Ogg 音频（容器）'},
    {ext: '.flac', mime: 'audio/flac', cat: '音频', desc: 'FLAC 无损音频'},
    {ext: '.aac', mime: 'audio/aac', cat: '音频', desc: 'AAC 音频'},
    {ext: '.m4a', mime: 'audio/mp4', cat: '音频', desc: 'MPEG-4 音频'},
    {ext: '.opus', mime: 'audio/opus', cat: '音频', desc: 'Opus 音频'},

    // 视频
    {ext: '.mp4', mime: 'video/mp4', cat: '视频', desc: 'MP4 视频'},
    {ext: '.webm', mime: 'video/webm', cat: '视频', desc: 'WebM 视频（VP8/VP9）'},
    {ext: '.ogv', mime: 'video/ogg', cat: '视频', desc: 'Ogg 视频'},
    {ext: '.avi', mime: 'video/x-msvideo', cat: '视频', desc: 'AVI 视频'},
    {ext: '.mov', mime: 'video/quicktime', cat: '视频', desc: 'QuickTime 视频'},
    {ext: '.mkv', mime: 'video/x-matroska', cat: '视频', desc: 'Matroska 视频'},
    {ext: '.flv', mime: 'video/x-flv', cat: '视频', desc: 'Flash 视频'},
    {ext: '.wmv', mime: 'video/x-ms-wmv', cat: '视频', desc: 'Windows Media Video'},
    {ext: '.mpeg, .mpg', mime: 'video/mpeg', cat: '视频', desc: 'MPEG 视频'},

    // 应用 / 压缩
    {ext: '.pdf', mime: 'application/pdf', cat: '应用', desc: 'PDF 文档'},
    {ext: '.zip', mime: 'application/zip', cat: '应用', desc: 'ZIP 压缩包'},
    {ext: '.rar', mime: 'application/vnd.rar', cat: '应用', desc: 'RAR 压缩包'},
    {ext: '.7z', mime: 'application/x-7z-compressed', cat: '应用', desc: '7-Zip 压缩包'},
    {ext: '.tar', mime: 'application/x-tar', cat: '应用', desc: 'TAR 归档'},
    {ext: '.gz', mime: 'application/gzip', cat: '应用', desc: 'gzip 压缩'},
    {ext: '.bz2', mime: 'application/x-bzip2', cat: '应用', desc: 'bzip2 压缩'},
    {ext: '.jar', mime: 'application/java-archive', cat: '应用', desc: 'Java JAR'},
    {ext: '.war', mime: 'application/java-archive', cat: '应用', desc: 'Java Web Archive'},
    {ext: '.ear', mime: 'application/java-archive', cat: '应用', desc: 'Java Enterprise Archive'},
    {ext: '.class', mime: 'application/java-vm', cat: '应用', desc: 'Java 字节码'},

    // Office
    {ext: '.doc', mime: 'application/msword', cat: '办公', desc: 'Word 97-2003'},
    {
        ext: '.docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cat: '办公',
        desc: 'Word 2007+'
    },
    {ext: '.xls', mime: 'application/vnd.ms-excel', cat: '办公', desc: 'Excel 97-2003'},
    {
        ext: '.xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        cat: '办公',
        desc: 'Excel 2007+'
    },
    {ext: '.ppt', mime: 'application/vnd.ms-powerpoint', cat: '办公', desc: 'PowerPoint 97-2003'},
    {
        ext: '.pptx',
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        cat: '办公',
        desc: 'PowerPoint 2007+'
    },
    {ext: '.odt', mime: 'application/vnd.oasis.opendocument.text', cat: '办公', desc: 'OpenDocument Text'},

    // 字体
    {ext: '.ttf', mime: 'font/ttf', cat: '字体', desc: 'TrueType 字体'},
    {ext: '.otf', mime: 'font/otf', cat: '字体', desc: 'OpenType 字体'},
    {ext: '.woff', mime: 'font/woff', cat: '字体', desc: 'WOFF 字体'},
    {ext: '.woff2', mime: 'font/woff2', cat: '字体', desc: 'WOFF2 字体（压缩）'},
    {ext: '.eot', mime: 'application/vnd.ms-fontobject', cat: '字体', desc: 'EOT 字体（IE）'},

    // 可执行 / 安装包
    {ext: '.exe', mime: 'application/vnd.microsoft.portable-executable', cat: '可执行', desc: 'Windows 可执行文件'},
    {ext: '.msi', mime: 'application/x-msi', cat: '可执行', desc: 'Windows 安装包'},
    {ext: '.dmg', mime: 'application/x-apple-diskimage', cat: '可执行', desc: 'macOS 磁盘镜像'},
    {ext: '.pkg', mime: 'application/x-newton-compatible-pkg', cat: '可执行', desc: 'macOS 安装包'},
    {ext: '.deb', mime: 'application/x-deb', cat: '可执行', desc: 'Debian 安装包'},
    {ext: '.rpm', mime: 'application/x-rpm', cat: '可执行', desc: 'Red Hat 安装包'},
    {ext: '.apk', mime: 'application/vnd.android.package-archive', cat: '可执行', desc: 'Android 安装包'},
    {ext: '.ipa', mime: 'application/iphone', cat: '可执行', desc: 'iOS 安装包'},
    {ext: '.app', mime: 'application/x-apple-application', cat: '可执行', desc: 'macOS 应用'},

    // 其他
    {ext: '.wasm', mime: 'application/wasm', cat: '其他', desc: 'WebAssembly 二进制'},
    {ext: '.rtf', mime: 'application/rtf', cat: '其他', desc: '富文本格式'},
    {ext: '.epub', mime: 'application/epub+zip', cat: '其他', desc: 'EPUB 电子书'},
    {ext: '.iso', mime: 'application/x-iso9660-image', cat: '其他', desc: '光盘镜像'},
    {ext: '.torrent', mime: 'application/x-bittorrent', cat: '其他', desc: 'BT 种子'},
    {ext: '.ics', mime: 'text/calendar', cat: '其他', desc: 'iCalendar 日历'},
    {ext: '.swf', mime: 'application/x-shockwave-flash', cat: '其他', desc: 'Flash（已弃用）'},
];

let mimetypeSearchTimer = null;

function mimetypeRender(filter) {
    const container = document.getElementById('mimetypeContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    const list = filter
        ? MIME_TYPES.filter(m =>
            m.ext.toLowerCase().includes(filter) ||
            m.mime.toLowerCase().includes(filter) ||
            m.cat.toLowerCase().includes(filter) ||
            m.desc.toLowerCase().includes(filter))
        : MIME_TYPES;
    if (!list.length) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
        return;
    }

    const catColor = {
        '文本': '#2196f3',
        '图片': '#9c27b0',
        '音频': '#ff9800',
        '视频': '#f44336',
        '应用': '#4caf50',
        '办公': '#00bcd4',
        '字体': '#795548',
        '可执行': '#607d8b',
        '其他': '#9e9e9e',
    };

    const header = document.createElement('div');
    header.style.cssText = 'display:grid;grid-template-columns:200px 1fr 70px 1fr;background:var(--bg-input);font-weight:600;border-radius:4px;padding:6px 0;margin-bottom:6px;font-size:12px;position:sticky;top:52px;z-index:5';
    header.innerHTML = `
        <span style="padding:4px 10px">扩展名</span>
        <span style="padding:4px 10px">MIME 类型</span>
        <span style="padding:4px 10px">类别</span>
        <span style="padding:4px 10px">说明</span>
    `;
    container.appendChild(header);

    list.forEach(m => {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:200px 1fr 70px 1fr;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;transition:background .12s;border-radius:4px';
        row.onmouseenter = () => row.style.background = 'var(--glass)';
        row.onmouseleave = () => row.style.background = '';
        row.innerHTML = `
            <span style="padding:4px 10px"><code style="background:var(--bg-input);padding:2px 6px;border-radius:3px;color:var(--accent2);font-weight:600">${m.ext}</code></span>
            <span style="padding:4px 10px;color:var(--text);font-family:var(--font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${m.mime}">${m.mime}</span>
            <span style="padding:4px 10px"><span style="background:${catColor[m.cat] || '#607d8b'};color:#fff;padding:1px 6px;border-radius:3px;font-size:10px">${m.cat}</span></span>
            <span style="padding:4px 10px;color:var(--text-dim)">${m.desc}</span>
        `;
        row.addEventListener('click', () => safeCopy(m.mime));
        container.appendChild(row);
    });
}

function mimetypeSearch() {
    clearTimeout(mimetypeSearchTimer);
    mimetypeSearchTimer = setTimeout(() => {
        mimetypeRender(document.getElementById('mimetypeSearch').value);
    }, 200);
}

registerInit('mimetype', mimetypeRender);
