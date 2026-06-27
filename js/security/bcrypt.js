// bcrypt 加密 / 验证
// 依赖：dcodeIO.bcrypt（由 /lib/bcrypt.min.js 提供，UMD 暴露）

async function bcryptHash() {
    const pwd = document.getElementById('bcryptPwd').value;
    const rounds = parseInt(document.getElementById('bcryptRounds').value) || 10;
    const out = document.getElementById('bcryptOutput');
    if (!pwd) {
        out.textContent = '请输入明文密码';
        out.className = 'output-box error';
        return;
    }
    if (rounds < 4 || rounds > 14) {
        out.textContent = 'cost 必须在 4~14 之间';
        out.className = 'output-box error';
        return;
    }
    if (typeof dcodeIO === 'undefined' || !dcodeIO.bcrypt) {
        out.textContent = 'bcrypt 库未加载';
        out.className = 'output-box error';
        return;
    }
    try {
        setStatus('正在计算（cost=' + rounds + '）...');
        // 让 UI 有机会刷新
        await new Promise((r) => setTimeout(r, 10));
        const hash = dcodeIO.bcrypt.hashSync(pwd, rounds);
        out.textContent = hash;
        out.className = 'output-box';
        setStatus('bcrypt 哈希已生成');
    } catch (e) {
        out.textContent = '生成失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function bcryptVerify() {
    const pwd = document.getElementById('bcryptVerifyPwd').value;
    const hash = document.getElementById('bcryptVerifyHash').value.trim();
    const out = document.getElementById('bcryptVerifyOutput');
    if (!pwd || !hash) {
        out.textContent = '请输入明文和哈希值';
        out.className = 'output-box error';
        return;
    }
    if (typeof dcodeIO === 'undefined' || !dcodeIO.bcrypt) {
        out.textContent = 'bcrypt 库未加载';
        out.className = 'output-box error';
        return;
    }
    try {
        const ok = dcodeIO.bcrypt.compareSync(pwd, hash);
        out.textContent = ok ? '✓ 匹配' : '✗ 不匹配';
        out.className = 'output-box' + (ok ? '' : ' error');
        out.style.color = ok ? 'var(--accent)' : 'var(--danger)';
        setStatus(ok ? '密码匹配' : '密码不匹配');
    } catch (e) {
        out.textContent = '验证失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function bcryptClear() {
    document.getElementById('bcryptPwd').value = '';
    document.getElementById('bcryptOutput').textContent = '';
    document.getElementById('bcryptVerifyPwd').value = '';
    document.getElementById('bcryptVerifyHash').value = '';
    document.getElementById('bcryptVerifyOutput').textContent = '';
    setStatus('已清空');
}
