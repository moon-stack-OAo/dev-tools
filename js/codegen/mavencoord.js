// Maven 坐标 → 依赖片段

/**
 * 解析 GAV 文本
 * 支持：
 * - groupId:artifactId:version
 * - groupId:artifactId:packaging:version
 * - groupId:artifactId:packaging:classifier:version
 * - 多行 key=value / key:value（groupId / artifactId / version / ...）
 * @param {string} raw
 * @returns {object}
 */
function parseMavenCoord(raw) {
    const result = {
        groupId: '',
        artifactId: '',
        version: '',
        packaging: '',
        classifier: '',
        scope: '',
        optional: false,
        type: '',
    };
    if (!raw || !String(raw).trim()) {
        throw new Error('请输入 Maven 坐标');
    }
    const text = String(raw).trim();

    // 多行属性
    if (/groupId\s*[=:]/i.test(text) || /artifactId\s*[=:]/i.test(text)) {
        text.split(/\r?\n/).forEach(function (line) {
            const m = line.match(/^\s*([A-Za-z]+)\s*[=:]\s*(.+?)\s*$/);
            if (!m) return;
            const k = m[1].toLowerCase();
            const v = m[2].trim();
            if (k === 'groupid') result.groupId = v;
            else if (k === 'artifactid') result.artifactId = v;
            else if (k === 'version') result.version = v;
            else if (k === 'packaging' || k === 'type') result.packaging = v;
            else if (k === 'classifier') result.classifier = v;
            else if (k === 'scope') result.scope = v;
            else if (k === 'optional') result.optional = /^(true|1|yes)$/i.test(v);
        });
    } else {
        // 冒号分隔：取第一行
        const line = text.split(/\r?\n/)[0].trim();
        // 去掉可能的 @scope 后缀：g:a:v@runtime
        let scopeFromAt = '';
        let core = line;
        const at = line.lastIndexOf('@');
        if (at > 0) {
            scopeFromAt = line.slice(at + 1).trim();
            core = line.slice(0, at).trim();
        }
        const parts = core.split(':').map(function (p) {
            return p.trim();
        });
        if (parts.length < 2) {
            throw new Error('格式应为 groupId:artifactId:version');
        }
        result.groupId = parts[0];
        result.artifactId = parts[1];
        if (parts.length === 2) {
            // g:a 无 version
        } else if (parts.length === 3) {
            result.version = parts[2];
        } else if (parts.length === 4) {
            // g:a:packaging:version
            result.packaging = parts[2];
            result.version = parts[3];
        } else if (parts.length >= 5) {
            // g:a:packaging:classifier:version
            result.packaging = parts[2];
            result.classifier = parts[3];
            result.version = parts[4];
        }
        if (scopeFromAt) result.scope = scopeFromAt;
    }

    if (!result.groupId || !result.artifactId) {
        throw new Error('groupId 与 artifactId 不能为空');
    }
    // packaging=jar 时常省略
    if (result.packaging === 'jar') result.packaging = '';
    return result;
}

