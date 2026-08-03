// JPA / Hibernate 速查

const JPAREF_DATA = [
    {
        cat: '常用注解',
        items: [
            {
                name: '@Entity',
                desc: '标记 JPA 实体类，对应一张数据库表',
                code: '@Entity\npublic class User {\n    @Id\n    private Long id;\n}',
            },
            {
                name: '@Table',
                desc: '指定表名、schema、唯一约束等',
                code: '@Entity\n@Table(name = "t_user", schema = "public")\npublic class User { }',
            },
            {
                name: '@Id',
                desc: '主键字段',
                code: '@Id\nprivate Long id;',
            },
            {
                name: '@GeneratedValue',
                desc: '主键生成策略，配合 GenerationType',
                code: '@Id\n@GeneratedValue(strategy = GenerationType.IDENTITY)\nprivate Long id;',
            },
            {
                name: '@Column',
                desc: '列映射：名称、可空、长度、唯一等',
                code: '@Column(name = "user_name", nullable = false, length = 64, unique = true)\nprivate String username;',
            },
            {
                name: '@OneToMany',
                desc: '一对多；默认 LAZY；常用 mappedBy 维护方',
                code: '@OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)\nprivate List<Order> orders = new ArrayList<>();',
            },
            {
                name: '@ManyToOne',
                desc: '多对一；默认 EAGER（建议显式 LAZY）',
                code: '@ManyToOne(fetch = FetchType.LAZY)\n@JoinColumn(name = "user_id")\nprivate User user;',
            },
            {
                name: '@ManyToMany',
                desc: '多对多；需中间表 @JoinTable',
                code: '@ManyToMany\n@JoinTable(name = "user_role",\n    joinColumns = @JoinColumn(name = "user_id"),\n    inverseJoinColumns = @JoinColumn(name = "role_id"))\nprivate Set<Role> roles;',
            },
            {
                name: '@OneToOne',
                desc: '一对一；可单向或双向',
                code: '@OneToOne(mappedBy = "user", cascade = CascadeType.ALL)\nprivate Profile profile;',
            },
            {
                name: '@JoinColumn',
                desc: '外键列定义（拥有方）',
                code: '@JoinColumn(name = "dept_id", referencedColumnName = "id")\nprivate Department dept;',
            },
            {
                name: '@Transient',
                desc: '非持久化字段，不映射到数据库列',
                code: '@Transient\nprivate String tempToken;',
            },
            {
                name: '@Version',
                desc: '乐观锁版本号字段',
                code: '@Version\nprivate Long version;',
            },
            {
                name: '@Enumerated',
                desc: '枚举映射：ORDINAL 或 STRING（推荐 STRING）',
                code: '@Enumerated(EnumType.STRING)\n@Column(length = 20)\nprivate UserStatus status;',
            },
            {
                name: '@Lob',
                desc: '大对象：Clob/Blob（文本或二进制）',
                code: '@Lob\n@Column(columnDefinition = "TEXT")\nprivate String content;',
            },
            {
                name: '@Temporal',
                desc: 'java.util.Date/Calendar 时间精度（JPA 2.2+ 更推荐 LocalDateTime）',
                code: '@Temporal(TemporalType.TIMESTAMP)\nprivate Date createdAt;',
            },
            {
                name: '@Embedded / @Embeddable',
                desc: '嵌入式值类型，复用一组字段',
                code: '@Embeddable\npublic class Address {\n    private String city;\n    private String street;\n}\n\n@Embedded\nprivate Address address;',
            },
            {
                name: '@Query',
                desc: '自定义 JPQL / 原生 SQL 查询（Spring Data）',
                code: '@Query("select u from User u where u.status = :status")\nList<User> findByStatus(@Param("status") String status);',
            },
            {
                name: '@Modifying',
                desc: '标识更新/删除查询，需配合 @Transactional 与 clearAutomatically',
                code: '@Modifying(clearAutomatically = true)\n@Query("update User u set u.status = :s where u.id = :id")\nint updateStatus(@Param("id") Long id, @Param("s") String s);',
            },
            {
                name: '@Transactional',
                desc: '事务边界（Spring）；写操作必须开启',
                code: '@Transactional\npublic void transfer(Long from, Long to, BigDecimal amount) { ... }',
            },
            {
                name: '@EntityListeners',
                desc: '实体生命周期监听器',
                code: '@Entity\n@EntityListeners(AuditingEntityListener.class)\npublic class User { }',
            },
            {
                name: '@CreatedDate / @LastModifiedDate',
                desc: 'Spring Data 审计时间字段',
                code: '@CreatedDate\nprivate Instant createdAt;\n\n@LastModifiedDate\nprivate Instant updatedAt;',
            },
            {
                name: '@NamedQuery',
                desc: '实体上声明命名查询',
                code: '@NamedQuery(name = "User.findByEmail",\n    query = "select u from User u where u.email = :email")\npublic class User { }',
            },
        ],
    },
    {
        cat: '关系映射简表',
        items: [
            {
                name: '一对多 OneToMany',
                desc: '一的一方用 @OneToMany(mappedBy)；多的一方持有外键 @ManyToOne + @JoinColumn',
                code: '// User 1 ── * Order\n// User:\n@OneToMany(mappedBy = "user")\nprivate List<Order> orders;\n\n// Order:\n@ManyToOne\n@JoinColumn(name = "user_id")\nprivate User user;',
            },
            {
                name: '多对一 ManyToOne',
                desc: '多的一方持有外键；默认 EAGER，生产建议 LAZY',
                code: '@ManyToOne(fetch = FetchType.LAZY)\n@JoinColumn(name = "category_id")\nprivate Category category;',
            },
            {
                name: '一对一 OneToOne',
                desc: '共享主键或外键；注意双向循环 JSON 序列化',
                code: '// 外键在 Profile\n@OneToOne\n@JoinColumn(name = "user_id")\nprivate User user;',
            },
            {
                name: '多对多 ManyToMany',
                desc: '中间表 @JoinTable；或拆成两个 @ManyToOne 中间实体（推荐复杂场景）',
                code: '@ManyToMany\n@JoinTable(name = "student_course",\n    joinColumns = @JoinColumn(name = "student_id"),\n    inverseJoinColumns = @JoinColumn(name = "course_id"))\nprivate Set<Course> courses;',
            },
            {
                name: '级联 CascadeType',
                desc: 'ALL / PERSIST / MERGE / REMOVE / REFRESH / DETACH；慎用 REMOVE',
                code: '@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)\nprivate List<OrderItem> items;',
            },
            {
                name: 'orphanRemoval',
                desc: '集合中移除的子实体自动删除',
                code: '@OneToMany(mappedBy = "parent", orphanRemoval = true)\nprivate List<Child> children;',
            },
        ],
    },
    {
        cat: '常用 JPQL 示例',
        items: [
            {
                name: '基本查询',
                desc: 'select ... from Entity alias where ...',
                code: 'select u from User u where u.age > :age order by u.id desc',
            },
            {
                name: 'JOIN FETCH',
                desc: '解决 N+1，一次抓取关联',
                code: 'select u from User u join fetch u.orders o where u.id = :id',
            },
            {
                name: 'LEFT JOIN',
                desc: '左连接过滤/投影',
                code: 'select u, count(o) from User u left join u.orders o group by u',
            },
            {
                name: '构造 DTO',
                desc: 'JPQL 构造器表达式',
                code: 'select new com.example.UserDto(u.id, u.name) from User u where u.active = true',
            },
            {
                name: '批量更新',
                desc: '需 @Modifying + 事务',
                code: 'update User u set u.status = :status where u.lastLogin < :before',
            },
            {
                name: '批量删除',
                desc: 'delete 语句',
                code: 'delete from User u where u.status = \'DISABLED\'',
            },
            {
                name: 'IN / BETWEEN',
                desc: '集合与区间条件',
                code: 'select u from User u where u.id in :ids and u.createdAt between :start and :end',
            },
            {
                name: '原生 SQL',
                desc: '@Query(nativeQuery = true)',
                code: '@Query(value = "select * from t_user where status = ?1", nativeQuery = true)\nList<User> findNative(String status);',
            },
        ],
    },
    {
        cat: 'GenerationType',
        items: [
            {
                name: 'IDENTITY',
                desc: '数据库自增（MySQL AUTO_INCREMENT）；insert 后才能拿 ID',
                code: '@GeneratedValue(strategy = GenerationType.IDENTITY)',
            },
            {
                name: 'SEQUENCE',
                desc: '序列（Oracle / PostgreSQL 推荐）；可配合 @SequenceGenerator',
                code: '@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq")\n@SequenceGenerator(name = "user_seq", sequenceName = "seq_user", allocationSize = 50)',
            },
            {
                name: 'TABLE',
                desc: '用表模拟序列；兼容性好但性能较差',
                code: '@GeneratedValue(strategy = GenerationType.TABLE)',
            },
            {
                name: 'AUTO',
                desc: '由提供方选择策略；跨库时行为不一致，生产建议显式指定',
                code: '@GeneratedValue(strategy = GenerationType.AUTO)',
            },
            {
                name: 'UUID',
                desc: 'Hibernate 6 / 自定义生成器常用 UUID',
                code: '@Id\n@GeneratedValue\n@UuidGenerator\nprivate UUID id;',
            },
        ],
    },
    {
        cat: 'FetchType',
        items: [
            {
                name: 'LAZY',
                desc: '懒加载；访问时才查库。集合默认 LAZY；需会话内访问或 JOIN FETCH',
                code: '@OneToMany(fetch = FetchType.LAZY)\nprivate List<Order> orders;',
            },
            {
                name: 'EAGER',
                desc: '立即加载；@ManyToOne/@OneToOne 默认 EAGER，易导致过度查询',
                code: '@ManyToOne(fetch = FetchType.EAGER)\nprivate User user;',
            },
            {
                name: 'N+1 问题',
                desc: '列表查询后循环访问关联触发额外 SQL；用 join fetch / EntityGraph / @BatchSize',
                code: '// 推荐\n@Query("select u from User u join fetch u.roles")\nList<User> findAllWithRoles();',
            },
            {
                name: '@EntityGraph',
                desc: '声明式指定抓取路径（Spring Data）',
                code: '@EntityGraph(attributePaths = {"orders", "orders.items"})\nList<User> findAll();',
            },
        ],
    },
    {
        cat: 'Hibernate 常用提示',
        items: [
            {
                name: 'open-in-view',
                desc: 'Spring 默认 true 会在视图层懒加载；生产建议 false，服务层组装 DTO',
                code: 'spring.jpa.open-in-view=false',
            },
            {
                name: 'ddl-auto',
                desc: 'validate / update / create / create-drop / none；生产用 validate 或 none',
                code: 'spring.jpa.hibernate.ddl-auto=validate',
            },
            {
                name: 'show-sql',
                desc: '打印 SQL；配合 format_sql 便于调试',
                code: 'spring.jpa.show-sql=true\nspring.jpa.properties.hibernate.format_sql=true',
            },
            {
                name: '二级缓存',
                desc: '实体/查询缓存（Ehcache 等）；注意集群一致性',
                code: '@Cacheable\n@Entity\n@org.hibernate.annotations.Cache(usage = CacheConcurrencyStrategy.READ_WRITE)\npublic class Dict { }',
            },
        ],
    },
];

