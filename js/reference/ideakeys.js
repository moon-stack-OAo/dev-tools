const IDEA_KEYS = [
    {
        cat: '编辑',
        items: [
            {
                cmd: 'Ctrl + Space',
                syntax: 'Ctrl + Space',
                desc: '代码补全（基本）',
                examples: ['输入 syso 后按 Ctrl+Space 补全 System.out.println()']
            },
            {
                cmd: 'Ctrl + Shift + Space',
                syntax: 'Ctrl + Shift + Space',
                desc: '智能代码补全（类型匹配）',
                examples: ['自动补全当前上下文期望的类型']
            },
            {
                cmd: 'Ctrl + Alt + Space',
                syntax: 'Ctrl + Alt + Space',
                desc: '类名补全',
                examples: ['输入 Arr 后按 Ctrl+Alt+Space 补全 Arrays/ArrayList 等']
            },
            {
                cmd: 'Ctrl + Shift + Enter',
                syntax: 'Ctrl + Shift + Enter',
                desc: '自动补全当前语句',
                examples: ['自动添加分号、括号等']
            },
            {
                cmd: 'Ctrl + P',
                syntax: 'Ctrl + P',
                desc: '查看方法参数信息',
                examples: ['在方法调用时显示参数类型和名称']
            },
            {cmd: 'Ctrl + Q', syntax: 'Ctrl + Q', desc: '快速文档查看', examples: ['查看类/方法的 Javadoc 文档']},
            {
                cmd: 'Ctrl + Shift + I',
                syntax: 'Ctrl + Shift + I',
                desc: '快速定义查看',
                examples: ['查看方法/类的定义']
            },
            {
                cmd: 'Alt + Enter',
                syntax: 'Alt + Enter',
                desc: '显示意图操作 / 快速修复',
                examples: ['自动导入类、创建方法、修复警告等']
            },
            {
                cmd: 'Ctrl + Alt + L',
                syntax: 'Ctrl + Alt + L',
                desc: '格式化代码',
                examples: ['自动格式化选中代码或整个文件']
            },
            {
                cmd: 'Ctrl + Alt + O',
                syntax: 'Ctrl + Alt + O',
                desc: '优化 import',
                examples: ['自动删除未使用的 import']
            },
            {cmd: 'Ctrl + /', syntax: 'Ctrl + /', desc: '行注释', examples: ['注释/取消注释当前行']},
            {
                cmd: 'Ctrl + Shift + /',
                syntax: 'Ctrl + Shift + /',
                desc: '块注释',
                examples: ['注释/取消注释选中的代码块']
            },
            {cmd: 'Ctrl + W', syntax: 'Ctrl + W', desc: '扩展选择', examples: ['逐步选择更大范围的代码']},
            {cmd: 'Ctrl + Shift + W', syntax: 'Ctrl + Shift + W', desc: '收缩选择', examples: ['逐步缩小选择范围']},
            {cmd: 'Ctrl + D', syntax: 'Ctrl + D', desc: '复制当前行', examples: ['复制光标所在行到下一行']},
            {cmd: 'Ctrl + Y', syntax: 'Ctrl + Y', desc: '删除当前行', examples: ['删除光标所在行']},
            {cmd: 'Ctrl + Shift + J', syntax: 'Ctrl + Shift + J', desc: '合并行', examples: ['将多行合并为一行']},
            {cmd: 'Ctrl + Enter', syntax: 'Ctrl + Enter', desc: '拆分行', examples: ['在光标处拆分当前行']},
            {cmd: 'Shift + Enter', syntax: 'Shift + Enter', desc: '在下方新建行', examples: ['在当前行下方新建空行']},
            {
                cmd: 'Ctrl + Shift + U',
                syntax: 'Ctrl + Shift + U',
                desc: '切换大小写',
                examples: ['将选中文本切换大小写']
            }
        ]
    },
    {
        cat: '导航',
        items: [
            {cmd: 'Ctrl + N', syntax: 'Ctrl + N', desc: '查找类', examples: ['输入 UserService 查找该类']},
            {
                cmd: 'Ctrl + Shift + N',
                syntax: 'Ctrl + Shift + N',
                desc: '查找文件',
                examples: ['输入 application.yml 查找配置文件']
            },
            {
                cmd: 'Ctrl + Alt + Shift + N',
                syntax: 'Ctrl + Alt + Shift + N',
                desc: '查找符号',
                examples: ['查找方法名、变量名等']
            },
            {cmd: 'Ctrl + E', syntax: 'Ctrl + E', desc: '最近打开的文件', examples: ['显示最近编辑的文件列表']},
            {
                cmd: 'Ctrl + Shift + E',
                syntax: 'Ctrl + Shift + E',
                desc: '最近修改的文件',
                examples: ['显示最近修改的文件列表']
            },
            {cmd: 'Ctrl + G', syntax: 'Ctrl + G', desc: '跳转到指定行', examples: ['输入行号跳转']},
            {cmd: 'Ctrl + B', syntax: 'Ctrl + B', desc: '跳转到声明', examples: ['跳转到变量/方法的声明处']},
            {cmd: 'Ctrl + Alt + B', syntax: 'Ctrl + Alt + B', desc: '跳转到实现', examples: ['跳转到接口的实现类']},
            {
                cmd: 'Ctrl + Shift + B',
                syntax: 'Ctrl + Shift + B',
                desc: '跳转到类型声明',
                examples: ['跳转到变量类型的定义']
            },
            {cmd: 'Ctrl + U', syntax: 'Ctrl + U', desc: '跳转到父类/方法', examples: ['跳转到父类或重写的方法']},
            {
                cmd: 'Ctrl + Shift + Backspace',
                syntax: 'Ctrl + Shift + Backspace',
                desc: '跳转到上次编辑位置',
                examples: ['返回上次编辑的代码位置']
            },
            {cmd: 'Ctrl + F12', syntax: 'Ctrl + F12', desc: '文件结构弹窗', examples: ['显示当前文件的结构大纲']},
            {cmd: 'Alt + 7', syntax: 'Alt + 7', desc: '显示文件结构', examples: ['在侧边栏显示文件结构']},
            {cmd: 'Ctrl + Alt + Left', syntax: 'Ctrl + Alt + Left', desc: '后退', examples: ['返回上一个导航位置']},
            {cmd: 'Ctrl + Alt + Right', syntax: 'Ctrl + Alt + Right', desc: '前进', examples: ['前进到下一个导航位置']}
        ]
    },
    {
        cat: '搜索与替换',
        items: [
            {cmd: 'Ctrl + F', syntax: 'Ctrl + F', desc: '查找', examples: ['在当前文件中查找文本']},
            {cmd: 'Ctrl + R', syntax: 'Ctrl + R', desc: '替换', examples: ['在当前文件中替换文本']},
            {cmd: 'Ctrl + Shift + F', syntax: 'Ctrl + Shift + F', desc: '全局查找', examples: ['在整个项目中查找文本']},
            {cmd: 'Ctrl + Shift + R', syntax: 'Ctrl + Shift + R', desc: '全局替换', examples: ['在整个项目中替换文本']},
            {cmd: 'F3', syntax: 'F3', desc: '查找下一个', examples: ['跳转到下一个匹配项']},
            {cmd: 'Shift + F3', syntax: 'Shift + F3', desc: '查找上一个', examples: ['跳转到上一个匹配项']},
            {cmd: 'Ctrl + F3', syntax: 'Ctrl + F3', desc: '查找当前单词', examples: ['查找光标所在单词']},
            {cmd: 'Alt + J', syntax: 'Alt + J', desc: '选择下一个匹配', examples: ['多光标选择下一个匹配项']},
            {
                cmd: 'Ctrl + Alt + Shift + J',
                syntax: 'Ctrl + Alt + Shift + J',
                desc: '选择所有匹配',
                examples: ['多光标选择所有匹配项']
            }
        ]
    },
    {
        cat: '重构',
        items: [
            {
                cmd: 'Shift + F6',
                syntax: 'Shift + F6',
                desc: '重命名',
                examples: ['重命名变量/方法/类，自动更新所有引用']
            },
            {
                cmd: 'Ctrl + Alt + Shift + T',
                syntax: 'Ctrl + Alt + Shift + T',
                desc: '重构菜单',
                examples: ['打开重构选项菜单']
            },
            {cmd: 'F6', syntax: 'F6', desc: '移动', examples: ['移动类/方法到其他包/类']},
            {cmd: 'F5', syntax: 'F5', desc: '复制', examples: ['复制类/方法']},
            {cmd: 'Alt + Delete', syntax: 'Alt + Delete', desc: '安全删除', examples: ['删除前检查引用']},
            {cmd: 'Ctrl + Alt + M', syntax: 'Ctrl + Alt + M', desc: '提取方法', examples: ['将选中代码提取为新方法']},
            {cmd: 'Ctrl + Alt + V', syntax: 'Ctrl + Alt + V', desc: '提取变量', examples: ['将表达式提取为变量']},
            {cmd: 'Ctrl + Alt + F', syntax: 'Ctrl + Alt + F', desc: '提取字段', examples: ['将表达式提取为字段']},
            {cmd: 'Ctrl + Alt + C', syntax: 'Ctrl + Alt + C', desc: '提取常量', examples: ['将值提取为常量']},
            {cmd: 'Ctrl + Alt + P', syntax: 'Ctrl + Alt + P', desc: '提取参数', examples: ['将表达式提取为方法参数']}
        ]
    },
    {
        cat: '运行与调试',
        items: [
            {cmd: 'Shift + F10', syntax: 'Shift + F10', desc: '运行', examples: ['运行当前配置']},
            {cmd: 'Shift + F9', syntax: 'Shift + F9', desc: '调试', examples: ['以调试模式运行']},
            {
                cmd: 'Ctrl + Shift + F10',
                syntax: 'Ctrl + Shift + F10',
                desc: '运行当前上下文',
                examples: ['运行当前类或方法']
            },
            {cmd: 'Alt + Shift + F10', syntax: 'Alt + Shift + F10', desc: '选择配置运行', examples: ['选择运行配置']},
            {cmd: 'F8', syntax: 'F8', desc: '步过（Step Over）', examples: ['执行当前行，跳到下一行']},
            {cmd: 'F7', syntax: 'F7', desc: '步入（Step Into）', examples: ['进入方法内部']},
            {cmd: 'Shift + F7', syntax: 'Shift + F7', desc: '智能步入', examples: ['选择进入哪个方法']},
            {cmd: 'Shift + F8', syntax: 'Shift + F8', desc: '步出（Step Out）', examples: ['从当前方法返回']},
            {cmd: 'Alt + F9', syntax: 'Alt + F9', desc: '运行到光标处', examples: ['执行到光标所在行']},
            {cmd: 'Alt + F8', syntax: 'Alt + F8', desc: '计算表达式', examples: ['在调试时计算表达式值']},
            {cmd: 'F9', syntax: 'F9', desc: '恢复程序', examples: ['继续执行到下一个断点']},
            {cmd: 'Ctrl + F2', syntax: 'Ctrl + F2', desc: '停止', examples: ['停止运行/调试']},
            {cmd: 'Ctrl + F8', syntax: 'Ctrl + F8', desc: '切换断点', examples: ['在当前行添加/删除断点']},
            {cmd: 'Ctrl + Shift + F8', syntax: 'Ctrl + Shift + F8', desc: '查看所有断点', examples: ['管理所有断点']}
        ]
    },
    {
        cat: '版本控制',
        items: [
            {cmd: 'Ctrl + K', syntax: 'Ctrl + K', desc: '提交', examples: ['打开提交对话框']},
            {cmd: 'Ctrl + Shift + K', syntax: 'Ctrl + Shift + K', desc: '推送', examples: ['推送到远程仓库']},
            {cmd: 'Ctrl + T', syntax: 'Ctrl + T', desc: '更新项目', examples: ['从远程拉取更新']},
            {cmd: 'Alt + Shift + C', syntax: 'Alt + Shift + C', desc: '查看最近变更', examples: ['查看最近修改的文件']},
            {cmd: 'Ctrl + Alt + Z', syntax: 'Ctrl + Alt + Z', desc: '撤销变更', examples: ['撤销文件的本地修改']},
            {cmd: 'Alt + `', syntax: 'Alt + `', desc: 'VCS 操作弹窗', examples: ['打开版本控制操作菜单']}
        ]
    },
    {
        cat: '代码生成',
        items: [
            {
                cmd: 'Alt + Insert',
                syntax: 'Alt + Insert',
                desc: '生成代码',
                examples: ['生成 Getter/Setter/构造器/toString 等']
            },
            {cmd: 'Ctrl + O', syntax: 'Ctrl + O', desc: '覆盖方法', examples: ['覆盖父类方法']},
            {cmd: 'Ctrl + I', syntax: 'Ctrl + I', desc: '实现方法', examples: ['实现接口方法']},
            {cmd: 'Ctrl + Alt + T', syntax: 'Ctrl + Alt + T', desc: '包围代码', examples: ['用 if/try/for 等包围代码']},
            {cmd: 'Ctrl + J', syntax: 'Ctrl + J', desc: '插入模板', examples: ['插入 Live Template']},
            {cmd: 'iter', syntax: 'iter + Tab', desc: '迭代循环模板', examples: ['生成 for 循环']},
            {cmd: 'sout', syntax: 'sout + Tab', desc: 'System.out.println', examples: ['生成打印语句']},
            {cmd: 'psvm', syntax: 'psvm + Tab', desc: 'main 方法模板', examples: ['生成 main 方法']},
            {cmd: 'fori', syntax: 'fori + Tab', desc: 'for 循环模板', examples: ['生成带索引的 for 循环']},
            {cmd: 'ifn', syntax: 'ifn + Tab', desc: 'if null 模板', examples: ['生成 if (x == null) 语句']},
            {cmd: 'inn', syntax: 'inn + Tab', desc: 'if not null 模板', examples: ['生成 if (x != null) 语句']}
        ]
    },
    {
        cat: '窗口与工具',
        items: [
            {cmd: 'Alt + 1', syntax: 'Alt + 1', desc: '项目窗口', examples: ['打开项目结构面板']},
            {cmd: 'Alt + 4', syntax: 'Alt + 4', desc: '运行窗口', examples: ['打开运行输出面板']},
            {cmd: 'Alt + 5', syntax: 'Alt + 5', desc: '调试窗口', examples: ['打开调试面板']},
            {cmd: 'Alt + 6', syntax: 'Alt + 6', desc: 'TODO 窗口', examples: ['打开 TODO 列表']},
            {cmd: 'Alt + 9', syntax: 'Alt + 9', desc: '版本控制窗口', examples: ['打开 Git 面板']},
            {cmd: 'Alt + 12', syntax: 'Alt + 12', desc: '终端窗口', examples: ['打开终端']},
            {
                cmd: 'Ctrl + Shift + F12',
                syntax: 'Ctrl + Shift + F12',
                desc: '最大化编辑器',
                examples: ['隐藏所有工具窗口']
            },
            {cmd: 'Ctrl + Alt + S', syntax: 'Ctrl + Alt + S', desc: '打开设置', examples: ['打开 IDEA 设置']},
            {cmd: 'Ctrl + Shift + A', syntax: 'Ctrl + Shift + A', desc: '查找操作', examples: ['搜索任意操作命令']},
            {cmd: 'Ctrl + Tab', syntax: 'Ctrl + Tab', desc: '切换工具窗口', examples: ['在打开的窗口间切换']}
        ]
    },
    {
        cat: 'Mac 快捷键映射',
        items: [
            {cmd: '⌘ + Space', syntax: '⌘ + Space', desc: '代码补全', examples: ['对应 Windows Ctrl + Space']},
            {cmd: '⌘ + N', syntax: '⌘ + N', desc: '查找类', examples: ['对应 Windows Ctrl + N']},
            {
                cmd: '⌘ + Shift + N',
                syntax: '⌘ + Shift + N',
                desc: '查找文件',
                examples: ['对应 Windows Ctrl + Shift + N']
            },
            {cmd: '⌘ + B', syntax: '⌘ + B', desc: '跳转到声明', examples: ['对应 Windows Ctrl + B']},
            {cmd: '⌘ + Alt + L', syntax: '⌘ + Alt + L', desc: '格式化代码', examples: ['对应 Windows Ctrl + Alt + L']},
            {cmd: '⌘ + /', syntax: '⌘ + /', desc: '行注释', examples: ['对应 Windows Ctrl + /']},
            {cmd: '⌘ + D', syntax: '⌘ + D', desc: '复制当前行', examples: ['对应 Windows Ctrl + D']},
            {cmd: '⌘ + Y', syntax: '⌘ + Y', desc: '删除当前行', examples: ['对应 Windows Ctrl + Y']},
            {cmd: '⌃ + Space', syntax: '⌃ + Space', desc: '代码补全', examples: ['Mac 原生冲突，需修改快捷键']},
            {cmd: '⌘ + Shift + T', syntax: '⌘ + Shift + T', desc: '查找测试类', examples: ['跳转到对应的测试类']},
            {cmd: '⌘ + Alt + M', syntax: '⌘ + Alt + M', desc: '提取方法', examples: ['对应 Windows Ctrl + Alt + M']},
            {cmd: '⌘ + Alt + V', syntax: '⌘ + Alt + V', desc: '提取变量', examples: ['对应 Windows Ctrl + Alt + V']}
        ]
    }
];

