const {
    parseApiSpec,
    generateFeignClient,
    parseControllerMethods,
    fgParseParams,
} = require('../../js/codegen/feigngen.js');

describe('parseApiSpec', () => {
    test('REST 简写', () => {
        const r = parseApiSpec('GET /api/users/{id} getById UserDTO\nPOST /api/users createUser UserDTO');
        expect(r.methods).toHaveLength(2);
        expect(r.methods[0].httpMethod).toBe('GET');
        expect(r.methods[0].path).toBe('/api/users/{id}');
        expect(r.methods[0].methodName).toBe('getById');
        expect(r.methods[0].returnType).toBe('UserDTO');
        expect(r.methods[0].params.some((p) => p.name === 'id')).toBe(true);
        expect(r.methods[1].httpMethod).toBe('POST');
    });

    test('Controller 注解风格', () => {
        const r = parseControllerMethods(`
@GetMapping("/orders/{id}")
OrderDTO getOrder(@PathVariable Long id);
@PostMapping("/orders")
OrderDTO createOrder(@RequestBody OrderDTO body);
`);
        expect(r.methods.length).toBeGreaterThanOrEqual(2);
        expect(r.methods[0].httpMethod).toBe('GET');
        expect(r.methods[0].path).toBe('/orders/{id}');
        expect(r.methods[1].httpMethod).toBe('POST');
    });

    test('空输入', () => {
        expect(parseApiSpec('').methods).toEqual([]);
    });
});

describe('fgParseParams', () => {
    test('混合注解', () => {
        const ps = fgParseParams('@PathVariable Long id, @RequestBody UserDTO body, @RequestParam String q');
        expect(ps).toHaveLength(3);
        expect(ps[0].kind).toBe('path');
        expect(ps[1].kind).toBe('body');
        expect(ps[2].kind).toBe('query');
    });
});

describe('generateFeignClient', () => {
    test('生成注解与方法', () => {
        const code = generateFeignClient(
            'GET /users/{id} getById UserDTO\nDELETE /users/{id} deleteUser void',
            {
                packageName: 'com.example.client',
                clientName: 'UserClient',
                serviceName: 'user-service',
            },
        );
        expect(code).toContain('package com.example.client;');
        expect(code).toContain('@FeignClient(name = "user-service")');
        expect(code).toContain('public interface UserClient');
        expect(code).toContain('@GetMapping("/users/{id}")');
        expect(code).toContain('@PathVariable("id")');
        expect(code).toContain('@DeleteMapping');
    });

    test('url 与 path 选项', () => {
        const code = generateFeignClient('GET /a list Object', {
            serviceName: 'svc',
            url: 'http://localhost:8080',
            path: '/api',
            clientName: 'AClient',
        });
        expect(code).toContain('url = "http://localhost:8080"');
        expect(code).toContain('path = "/api"');
    });
});