/**
 * 搜索过滤速查条目
 * @param {Array<{cat:string, items: Array<{name:string, desc:string, code?:string}>}>} items
 * @param {string} keyword
 * @returns {Array}
 */
function jparefSearch(items, keyword) {
    const data = items || JPAREF_DATA;
    const kw = (keyword == null ? '' : String(keyword)).trim().toLowerCase();
    if (!kw) {
        return data.map(function (g) {
            return { cat: g.cat, items: g.items.slice() };
        });
    }
    const result = [];
    data.forEach(function (group) {
        const matched = group.items.filter(function (i) {
            return (
                (i.name && i.name.toLowerCase().includes(kw)) ||
                (i.desc && i.desc.toLowerCase().includes(kw)) ||
                (i.code && i.code.toLowerCase().includes(kw))
            );
        });
        if (matched.length) {
            result.push({ cat: group.cat, items: matched });
        }
    });
    return result;
}

let jparefSearchTimer = null;

function jparefRender(filter) {
    const container = document.getElementById('jparefContent');
    if (!container) return;
    const groups = jparefSearch(JPAREF_DATA, filter);
    container.innerHTML = '';
    if (!groups.length) {
        container.innerHTML =
            '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
        return;
    }
    groups.forEach(function (group) {
        const section = document.createElement('div');
        section.className = 'ref-group';
        section.innerHTML = '<div class="ref-group-title">' + group.cat + '</div>';
        group.items.forEach(function (item) {
            const card = document.createElement('div');
            card.className = 'ref-card';
            let html =
                '<div class="ref-cmd-head"><code class="ref-cmd-name">' +
                escapeHtml(item.name) +
                '</code><span class="ref-cmd-desc">' +
                escapeHtml(item.desc) +
                '</span><button class="sm outline" onclick="safeCopy(\'' +
                String(item.name).replace(/'/g, "\\'") +
                '\')">复制</button></div>';
            if (item.code) {
                html +=
                    '<div class="ref-copy-wrap"><pre class="ref-pre"><code>' +
                    escapeHtml(item.code) +
                    '</code></pre><button class="ref-copy-btn" onclick="safeCopy(this.parentElement.querySelector(\'pre\').innerText)">复制</button></div>';
            }
            card.innerHTML = html;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
}

function jparefSearchInput() {
    clearTimeout(jparefSearchTimer);
    jparefSearchTimer = setTimeout(function () {
        const el = document.getElementById('jparefSearch');
        jparefRender(el ? el.value : '');
    }, 200);
}

if (typeof registerInit === 'function') {
    registerInit('jparef', jparefRender);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        JPAREF_DATA: JPAREF_DATA,
        jparefSearch: jparefSearch,
    };
}