let _ideakeysSearchTimer = null;

function ideakeysEscapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ideakeysCopyPre(btn, ev) {
    if (ev) ev.stopPropagation();
    const pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    safeCopy(pre.innerText);
}

function ideakeysRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('ideakeysSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase();
    const container = document.getElementById('ideakeysContent');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    IDEA_KEYS.forEach(group => {
        const matched = filter
            ? group.items.filter(it =>
                it.cmd.toLowerCase().includes(filter) ||
                it.desc.toLowerCase().includes(filter) ||
                (it.syntax && it.syntax.toLowerCase().includes(filter)) ||
                (it.examples && it.examples.some(ex => ex.toLowerCase().includes(filter))))
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${ideakeysEscapeHtml(group.cat)}</div>`;
        matched.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${ideakeysEscapeHtml(item.cmd)}</code><span class="ref-cmd-desc">${ideakeysEscapeHtml(item.desc)}</span><button class="sm outline" onclick="safeCopy('${ideakeysEscapeHtml(item.cmd).replace(/'/g, "\\'")}')">复制</button></div>`;
            if (item.examples && item.examples.length) {
                html += `<div class="ref-section-title">示例</div>`;
                html += `<div style="font-size:11px;color:var(--text-dim)">${ideakeysEscapeHtml(item.examples[0])}</div>`;
            }
            card.innerHTML = html;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function ideakeysSearch() {
    clearTimeout(_ideakeysSearchTimer);
    _ideakeysSearchTimer = setTimeout(function () {
        const el = document.getElementById('ideakeysSearch');
        ideakeysRender(el ? el.value : '');
    }, 200);
}

registerInit('ideakeys', ideakeysRender);
