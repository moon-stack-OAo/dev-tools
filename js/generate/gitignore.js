// .gitignore 模板合并生成

const gitignoreTemplates = [
    {
        id: 'node',
        name: 'Node',
        group: '语言',
        rules: [
            'node_modules/',
            'npm-debug.log*',
            'yarn-debug.log*',
            'yarn-error.log*',
            'pnpm-debug.log*',
            'lerna-debug.log*',
            'dist/',
            'build/',
            'coverage/',
            '.nyc_output/',
            '*.tsbuildinfo',
            '.npm',
            '.eslintcache',
        ],
    },
    {
        id: 'python',
        name: 'Python',
        group: '语言',
        rules: [
            '__pycache__/',
            '*.py[cod]',
            '*$py.class',
            '.Python',
            'venv/',
            '.venv/',
            'env/',
            '.env/',
            '*.egg-info/',
            '.eggs/',
            'dist/',
            'build/',
            '.pytest_cache/',
            '.mypy_cache/',
            '.ruff_cache/',
            '.coverage',
            'htmlcov/',
        ],
    },
    {
        id: 'java',
        name: 'Java',
        group: '语言',
        rules: [
            'target/',
            '*.class',
            '*.jar',
            '*.war',
            '*.ear',
            '*.log',
            '.mtj.tmp/',
            'hs_err_pid*',
            'replay_pid*',
        ],
    },
    {
        id: 'go',
        name: 'Go',
        group: '语言',
        rules: [
            'bin/',
            'pkg/',
            '*.exe',
            '*.exe~',
            '*.dll',
            '*.so',
            '*.dylib',
            '*.test',
            '*.out',
            'vendor/',
            'go.work',
            'go.work.sum',
        ],
    },
    {
        id: 'rust',
        name: 'Rust',
        group: '语言',
        rules: [
            '/target/',
            '**/*.rs.bk',
            '*.pdb',
            'Cargo.lock',
        ],
    },
    {
        id: 'cpp',
        name: 'C/C++',
        group: '语言',
        rules: [
            '*.o',
            '*.obj',
            '*.so',
            '*.dylib',
            '*.dll',
            '*.a',
            '*.lib',
            '*.exe',
            '*.out',
            'cmake-build-*/',
            'build/',
            'CMakeCache.txt',
            'CMakeFiles/',
            'compile_commands.json',
        ],
    },
    {
        id: 'vue',
        name: 'Vue/Vite',
        group: '框架/生态',
        rules: [
            'node_modules/',
            'dist/',
            'dist-ssr/',
            '*.local',
            '.vite/',
            '.turbo/',
            '.output/',
            '.nuxt/',
            '.vercel/',
            '.netlify/',
        ],
    },
    {
        id: 'react',
        name: 'React',
        group: '框架/生态',
        rules: [
            'node_modules/',
            'build/',
            'dist/',
            '.next/',
            'out/',
            '.cache/',
            '.parcel-cache/',
            'storybook-static/',
            '*.tsbuildinfo',
        ],
    },
    {
        id: 'springboot',
        name: 'Spring Boot',
        group: '框架/生态',
        rules: [
            'target/',
            '.mvn/wrapper/maven-wrapper.jar',
            '!.mvn/wrapper/maven-wrapper.jar',
            '.gradle/',
            'build/',
            '!gradle/wrapper/gradle-wrapper.jar',
            'out/',
            '*.iml',
            'application-local.yml',
            'application-local.properties',
        ],
    },
    {
        id: 'android',
        name: 'Android',
        group: '框架/生态',
        rules: [
            '*.iml',
            '.gradle/',
            '/local.properties',
            '/.idea/',
            '.DS_Store',
            '/build/',
            '/captures/',
            '.externalNativeBuild/',
            '.cxx/',
            '*.apk',
            '*.ap_',
            '*.aab',
        ],
    },
    {
        id: 'ios',
        name: 'iOS/Xcode',
        group: '框架/生态',
        rules: [
            'xcuserdata/',
            '*.xcuserstate',
            'DerivedData/',
            'build/',
            '*.ipa',
            '*.dSYM.zip',
            '*.dSYM',
            'Pods/',
            '.swiftpm/',
            'timeline.xctimeline',
            'playground.xcworkspace',
        ],
    },
    {
        id: 'vscode',
        name: 'VS Code',
        group: 'IDE',
        rules: [
            '.vscode/*',
            '!.vscode/settings.json',
            '!.vscode/tasks.json',
            '!.vscode/launch.json',
            '!.vscode/extensions.json',
            '*.code-workspace',
            '.history/',
        ],
    },
    {
        id: 'intellij',
        name: 'IntelliJ',
        group: 'IDE',
        rules: [
            '.idea/',
            '*.iml',
            '*.iws',
            '*.ipr',
            'out/',
            '.idea_modules/',
        ],
    },
    {
        id: 'eclipse',
        name: 'Eclipse',
        group: 'IDE',
        rules: [
            '.metadata',
            'bin/',
            'tmp/',
            '*.tmp',
            '*.bak',
            '*.swp',
            '*~.nib',
            'local.properties',
            '.settings/',
            '.loadpath',
            '.recommenders',
            '.project',
            '.classpath',
        ],
    },
    {
        id: 'vim',
        name: 'Vim/Emacs',
        group: 'IDE',
        rules: [
            '*~',
            '*.swp',
            '*.swo',
            '.netrwhist',
            'Session.vim',
            '*#',
            '.#*',
            '.emacs.desktop',
            '.emacs.desktop.lock',
            'auto-save-list',
            'tramp',
            '.\\#*',
        ],
    },
    {
        id: 'windows',
        name: 'Windows',
        group: '系统',
        rules: [
            'Thumbs.db',
            'Thumbs.db:encryptable',
            'ehthumbs.db',
            'ehthumbs_vista.db',
            '*.stackdump',
            '[Dd]esktop.ini',
            '$RECYCLE.BIN/',
            '*.lnk',
        ],
    },
    {
        id: 'macos',
        name: 'macOS',
        group: '系统',
        rules: [
            '.DS_Store',
            '.AppleDouble',
            '.LSOverride',
            'Icon',
            '._*',
            '.DocumentRevisions-V100',
            '.fseventsd',
            '.Spotlight-V100',
            '.TemporaryItems',
            '.Trashes',
            '.VolumeIcon.icns',
            '.com.apple.timemachine.donotpresent',
        ],
    },
    {
        id: 'linux',
        name: 'Linux',
        group: '系统',
        rules: [
            '*~',
            '.fuse_hidden*',
            '.directory',
            '.Trash-*',
            '.nfs*',
        ],
    },
    {
        id: 'docker',
        name: 'Docker',
        group: '其它',
        rules: [
            '.dockerignore',
            'docker-compose.override.yml',
            '*.log',
        ],
    },
    {
        id: 'terraform',
        name: 'Terraform',
        group: '其它',
        rules: [
            '.terraform/',
            '*.tfstate',
            '*.tfstate.*',
            'crash.log',
            'crash.*.log',
            '*.tfvars',
            '*.tfvars.json',
            'override.tf',
            'override.tf.json',
            '*_override.tf',
            '*_override.tf.json',
            '.terraformrc',
            'terraform.rc',
        ],
    },
    {
        id: 'env',
        name: 'Env secrets',
        group: '其它',
        rules: [
            '.env',
            '.env.*',
            '!.env.example',
            '!.env.sample',
            '*.pem',
            '*.key',
            'secrets/',
            'credentials.json',
        ],
    },
];

