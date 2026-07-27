const {
  parseMavenCoord,
  formatMavenDependency,
  gradleConfig,
} = require("../../js/codegen/mavencoord.js");

describe("parseMavenCoord", () => {
  test("g:a:v", () => {
    const c = parseMavenCoord("com.example:demo:1.0.0");
    expect(c.groupId).toBe("com.example");
    expect(c.artifactId).toBe("demo");
    expect(c.version).toBe("1.0.0");
  });

  test("g:a:v@test", () => {
    const c = parseMavenCoord("com.example:demo:1.0.0@test");
    expect(c.scope).toBe("test");
  });

  test("g:a:packaging:classifier:v", () => {
    const c = parseMavenCoord("g:a:jar:sources:2.0");
    expect(c.classifier).toBe("sources");
    expect(c.version).toBe("2.0");
  });

  test("多行属性", () => {
    const c = parseMavenCoord("groupId=org.foo\nartifactId=bar\nversion=3");
    expect(c.groupId).toBe("org.foo");
    expect(c.artifactId).toBe("bar");
    expect(c.version).toBe("3");
  });
});

describe("formatMavenDependency", () => {
  test("Maven XML 与 Gradle", () => {
    const fmt = formatMavenDependency(
      parseMavenCoord("org.springframework.boot:spring-boot-starter-web:3.2.5"),
    );
    expect(fmt.maven).toContain("<groupId>org.springframework.boot</groupId>");
    expect(fmt.maven).toContain("<version>3.2.5</version>");
    expect(fmt.gradleGroovy).toContain("implementation");
    expect(fmt.gradleGroovy).toContain("spring-boot-starter-web:3.2.5");
    expect(fmt.gradleKotlin).toMatch(/implementation\("/);
  });

  test("test scope → testImplementation", () => {
    expect(gradleConfig("test")).toBe("testImplementation");
    const fmt = formatMavenDependency(parseMavenCoord("g:a:1"), { scope: "test" });
    expect(fmt.maven).toContain("<scope>test</scope>");
    expect(fmt.gradleGroovy.startsWith("testImplementation")).toBe(true);
  });
});