function xmlEscape(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {object} coord
 * @param {object} [options]
 * @returns {{maven:string, gradleGroovy:string, gradleKotlin:string, sbt:string, coords:string}}
 */
function formatMavenDependency(coord, options) {
    options = options || {};
    const c = Object.assign({}, coord);
    if (options.scope) c.scope = options.scope;
    if (options.optional != null) c.optional = options.optional;

    const type = c.packaging || c.type || '';
    const hasClassifier = !!c.classifier;
    const hasType = !!type && type !== 'jar';

    // Maven XML
    let maven = '<dependency>\n';
    maven += '    <groupId>' + xmlEscape(c.groupId) + '</groupId>\n';
    maven += '    <artifactId>' + xmlEscape(c.artifactId) + '</artifactId>\n';
    if (c.version) {
        maven += '    <version>' + xmlEscape(c.version) + '</version>\n';
    }
    if (hasType) {
        maven += '    <type>' + xmlEscape(type) + '</type>\n';
    }
    if (hasClassifier) {
        maven += '    <classifier>' + xmlEscape(c.classifier) + '</classifier>\n';
    }
    if (c.scope && c.scope !== 'compile') {
        maven += '    <scope>' + xmlEscape(c.scope) + '</scope>\n';
    }
    if (c.optional) {
        maven += '    <optional>true</optional>\n';
    }
    maven += '</dependency>';

    // Gradle Groovy：implementation 'g:a:v'
    // 带 classifier: g:a:v:classifier 或 g:a:v@type
    function gradleNotation(kotlin) {
        let n = c.groupId + ':' + c.artifactId;
        if (c.version) n += ':' + c.version;
        if (hasClassifier) n += ':' + c.classifier;
        if (hasType) n += '@' + type;
        const conf = gradleConfig(c.scope, c.optional);
        if (kotlin) {
            return conf + '("' + n.replace(/"/g, '\\"') + '")';
        }
        return conf + " '" + n.replace(/'/g, "\\'") + "'";
    }

    const gradleGroovy = gradleNotation(false);
    const gradleKotlin = gradleNotation(true);

    // SBT（Java 依赖用 %）
    let sbt = '"' + c.groupId + '" % "' + c.artifactId + '"';
    if (c.version) sbt += ' % "' + c.version + '"';
    if (c.scope === 'test') sbt += ' % Test';
    else if (c.scope === 'provided') sbt += ' % "provided"';

    // 短坐标
    let coords = c.groupId + ':' + c.artifactId;
    if (c.version) coords += ':' + c.version;

    // BOM 提示片段
    let bom = '';
    if (options.asBom) {
        bom =
            '<dependency>\n' +
            '    <groupId>' +
            xmlEscape(c.groupId) +
            '</groupId>\n' +
            '    <artifactId>' +
            xmlEscape(c.artifactId) +
            '</artifactId>\n' +
            (c.version ? '    <version>' + xmlEscape(c.version) + '</version>\n' : '') +
            '    <type>pom</type>\n' +
            '    <scope>import</scope>\n' +
            '</dependency>';
    }

    return {
        maven: maven,
        gradleGroovy: gradleGroovy,
        gradleKotlin: gradleKotlin,
        sbt: sbt,
        coords: coords,
        bom: bom,
        coord: c,
    };
}

function gradleConfig(scope, optional) {
    if (optional) return 'compileOnly';
    const s = (scope || 'compile').toLowerCase();
    if (s === 'test') return 'testImplementation';
    if (s === 'provided') return 'compileOnly';
    if (s === 'runtime') return 'runtimeOnly';
    if (s === 'system') return 'compileOnly';
    return 'implementation';
}

function mavencoordGenerate() {
    const raw = document.getElementById('mcInput').value;
    const scope = document.getElementById('mcScope').value;
    const optional = document.getElementById('mcOptional').checked;
    const asBom = document.getElementById('mcBom').checked;
    const out = document.getElementById('mcOutput');
    try {
        const coord = parseMavenCoord(raw);
        const fmt = formatMavenDependency(coord, {
            scope: scope || coord.scope,
            optional: optional,
            asBom: asBom,
        });
        const blocks = [];
        blocks.push('── Maven (pom.xml) ──\n' + fmt.maven);
        if (asBom && fmt.bom) {
            blocks.push('── Maven BOM import (dependencyManagement) ──\n' + fmt.bom);
        }
        blocks.push('── Gradle (Groovy) ──\n' + fmt.gradleGroovy);
        blocks.push('── Gradle (Kotlin DSL) ──\n' + fmt.gradleKotlin);
        blocks.push('── SBT ──\n' + fmt.sbt);
        blocks.push('── 短坐标 ──\n' + fmt.coords);
        // 仓库搜索链接（仅展示，不自动请求）
        blocks.push(
            '── 搜索 ──\n' +
                'Maven Central: https://search.maven.org/artifact/' +
                encodeURIComponent(fmt.coord.groupId) +
                '/' +
                encodeURIComponent(fmt.coord.artifactId) +
                (fmt.coord.version ? '/' + encodeURIComponent(fmt.coord.version) : ''),
        );
        out.textContent = blocks.join('\n\n');
        out.className = 'output-box';
        setStatus('依赖片段已生成');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function mavencoordLoadSample() {
    document.getElementById('mcInput').value = 'org.springframework.boot:spring-boot-starter-web:3.2.5';
    document.getElementById('mcScope').value = '';
    document.getElementById('mcOptional').checked = false;
    document.getElementById('mcBom').checked = false;
    setStatus('已加载示例');
}

function mavencoordClear() {
    document.getElementById('mcInput').value = '';
    document.getElementById('mcOutput').textContent = '';
    setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseMavenCoord: parseMavenCoord,
        formatMavenDependency: formatMavenDependency,
        gradleConfig: gradleConfig,
    };
}