/**
 * @param {string} id
 * @returns {{id:string,name:string,group:string,rules:string[]}|null}
 */
function gitignoreGetTemplate(id) {
    if (id == null || id === '') return null;
    for (let i = 0; i < gitignoreTemplates.length; i++) {
        if (gitignoreTemplates[i].id === id) return gitignoreTemplates[i];
    }
    return null;
}

/**
 * 合并选中模板，去重规则行，保留首次出现
 * @param {string[]} selectedIds
 * @returns {string}
 */
function gitignoreMerge(selectedIds) {
    const ids = Array.isArray(selectedIds) ? selectedIds : [];
    if (!ids.length) {
        return '# 请勾选至少一种模板\n';
    }

    const seen = Object.create(null);
    const parts = [];

    for (let i = 0; i < ids.length; i++) {
        const tpl = gitignoreGetTemplate(ids[i]);
        if (!tpl) continue;

        const lines = [];
        for (let j = 0; j < tpl.rules.length; j++) {
            const rule = String(tpl.rules[j]).trim();
            if (!rule) continue;
            if (seen[rule]) continue;
            seen[rule] = true;
            lines.push(rule);
        }
        if (!lines.length) continue;
        parts.push('# === ' + tpl.name + ' ===');
        parts.push(lines.join('\n'));
    }

    if (!parts.length) {
        return '# 未找到有效模板\n';
    }
    return parts.join('\n\n') + '\n';
}

function gitignoreGroups() {
    const order = [];
    const map = Object.create(null);
    for (let i = 0; i < gitignoreTemplates.length; i++) {
        const t = gitignoreTemplates[i];
        if (!map[t.group]) {
            map[t.group] = [];
            order.push(t.group);
        }
        map[t.group].push(t);
    }
    return order.map(function (g) {
        return { group: g, items: map[g] };
    });
}

