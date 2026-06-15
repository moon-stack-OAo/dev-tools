function jwtDecode() {
    const token = document.getElementById('jwtInput').value.trim();
    const hEl = document.getElementById('jwtHeader'), pEl = document.getElementById('jwtPayload'),
        sEl = document.getElementById('jwtSig');
    if (!token) {
        hEl.textContent = '请输入 JWT Token';
        hEl.className = 'output-box error';
        pEl.textContent = '';
        sEl.textContent = '';
        return;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
        hEl.textContent = '无效的 JWT 格式（需要 3 段）';
        hEl.className = 'output-box error';
        pEl.textContent = '';
        sEl.textContent = '';
        return;
    }
    try {
        const h = JSON.parse(atob(parts[0])), p = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        hEl.textContent = JSON.stringify(h, null, 2);
        hEl.className = 'output-box';
        pEl.textContent = JSON.stringify(p, null, 2);
        pEl.className = 'output-box';
        if (p.exp) {
            const e = new Date(p.exp * 1000);
            const n = new Date();
            const expired = e < n;
            sEl.textContent = `签名: ${parts[2].substring(0, 20)}... | 过期时间: ${e.toISOString()} ${expired ? '(已过期)' : '(有效)'}`;
            sEl.style.color = expired ? 'var(--danger)' : 'var(--accent)';
        } else {
            sEl.textContent = `签名: ${parts[2].substring(0, 20)}... | (无过期时间)`;
            sEl.style.color = 'var(--text-dim)';
        }
        setStatus('JWT 解码成功');
    } catch (e) {
        hEl.textContent = '解码失败: ' + e.message;
        hEl.className = 'output-box error';
        pEl.textContent = '';
        sEl.textContent = '';
    }
}
