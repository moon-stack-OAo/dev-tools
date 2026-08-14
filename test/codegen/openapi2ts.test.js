const {
    parseOpenApi,
    generateTsClient,
    o2tFnName,
    o2tSchemaToTs,
    o2tSafeIdent,
    O2T_SAMPLE,
} = require('../../js/codegen/openapi2ts.js');

describe('o2t helpers', () => {
    test('safe ident / fn name', () => {
        expect(o2tSafeIdent('get-pet')).toBe('get_pet');
        expect(o2tFnName('get', '/pets/{petId}', 'getPetById')).toBe('getPetById');
        expect(o2tFnName('post', '/pets')).toMatch(/^post/i);
    });

    test('schema to ts', () => {
        expect(o2tSchemaToTs({ type: 'string' })).toBe('string');
        expect(o2tSchemaToTs({ type: 'array', items: { type: 'integer' } })).toBe('number[]');
        expect(o2tSchemaToTs({ $ref: '#/components/schemas/Pet' })).toBe('Pet');
        const obj = o2tSchemaToTs({
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
            },
        });
        expect(obj).toContain('id: number');
        expect(obj).toContain('name?: string');
    });
});

describe('parseOpenApi', () => {
    test('解析 JSON OpenAPI 3', () => {
        const r = parseOpenApi(O2T_SAMPLE);
        expect(r.ok).toBe(true);
        expect(r.format).toBe('json');
        expect(r.doc.openapi).toMatch(/^3/);
        expect(r.doc.paths['/pets']).toBeTruthy();
    });

    test('空内容失败', () => {
        const r = parseOpenApi('');
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/OpenAPI/);
    });

    test('非法 JSON', () => {
        const r = parseOpenApi('{bad');
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/JSON/);
    });

    test('非 OpenAPI 对象', () => {
        const r = parseOpenApi('{"foo":1}');
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/OpenAPI|Swagger/);
    });

    test('无 jsyaml 时 YAML 失败', () => {
        const r = parseOpenApi('openapi: "3.0.3"\ninfo:\n  title: t\n  version: "1"\npaths: {}');
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/js-yaml|YAML/);
    });
});

describe('generateTsClient', () => {
    test('生成 interface 与 API 函数', () => {
        const { doc } = parseOpenApi(O2T_SAMPLE);
        const code = generateTsClient(doc, { baseUrl: 'https://petstore.example.com/api' });
        expect(code).toContain('export interface Pet');
        expect(code).toContain('export interface NewPet');
        expect(code).toContain('export function createClient');
        expect(code).toContain('async function listPets');
        expect(code).toContain('async function createPet');
        expect(code).toContain('async function getPetById');
        expect(code).toContain('async function deletePet');
        expect(code).toContain('https://petstore.example.com/api');
        expect(code).toContain('fetchFn');
        expect(code).toContain('ApiError');
    });

    test('无 operationId 时从 path 推导', () => {
        const doc = {
            openapi: '3.0.0',
            info: { title: 't', version: '1' },
            paths: {
                '/users/{id}': {
                    get: {
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        ],
                        responses: { '200': { description: 'ok' } },
                    },
                },
            },
        };
        const code = generateTsClient(doc);
        expect(code).toMatch(/async function getUsersById/);
    });
});
