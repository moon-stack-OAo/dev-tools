const SECURITY_REFS = [
    {
        cat: '核心注解',
        items: [
            {
                cmd: '@EnableWebSecurity',
                syntax: '@EnableWebSecurity',
                desc: '启用 Spring Security Web 安全',
                examples: ['@Configuration\n@EnableWebSecurity\npublic class SecurityConfig {}'],
                returns: '启用安全配置',
            },
            {
                cmd: '@EnableMethodSecurity',
                syntax: '@EnableMethodSecurity',
                desc: '启用方法级安全（新版）',
                examples: ['@Configuration\n@EnableMethodSecurity\npublic class SecurityConfig {}'],
                returns: '启用方法安全',
            },
            {
                cmd: '@Secured("ROLE_ADMIN")',
                syntax: '@Secured("ROLE_<name>")',
                desc: '限制方法访问角色（需启用 securedEnabled）',
                examples: ['@Secured("ROLE_ADMIN")\npublic void adminMethod() {}'],
                returns: '角色限制',
            },
            {
                cmd: '@RolesAllowed("ROLE_ADMIN")',
                syntax: '@RolesAllowed("ROLE_<name>")',
                desc: 'JSR-250 角色限制',
                examples: ['@RolesAllowed({"ROLE_ADMIN", "ROLE_MANAGER"})\npublic void manage() {}'],
                returns: '角色限制',
            },
            {
                cmd: '@PreAuthorize("hasRole(\'ADMIN\')")',
                syntax: '@PreAuthorize("hasRole(\'<role>\')")',
                desc: '方法执行前鉴权（SpEL 表达式）',
                examples: ['@PreAuthorize("hasRole(\'ADMIN\')")\npublic User getAdmin() {}'],
                returns: '执行前鉴权',
            },
            {
                cmd: '@PostAuthorize("returnObject.owner == authentication.name")',
                syntax: '@PostAuthorize("<spel>")',
                desc: '方法执行后鉴权',
                examples: ['@PostAuthorize("returnObject.owner == authentication.name")\npublic Document getDoc() {}'],
                returns: '执行后鉴权',
            },
            {
                cmd: '@PreFilter("filterObject.owner == authentication.name")',
                syntax: '@PreFilter("<spel>")',
                desc: '方法参数过滤',
                examples: [
                    '@PreFilter("filterObject.owner == authentication.name")\npublic void updateDocs(List<Document> docs) {}',
                ],
                returns: '参数过滤',
            },
            {
                cmd: '@PostFilter("filterObject.owner == authentication.name")',
                syntax: '@PostFilter("<spel>")',
                desc: '返回值过滤',
                examples: [
                    '@PostFilter("filterObject.owner == authentication.name")\npublic List<Document> getDocs() {}',
                ],
                returns: '返回值过滤',
            },
        ],
    },
    {
        cat: '配置类',
        items: [
            {
                cmd: '@Bean SecurityFilterChain',
                syntax: '@Bean SecurityFilterChain filterChain(HttpSecurity http)',
                desc: '定义安全过滤器链',
                examples: [
                    '@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    return http.build();\n}',
                ],
                returns: 'SecurityFilterChain',
            },
            {
                cmd: '@Bean UserDetailsService',
                syntax: '@Bean UserDetailsService userDetailsService()',
                desc: '定义用户详情服务',
                examples: [
                    '@Bean\nUserDetailsService userDetailsService() {\n    return new InMemoryUserDetailsManager(user());\n}',
                ],
                returns: 'UserDetailsService',
            },
            {
                cmd: '@Bean PasswordEncoder',
                syntax: '@Bean PasswordEncoder passwordEncoder()',
                desc: '定义密码编码器',
                examples: ['@Bean\nPasswordEncoder passwordEncoder() {\n    return new BCryptPasswordEncoder();\n}'],
                returns: 'PasswordEncoder',
            },
            {
                cmd: '@Bean AuthenticationManager',
                syntax: '@Bean AuthenticationManager authManager(AuthenticationConfiguration config)',
                desc: '定义认证管理器',
                examples: [
                    '@Bean\nAuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {\n    return config.getAuthenticationManager();\n}',
                ],
                returns: 'AuthenticationManager',
            },
        ],
    },
    {
        cat: '请求授权',
        items: [
            {
                cmd: '.requestMatchers("/public/**").permitAll()',
                syntax: '.requestMatchers(<pattern>).permitAll()',
                desc: '公开访问',
                examples: ['.requestMatchers("/public/**", "/css/**", "/js/**").permitAll()'],
                returns: '允许所有访问',
            },
            {
                cmd: '.requestMatchers("/admin/**").hasRole("ADMIN")',
                syntax: '.requestMatchers(<pattern>).hasRole("<role>")',
                desc: '需要 ADMIN 角色',
                examples: ['.requestMatchers("/admin/**").hasRole("ADMIN")'],
                returns: '角色限制',
            },
            {
                cmd: '.requestMatchers("/api/**").hasAuthority("SCOPE_read")',
                syntax: '.requestMatchers(<pattern>).hasAuthority("<authority>")',
                desc: '需要特定权限',
                examples: ['.requestMatchers("/api/**").hasAuthority("SCOPE_read")'],
                returns: '权限限制',
            },
            {
                cmd: '.requestMatchers(HttpMethod.GET, "/api/**").permitAll()',
                syntax: '.requestMatchers(HttpMethod.<method>, <pattern>).permitAll()',
                desc: 'GET 请求公开',
                examples: ['.requestMatchers(HttpMethod.GET, "/api/**").permitAll()'],
                returns: '方法级限制',
            },
            {
                cmd: '.requestMatchers("/user/**").authenticated()',
                syntax: '.requestMatchers(<pattern>).authenticated()',
                desc: '需要认证',
                examples: ['.requestMatchers("/user/**").authenticated()'],
                returns: '需要认证',
            },
            {
                cmd: '.anyRequest().denyAll()',
                syntax: '.anyRequest().denyAll()',
                desc: '其他请求全部拒绝',
                examples: ['.anyRequest().denyAll()'],
                returns: '拒绝所有',
            },
        ],
    },
    {
        cat: '认证配置',
        items: [
            {
                cmd: '.formLogin(form -> form.loginPage("/login"))',
                syntax: '.formLogin(form -> form.<config>)',
                desc: '自定义登录页',
                examples: [
                    '.formLogin(form -> form\n    .loginPage("/login")\n    .defaultSuccessUrl("/dashboard")\n    .failureUrl("/login?error=true"))',
                ],
                returns: '表单登录配置',
            },
            {
                cmd: '.httpBasic(Customizer.withDefaults())',
                syntax: '.httpBasic(Customizer.withDefaults())',
                desc: '启用 HTTP Basic 认证',
                examples: ['.httpBasic(Customizer.withDefaults())'],
                returns: 'Basic 认证',
            },
            {
                cmd: '.oauth2ResourceServer(oauth2 -> oauth2.jwt())',
                syntax: '.oauth2ResourceServer(oauth2 -> oauth2.jwt())',
                desc: 'OAuth2 JWT 资源服务器',
                examples: [
                    '.oauth2ResourceServer(oauth2 -> oauth2\n    .jwt(jwt -> jwt.jwtAuthenticationConverter(converter)))',
                ],
                returns: 'JWT 资源服务器',
            },
            {
                cmd: '.oauth2Login(oauth2 -> oauth2.loginPage("/login"))',
                syntax: '.oauth2Login(oauth2 -> oauth2.<config>)',
                desc: 'OAuth2 登录',
                examples: [
                    '.oauth2Login(oauth2 -> oauth2\n    .loginPage("/login")\n    .defaultSuccessUrl("/dashboard"))',
                ],
                returns: 'OAuth2 登录配置',
            },
            {
                cmd: '.rememberMe(remember -> remember.key("uniqueKey"))',
                syntax: '.rememberMe(remember -> remember.<config>)',
                desc: '记住我功能',
                examples: [
                    '.rememberMe(remember -> remember\n    .key("uniqueKey")\n    .tokenValiditySeconds(86400))',
                ],
                returns: '记住我配置',
            },
            {
                cmd: '.sessionManagement(session -> session.maximumSessions(1))',
                syntax: '.sessionManagement(session -> session.<config>)',
                desc: '会话管理',
                examples: [
                    '.sessionManagement(session -> session\n    .maximumSessions(1)\n    .maxSessionsPreventsLogin(false))',
                ],
                returns: '会话管理配置',
            },
            {
                cmd: '.logout(logout -> logout.logoutSuccessUrl("/"))',
                syntax: '.logout(logout -> logout.<config>)',
                desc: '注销配置',
                examples: [
                    '.logout(logout -> logout\n    .logoutUrl("/logout")\n    .logoutSuccessUrl("/")\n    .deleteCookies("JSESSIONID"))',
                ],
                returns: '注销配置',
            },
            {
                cmd: '.cors(cors -> cors.configurationSource(source))',
                syntax: '.cors(cors -> cors.<config>)',
                desc: 'CORS 配置',
                examples: [
                    '.cors(cors -> cors.configurationSource(request -> {\n    CorsConfiguration config = new CorsConfiguration();\n    config.setAllowedOrigins(List.of("*"));\n    return config;\n}))',
                ],
                returns: 'CORS 配置',
            },
            {
                cmd: '.csrf(csrf -> csrf.disable())',
                syntax: '.csrf(csrf -> csrf.disable())',
                desc: '禁用 CSRF',
                examples: ['.csrf(csrf -> csrf.disable())'],
                returns: '禁用 CSRF',
            },
        ],
    },
    {
        cat: '密码编码',
        items: [
            {
                cmd: 'BCryptPasswordEncoder',
                syntax: 'new BCryptPasswordEncoder()',
                desc: 'BCrypt 哈希编码器',
                examples: [
                    'PasswordEncoder encoder = new BCryptPasswordEncoder();\nString hash = encoder.encode("password");\nboolean matches = encoder.matches("password", hash);',
                ],
                returns: 'BCrypt 编码器',
            },
            {
                cmd: 'SCryptPasswordEncoder',
                syntax: 'new SCryptPasswordEncoder()',
                desc: 'SCrypt 哈希编码器',
                examples: [
                    'PasswordEncoder encoder = new SCryptPasswordEncoder();\nString hash = encoder.encode("password");',
                ],
                returns: 'SCrypt 编码器',
            },
            {
                cmd: 'Argon2PasswordEncoder',
                syntax: 'new Argon2PasswordEncoder()',
                desc: 'Argon2 哈希编码器',
                examples: [
                    'PasswordEncoder encoder = new Argon2PasswordEncoder();\nString hash = encoder.encode("password");',
                ],
                returns: 'Argon2 编码器',
            },
            {
                cmd: 'Pbkdf2PasswordEncoder',
                syntax: 'new Pbkdf2PasswordEncoder()',
                desc: 'PBKDF2 哈希编码器',
                examples: [
                    'PasswordEncoder encoder = new Pbkdf2PasswordEncoder();\nString hash = encoder.encode("password");',
                ],
                returns: 'PBKDF2 编码器',
            },
            {
                cmd: 'DelegatingPasswordEncoder',
                syntax: 'PasswordEncoderFactories.createDelegatingPasswordEncoder()',
                desc: '委托编码器（默认，支持多种算法）',
                examples: [
                    'PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();\nString hash = encoder.encode("password"); // {bcrypt}$2a$10$...',
                ],
                returns: '委托编码器',
            },
        ],
    },
    {
        cat: '用户详情',
        items: [
            {
                cmd: 'UserDetailsService',
                syntax: 'UserDetailsService',
                desc: '用户详情服务接口',
                examples: [
                    '@Service\npublic class CustomUserDetailsService implements UserDetailsService {\n    @Override\n    public UserDetails loadUserByUsername(String username) {\n        return userRepository.findByUsername(username);\n    }\n}',
                ],
                returns: 'UserDetails',
            },
            {
                cmd: 'User.builder()',
                syntax: 'User.builder().username(<name>).password(<pass>).roles(<roles>).build()',
                desc: '构建用户',
                examples: [
                    'UserDetails user = User.builder()\n    .username("user")\n    .password(passwordEncoder.encode("pass"))\n    .roles("USER")\n    .build();',
                ],
                returns: 'UserDetails',
            },
            {
                cmd: 'JdbcUserDetailsManager',
                syntax: 'new JdbcUserDetailsManager(dataSource)',
                desc: 'JDBC 用户详情管理器',
                examples: [
                    '@Bean\nUserDetailsService userDetailsService(DataSource dataSource) {\n    return new JdbcUserDetailsManager(dataSource);\n}',
                ],
                returns: 'JdbcUserDetailsManager',
            },
            {
                cmd: 'InMemoryUserDetailsManager',
                syntax: 'new InMemoryUserDetailsManager(users...)',
                desc: '内存用户详情管理器',
                examples: [
                    '@Bean\nUserDetailsService userDetailsService() {\n    UserDetails user = User.withDefaultPasswordEncoder()\n        .username("user").password("pass").roles("USER").build();\n    return new InMemoryUserDetailsManager(user);\n}',
                ],
                returns: 'InMemoryUserDetailsManager',
            },
        ],
    },
    {
        cat: 'JWT 配置',
        items: [
            {
                cmd: '@Bean JwtDecoder jwtDecoder()',
                syntax: '@Bean JwtDecoder jwtDecoder()',
                desc: 'JWT 解码器',
                examples: [
                    '@Bean\nJwtDecoder jwtDecoder() {\n    return NimbusJwtDecoder.withPublicKey(rsaPublicKey).build();\n}',
                ],
                returns: 'JwtDecoder',
            },
            {
                cmd: '@Bean JwtEncoder jwtEncoder()',
                syntax: '@Bean JwtEncoder jwtEncoder()',
                desc: 'JWT 编码器',
                examples: [
                    '@Bean\nJwtEncoder jwtEncoder() {\n    JWK jwk = new RSAKey.Builder(rsaPrivateKey).build();\n    JWKSource<SecurityContext> jwks = new ImmutableJWKSet<>(new JWKSet(jwk));\n    return new NimbusJwtEncoder(jwks);\n}',
                ],
                returns: 'JwtEncoder',
            },
            {
                cmd: 'JwtAuthenticationConverter',
                syntax: 'new JwtAuthenticationConverter()',
                desc: 'JWT 认证转换器',
                examples: [
                    'JwtAuthenticationConverter converter = new JwtAuthenticationConverter();\nconverter.setJwtGrantedAuthoritiesConverter(new JwtGrantedAuthoritiesConverter());',
                ],
                returns: 'JwtAuthenticationConverter',
            },
            {
                cmd: 'spring.security.oauth2.resourceserver.jwt.issuer-uri',
                syntax: 'spring.security.oauth2.resourceserver.jwt.issuer-uri=<uri>',
                desc: 'JWT 签发者 URI',
                examples: ['spring.security.oauth2.resourceserver.jwt.issuer-uri=https://auth.example.com'],
                returns: 'JWT 配置',
            },
            {
                cmd: 'spring.security.oauth2.resourceserver.jwt.jwk-set-uri',
                syntax: 'spring.security.oauth2.resourceserver.jwt.jwk-set-uri=<uri>',
                desc: 'JWK Set URI',
                examples: [
                    'spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://auth.example.com/.well-known/jwks.json',
                ],
                returns: 'JWK 配置',
            },
        ],
    },
    {
        cat: '方法安全示例',
        items: [
            {
                cmd: '@PreAuthorize("#id == authentication.principal.id")',
                syntax: '@PreAuthorize("<spel>")',
                desc: '只能访问自己的资源',
                examples: ['@PreAuthorize("#id == authentication.principal.id")\npublic User getUser(Long id) {}'],
                returns: '资源所有者检查',
            },
            {
                cmd: '@PreAuthorize("hasRole(\'ADMIN\') or #id == authentication.principal.id")',
                syntax: '@PreAuthorize("<spel>")',
                desc: '管理员或本人可访问',
                examples: [
                    '@PreAuthorize("hasRole(\'ADMIN\') or #id == authentication.principal.id")\npublic void updateUser(Long id) {}',
                ],
                returns: '角色或所有者检查',
            },
            {
                cmd: '@PreAuthorize("@securityService.hasPermission(#id, \'READ\')")',
                syntax: '@PreAuthorize("@<bean>.<method>(<args>)")',
                desc: '自定义权限检查',
                examples: [
                    '@PreAuthorize("@securityService.hasPermission(#id, \'READ\')")\npublic Document getDocument(Long id) {}',
                ],
                returns: '自定义权限检查',
            },
            {
                cmd: "@PreAuthorize(\"hasAnyRole('ADMIN', 'MANAGER')\")",
                syntax: "@PreAuthorize(\"hasAnyRole('<role1>', '<role2>')\")",
                desc: '多个角色任一即可',
                examples: ["@PreAuthorize(\"hasAnyRole('ADMIN', 'MANAGER')\")\npublic void manage() {}"],
                returns: '多角色检查',
            },
            {
                cmd: '@PostAuthorize("returnObject.status == T(com.example.Status).ACTIVE")',
                syntax: '@PostAuthorize("<spel>")',
                desc: '返回值状态检查',
                examples: [
                    '@PostAuthorize("returnObject.status == T(Status).ACTIVE")\npublic Order getOrder(Long id) {}',
                ],
                returns: '返回值检查',
            },
        ],
    },
    {
        cat: '常用依赖',
        items: [
            {
                cmd: 'spring-boot-starter-security',
                syntax: "implementation 'org.springframework.boot:spring-boot-starter-security'",
                desc: 'Spring Boot Security Starter',
                examples: ["// build.gradle\nimplementation 'org.springframework.boot:spring-boot-starter-security'"],
                returns: 'Gradle 依赖',
            },
            {
                cmd: 'spring-security-oauth2-jose',
                syntax: "implementation 'org.springframework.security:spring-security-oauth2-jose'",
                desc: 'OAuth2 JOSE（JWT 支持）',
                examples: [
                    "// build.gradle\nimplementation 'org.springframework.security:spring-security-oauth2-jose'",
                ],
                returns: 'Gradle 依赖',
            },
            {
                cmd: 'spring-security-oauth2-resource-server',
                syntax: "implementation 'org.springframework.security:spring-security-oauth2-resource-server'",
                desc: 'OAuth2 资源服务器',
                examples: [
                    "// build.gradle\nimplementation 'org.springframework.security:spring-security-oauth2-resource-server'",
                ],
                returns: 'Gradle 依赖',
            },
            {
                cmd: 'spring-security-test',
                syntax: "testImplementation 'org.springframework.security:spring-security-test'",
                desc: 'Security 测试支持',
                examples: ["// build.gradle\ntestImplementation 'org.springframework.security:spring-security-test'"],
                returns: '测试依赖',
            },
        ],
    },
];

