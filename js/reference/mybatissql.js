const MYBATIS_SQL_DATA = [
    {
        cat: '<if>',
        syntax: '<if test="字段 != null">...</if>',
        desc: '条件判断：test 为 true 时拼接内部 SQL（OGNL 表达式）',
        example: '<select id="list" resultType="User">\n  SELECT * FROM user\n  <where>\n    <if test="name != null and name != \'\'">\n      AND name LIKE CONCAT(\'%\', #{name}, \'%\')\n    </if>\n    <if test="status != null">\n      AND status = #{status}\n    </if>\n  </where>\n</select>'
    },
    {
        cat: '<where>',
        syntax: '<where>...</where>',
        desc: '自动剔除首个 AND/OR；若无内容则不生成 WHERE',
        example: '<select id="list" resultType="User">\n  SELECT * FROM user\n  <where>\n    <if test="name != null">AND name = #{name}</if>\n    <if test="age != null">AND age = #{age}</if>\n  </where>\n</select>'
    },
    {
        cat: '<set>',
        syntax: '<set>...</set>',
        desc: '用于 UPDATE SET 子句，自动剔除末尾逗号；常与 <if> 配合',
        example: '<update id="update">\n  UPDATE user\n  <set>\n    <if test="name != null">name = #{name},</if>\n    <if test="age != null">age = #{age},</if>\n  </set>\n  WHERE id = #{id}\n</update>'
    },
    {
        cat: '<choose> / <when> / <otherwise>',
        syntax: '<choose><when test="...">...</when><otherwise>...</otherwise></choose>',
        desc: '多分支（类似 Java switch-case），命中第一个 when 即停止',
        example: '<select id="list" resultType="User">\n  SELECT * FROM user\n  <where>\n    <choose>\n      <when test="name != null">AND name = #{name}</when>\n      <when test="email != null">AND email = #{email}</when>\n      <otherwise>AND status = 1</otherwise>\n    </choose>\n  </where>\n</select>'
    },
    {
        cat: '<foreach>',
        syntax: '<foreach collection="list" item="it" open="(" close=")" separator="," index="i">#{it}</foreach>',
        desc: '循环遍历集合，常用于 IN (...) 或批量 INSERT',
        example: '<select id="listByIds" resultType="User">\n  SELECT * FROM user WHERE id IN\n  <foreach collection="ids" item="id" open="(" close=")" separator=",">\n    #{id}\n  </foreach>\n</select>\n\n<insert id="batchInsert">\n  INSERT INTO user(name, age) VALUES\n  <foreach collection="list" item="u" separator=",">\n    (#{u.name}, #{u.age})\n  </foreach>\n</insert>'
    },
    {
        cat: '<trim>',
        syntax: '<trim prefix="..." suffix="..." prefixOverrides="..." suffixOverrides="...">...</trim>',
        desc: '自定义修剪：可加前缀/后缀，并去除首尾多余字符；<where>/<set> 底层实现',
        example: '<select id="list" resultType="User">\n  SELECT * FROM user\n  <trim prefix="WHERE" prefixOverrides="AND |OR ">\n    <if test="name != null">AND name = #{name}</if>\n    <if test="age != null">AND age = #{age}</if>\n  </trim>\n</select>'
    },
    {
        cat: '<bind>',
        syntax: '<bind name="变量名" value="OGNL表达式"/>',
        desc: '声明一个变量绑定到上下文，常用于模糊查询拼接',
        example: '<select id="list" resultType="User">\n  <bind name="pattern" value="\'%\' + name + \'%\'"/>\n  SELECT * FROM user WHERE name LIKE #{pattern}\n</select>'
    },
    {
        cat: '<sql> + <include>',
        syntax: '<sql id="...">片段</sql>  <include refid="..."/>',
        desc: 'SQL 片段复用：定义一次，多处 include',
        example: '<sql id="userCols">id, name, age, email</sql>\n\n<select id="list" resultType="User">\n  SELECT <include refid="userCols"/> FROM user\n</select>\n\n<select id="get" resultType="User">\n  SELECT <include refid="userCols"/> FROM user WHERE id = #{id}\n</select>'
    },
    {
        cat: '<selectKey>',
        syntax: '<selectKey keyProperty="id" resultType="long" order="BEFORE|AFTER">SQL</selectKey>',
        desc: '获取主键回填（数据库自增 / UUID / 序列）',
        example: '<insert id="insert" useGeneratedKeys="true" keyProperty="id">\n  INSERT INTO user(name) VALUES(#{name})\n</insert>\n\n<!-- Oracle 序列示例 -->\n<insert id="insert">\n  <selectKey keyProperty="id" resultType="long" order="BEFORE">\n    SELECT seq_user.nextval FROM dual\n  </selectKey>\n  INSERT INTO user(id, name) VALUES(#{id}, #{name})\n</insert>'
    },
];

let mybatissqlSearchTimer = null;

function mybatissqlRender(filter) {
    const container = document.getElementById('mybatissqlContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    const list = filter
        ? MYBATIS_SQL_DATA.filter(g =>
            g.cat.toLowerCase().includes(filter) ||
            g.desc.toLowerCase().includes(filter) ||
            g.syntax.toLowerCase().includes(filter) ||
            g.example.toLowerCase().includes(filter))
        : MYBATIS_SQL_DATA;
    if (!list.length) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
        return;
    }
    list.forEach(group => {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:18px';
        section.innerHTML = `
            <div style="font-size:13px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:4px">${group.cat}</div>
            <div style="font-size:12px;color:var(--text-muted);padding:2px 0 4px">语法：<code style="color:var(--accent2);background:var(--bg-input);padding:1px 6px;border-radius:3px">${group.syntax.replace(/</g, '&lt;')}</code></div>
            <div style="font-size:12px;color:var(--text-dim);padding:2px 0 8px">${group.desc}</div>
        `;
        const pre = document.createElement('pre');
        pre.style.cssText = 'background:var(--bg-input);padding:10px 12px;border-radius:4px;font-size:12px;overflow:auto;cursor:pointer;margin:0;border:1px solid var(--border);color:var(--text);position:relative';
        pre.textContent = group.example;
        pre.title = '点击复制示例';
        pre.addEventListener('click', () => safeCopy(group.example));
        section.appendChild(pre);
        container.appendChild(section);
    });
}

function mybatissqlSearch() {
    clearTimeout(mybatissqlSearchTimer);
    mybatissqlSearchTimer = setTimeout(() => {
        mybatissqlRender(document.getElementById('mybatissqlSearch').value);
    }, 200);
}
