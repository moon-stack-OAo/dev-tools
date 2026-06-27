const GIT_CMDS = [
    {
        cat: '配置',
        items: [
            {cmd: 'git config --global user.name "Your Name"', desc: '设置用户名'},
            {cmd: 'git config --global user.email "email@example.com"', desc: '设置邮箱'},
            {cmd: 'git config --global core.autocrlf input', desc: '换行符设置'},
            {cmd: 'git config --list', desc: '查看配置'},
        ],
    },
    {
        cat: '仓库操作',
        items: [
            {cmd: 'git init', desc: '初始化仓库'},
            {cmd: 'git clone url', desc: '克隆仓库'},
            {cmd: 'git remote -v', desc: '查看远程仓库'},
            {cmd: 'git remote add origin url', desc: '添加远程仓库'},
            {cmd: 'git fetch origin', desc: '拉取远程更新(不合并)'},
            {cmd: 'git pull', desc: '拉取并合并'},
            {cmd: 'git push', desc: '推送本地提交'},
            {cmd: 'git push --force-with-lease', desc: '安全强制推送'},
        ],
    },
    {
        cat: '分支',
        items: [
            {cmd: 'git branch', desc: '查看本地分支'},
            {cmd: 'git branch -a', desc: '查看所有分支'},
            {cmd: 'git checkout -b feature', desc: '创建并切换分支'},
            {cmd: 'git switch feature', desc: '切换分支(新版)'},
            {cmd: 'git merge feature', desc: '合并分支'},
            {cmd: 'git rebase main', desc: '变基'},
            {cmd: 'git branch -d feature', desc: '删除分支'},
            {cmd: 'git push origin --delete feature', desc: '删除远程分支'},
        ],
    },
    {
        cat: '提交与修改',
        items: [
            {cmd: 'git status', desc: '查看工作区状态'},
            {cmd: 'git add .', desc: '暂存所有变更'},
            {cmd: 'git commit -m "msg"', desc: '提交'},
            {cmd: 'git commit --amend -m "msg"', desc: '修改上次提交'},
            {cmd: 'git reset HEAD file', desc: '取消暂存'},
            {cmd: 'git reset --soft HEAD~1', desc: '撤销提交(保留修改)'},
            {cmd: 'git reset --hard HEAD~1', desc: '撤销提交(删除修改)'},
            {cmd: 'git stash', desc: '暂存当前工作'},
            {cmd: 'git stash pop', desc: '恢复暂存'},
            {cmd: 'git stash list', desc: '暂存列表'},
        ],
    },
    {
        cat: '查看与比较',
        items: [
            {cmd: 'git log --oneline -10', desc: '最近 10 条提交'},
            {cmd: 'git log --graph --all', desc: '图形化提交历史'},
            {cmd: 'git diff', desc: '工作区与暂存区差异'},
            {cmd: 'git diff --cached', desc: '暂存区与上次提交差异'},
            {cmd: 'git blame file', desc: '文件每行修改人'},
            {cmd: 'git show commit', desc: '查看提交详情'},
        ],
    },
    {
        cat: '标签',
        items: [
            {cmd: 'git tag', desc: '查看标签'},
            {cmd: 'git tag v1.0.0', desc: '创建轻量标签'},
            {cmd: 'git tag -a v1.0.0 -m "msg"', desc: '创建注解标签'},
            {cmd: 'git push origin --tags', desc: '推送标签'},
        ],
    },
];

function gitRender() {
    const container = document.getElementById('gitContent');
    if (!container) return;
    container.innerHTML = '';
    GIT_CMDS.forEach((group) => {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${group.cat}</div>`;
        group.items.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            card.innerHTML = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.cmd.replace(/</g, '&lt;')}</code><span class="ref-cmd-desc">${item.desc.replace(/</g, '&lt;')}</span><button class="sm outline" onclick="safeCopy('${item.cmd.replace(/'/g, "\\'")}')">复制</button></div>`;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
}

registerInit('gitref', gitRender);