let _securityrefSearchTimer = null;

function securityrefCopyPre(btn, ev) {
    if (ev) ev.stopPropagation();
    const pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    safeCopy(pre.innerText);
}

function securityrefRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('securityrefSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase();
    const container = document.getElementById('securityrefContent');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    SECURITY_REFS.forEach((group) => {
        const matched = filter
            ? group.items.filter(
                (it) =>
                    it.cmd.toLowerCase().includes(filter) ||
                    it.desc.toLowerCase().includes(filter) ||
                    (it.syntax && it.syntax.toLowerCase().includes(filter)) ||
                    (it.examples && it.examples.some((ex) => ex.toLowerCase().includes(filter)))
            )
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${escapeHtml(group.cat)}</div>`;
        matched.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${escapeHtml(item.cmd)}</code><span class="ref-cmd-desc">${escapeHtml(item.desc)}</span><button class="sm outline" onclick="safeCopy('${escapeHtml(item.cmd).replace(/'/g, "\\'")}')">复制</button></div>`;
            if (item.syntax && item.syntax !== item.cmd) {
                html += `<div class="ref-syntax">${escapeHtml(item.syntax)}</div>`;
            }
            if (item.examples && item.examples.length) {
                html += `<div class="ref-section-title">示例</div>`;
                item.examples.forEach((ex) => {
                    html += `<div class="ref-copy-wrap"><pre class="ref-pre"><code>${escapeHtml(ex)}</code></pre><button class="ref-copy-btn" onclick="securityrefCopyPre(this, event)">复制</button></div>`;
                });
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

function securityrefSearch() {
    clearTimeout(_securityrefSearchTimer);
    _securityrefSearchTimer = setTimeout(function () {
        const el = document.getElementById('securityrefSearch');
        securityrefRender(el ? el.value : '');
    }, 200);
}

registerInit('securityref', securityrefRender);