function gitignoreGetSelectedIds() {
    const root = document.getElementById('giList');
    if (!root) return [];
    const boxes = root.querySelectorAll('input[type="checkbox"][data-gi-id]:checked');
    const ids = [];
    for (let i = 0; i < boxes.length; i++) {
        ids.push(boxes[i].getAttribute('data-gi-id'));
    }
    return ids;
}

function gitignoreRenderList() {
    const root = document.getElementById('giList');
    if (!root) return;
    const groups = gitignoreGroups();
    let html = '';
    for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const gid = 'gi-g-' + i;
        html += '<div class="gi-group">';
        html +=
            '<div class="gi-group-head">' +
            '<span class="gi-group-title">' +
            escapeHtml(g.group) +
            '</span>' +
            '<button type="button" class="outline gi-group-all" data-group-index="' +
            i +
            '" onclick="gitignoreToggleGroup(' +
            i +
            ')">全选本组</button>' +
            '</div>';
        html += '<div class="gi-checks" id="' + gid + '">';
        for (let j = 0; j < g.items.length; j++) {
            const t = g.items[j];
            html +=
                '<label class="gi-check">' +
                '<input type="checkbox" data-gi-id="' +
                escapeHtml(t.id) +
                '" onchange="gitignoreRender()">' +
                '<span>' +
                escapeHtml(t.name) +
                '</span>' +
                '</label>';
        }
        html += '</div></div>';
    }
    root.innerHTML = html;
}

function gitignoreToggleGroup(groupIndex) {
    const groups = gitignoreGroups();
    const g = groups[groupIndex];
    if (!g) return;
    const root = document.getElementById('giList');
    if (!root) return;
    const ids = g.items.map(function (t) {
        return t.id;
    });
    let allChecked = true;
    for (let i = 0; i < ids.length; i++) {
        const el = root.querySelector('input[data-gi-id="' + ids[i] + '"]');
        if (el && !el.checked) {
            allChecked = false;
            break;
        }
    }
    for (let i = 0; i < ids.length; i++) {
        const el = root.querySelector('input[data-gi-id="' + ids[i] + '"]');
        if (el) el.checked = !allChecked;
    }
    gitignoreRender();
}

function gitignoreRender() {
    const out = document.getElementById('giOutput');
    if (!out) return;
    const text = gitignoreMerge(gitignoreGetSelectedIds());
    out.value = text;
    if (typeof setStatus === 'function') {
        const n = gitignoreGetSelectedIds().length;
        setStatus(n ? '已合并 ' + n + ' 个模板' : '请勾选模板');
    }
}

function gitignoreCopy() {
    const el = document.getElementById('giOutput');
    const t = el ? el.value : '';
    if (!t || !String(t).trim()) {
        if (typeof toast === 'function') toast('无内容可复制');
        return;
    }
    if (typeof copyText === 'function') copyText('giOutput');
    else if (typeof safeCopy === 'function') safeCopy(t);
}

function gitignoreDownload() {
    const el = document.getElementById('giOutput');
    const t = el ? el.value : '';
    if (!t || !String(t).trim() || t.indexOf('请勾选') === 0) {
        if (typeof toast === 'function') toast('请先生成内容');
        return;
    }
    const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    if (typeof downloadBlob === 'function') {
        downloadBlob('.gitignore', blob);
    } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '.gitignore';
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
        }, 1000);
    }
    if (typeof setStatus === 'function') setStatus('已下载 .gitignore');
}

function gitignoreClear() {
    const root = document.getElementById('giList');
    if (root) {
        const boxes = root.querySelectorAll('input[type="checkbox"][data-gi-id]');
        for (let i = 0; i < boxes.length; i++) boxes[i].checked = false;
    }
    gitignoreRender();
    if (typeof setStatus === 'function') setStatus('已清空选择');
}

function gitignoreLoadExample() {
    const want = { node: true, vue: true, vscode: true };
    const root = document.getElementById('giList');
    if (root) {
        const boxes = root.querySelectorAll('input[type="checkbox"][data-gi-id]');
        for (let i = 0; i < boxes.length; i++) {
            const id = boxes[i].getAttribute('data-gi-id');
            boxes[i].checked = !!want[id];
        }
    }
    gitignoreRender();
    if (typeof setStatus === 'function') setStatus('已加载 Node + Vue + VS Code 示例');
}

if (typeof registerInit === 'function') {
    registerInit('gitignore', function () {
        gitignoreRenderList();
        gitignoreRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        gitignoreTemplates: gitignoreTemplates,
        gitignoreGetTemplate: gitignoreGetTemplate,
        gitignoreMerge: gitignoreMerge,
        gitignoreGroups: gitignoreGroups,
    };
}
