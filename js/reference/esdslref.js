// Elasticsearch Query DSL 速查 — 数据 + RefEngine 挂载

const ESDSLREF_DATA = [
    {
        cat: '全文检索',
        items: [
            {
                name: 'match',
                desc: '对字段分词后全文匹配（最常用）',
                code: '{\n  "query": {\n    "match": {\n      "title": {\n        "query": "快速入门",\n        "operator": "and"\n      }\n    }\n  }\n}',
            },
            {
                name: 'match_phrase',
                desc: '短语匹配，词序与邻近受 slop 影响',
                code: '{\n  "query": {\n    "match_phrase": {\n      "content": {\n        "query": "分布式 搜索",\n        "slop": 1\n      }\n    }\n  }\n}',
            },
            {
                name: 'multi_match',
                desc: '多字段全文匹配',
                code: '{\n  "query": {\n    "multi_match": {\n      "query": "elasticsearch",\n      "fields": ["title^3", "content"],\n      "type": "best_fields"\n    }\n  }\n}',
            },
            {
                name: 'query_string',
                desc: '支持 Lucene 语法的查询串',
                code: '{\n  "query": {\n    "query_string": {\n      "query": "(java OR kotlin) AND spring",\n      "default_field": "content"\n    }\n  }\n}',
            },
            {
                name: 'simple_query_string',
                desc: '更安全的查询串（容错操作符）',
                code: '{\n  "query": {\n    "simple_query_string": {\n      "query": "error +timeout",\n      "fields": ["message"]\n    }\n  }\n}',
            },
            {
                name: 'match_bool_prefix',
                desc: '适合搜索建议：前缀 + bool',
                code: '{\n  "query": {\n    "match_bool_prefix": {\n      "title": "ela se"\n    }\n  }\n}',
            },
        ],
    },
    {
        cat: '词项查询',
        items: [
            {
                name: 'term',
                desc: '精确词项（不分词；keyword/数值/日期）',
                code: '{\n  "query": {\n    "term": {\n      "status.keyword": "published"\n    }\n  }\n}',
            },
            {
                name: 'terms',
                desc: '多值精确匹配（OR）',
                code: '{\n  "query": {\n    "terms": {\n      "user_id": [1, 2, 3]\n    }\n  }\n}',
            },
            {
                name: 'range',
                desc: '范围查询',
                code: '{\n  "query": {\n    "range": {\n      "age": { "gte": 18, "lte": 60 },\n      "created_at": { "gte": "now-7d/d" }\n    }\n  }\n}',
            },
            {
                name: 'exists',
                desc: '字段存在（非 null）',
                code: '{\n  "query": {\n    "exists": { "field": "email" }\n  }\n}',
            },
            {
                name: 'prefix / wildcard / regexp',
                desc: '前缀、通配、正则（慎用，可能很慢）',
                code: '{\n  "query": {\n    "prefix": { "user.keyword": "adm" }\n  }\n}',
                examples: [
                    '{ "wildcard": { "name.keyword": "a*b" } }',
                    '{ "regexp": { "code.keyword": "ERR[0-9]+" } }',
                ],
            },
            {
                name: 'ids',
                desc: '按文档 _id 批量查',
                code: '{\n  "query": {\n    "ids": { "values": ["1", "2", "3"] }\n  }\n}',
            },
            {
                name: 'fuzzy',
                desc: '模糊匹配（编辑距离）',
                code: '{\n  "query": {\n    "fuzzy": {\n      "title": { "value": "elastcsearch", "fuzziness": "AUTO" }\n    }\n  }\n}',
            },
        ],
    },
    {
        cat: '复合查询',
        items: [
            {
                name: 'bool',
                desc: 'must / should / filter / must_not 组合',
                code: '{\n  "query": {\n    "bool": {\n      "must": [{ "match": { "title": "es" } }],\n      "filter": [{ "term": { "status": "ok" } }],\n      "should": [{ "term": { "tag": "hot" } }],\n      "must_not": [{ "term": { "deleted": true } }],\n      "minimum_should_match": 1\n    }\n  }\n}',
            },
            {
                name: 'filter 上下文',
                desc: '不计算分数、可缓存，适合精确条件',
                code: '{\n  "query": {\n    "bool": {\n      "filter": [\n        { "term": { "type": "order" } },\n        { "range": { "amount": { "gte": 100 } } }\n      ]\n    }\n  }\n}',
            },
            {
                name: 'constant_score',
                desc: '包装 filter，固定分数',
                code: '{\n  "query": {\n    "constant_score": {\n      "filter": { "term": { "status": "A" } },\n      "boost": 1.2\n    }\n  }\n}',
            },
            {
                name: 'dis_max',
                desc: '取子查询最高分（可 tie_breaker）',
                code: '{\n  "query": {\n    "dis_max": {\n      "queries": [\n        { "match": { "title": "java" } },\n        { "match": { "body": "java" } }\n      ],\n      "tie_breaker": 0.3\n    }\n  }\n}',
            },
            {
                name: 'function_score',
                desc: '自定义打分（权重、字段值、衰减等）',
                code: '{\n  "query": {\n    "function_score": {\n      "query": { "match": { "title": "es" } },\n      "field_value_factor": {\n        "field": "popularity",\n        "modifier": "log1p",\n        "factor": 1.2\n      },\n      "boost_mode": "sum"\n    }\n  }\n}',
            },
            {
                name: 'boosting',
                desc: '降低匹配 negative 的文档分数',
                code: '{\n  "query": {\n    "boosting": {\n      "positive": { "match": { "text": "apple" } },\n      "negative": { "match": { "text": "pie" } },\n      "negative_boost": 0.5\n    }\n  }\n}',
            },
        ],
    },
    {
        cat: '聚合',
        items: [
            {
                name: 'terms 聚合',
                desc: '按字段分桶统计',
                code: '{\n  "size": 0,\n  "aggs": {\n    "by_status": {\n      "terms": { "field": "status.keyword", "size": 20 }\n    }\n  }\n}',
            },
            {
                name: 'date_histogram',
                desc: '时间直方图',
                code: '{\n  "size": 0,\n  "aggs": {\n    "per_day": {\n      "date_histogram": {\n        "field": "created_at",\n        "calendar_interval": "day",\n        "format": "yyyy-MM-dd"\n      }\n    }\n  }\n}',
            },
            {
                name: 'metric 聚合',
                desc: 'avg / sum / min / max / cardinality',
                code: '{\n  "size": 0,\n  "aggs": {\n    "avg_price": { "avg": { "field": "price" } },\n    "uniq_user": { "cardinality": { "field": "user_id" } }\n  }\n}',
            },
            {
                name: 'nested aggs',
                desc: '子聚合（桶内再聚合）',
                code: '{\n  "size": 0,\n  "aggs": {\n    "by_cat": {\n      "terms": { "field": "cat.keyword" },\n      "aggs": {\n        "avg_price": { "avg": { "field": "price" } }\n      }\n    }\n  }\n}',
            },
            {
                name: 'filter 聚合',
                desc: '单桶过滤后聚合',
                code: '{\n  "size": 0,\n  "aggs": {\n    "paid": {\n      "filter": { "term": { "paid": true } },\n      "aggs": { "sum_amount": { "sum": { "field": "amount" } } }\n    }\n  }\n}',
            },
            {
                name: 'composite',
                desc: '可分页的复合分桶',
                code: '{\n  "size": 0,\n  "aggs": {\n    "page": {\n      "composite": {\n        "size": 100,\n        "sources": [\n          { "user": { "terms": { "field": "user_id" } } }\n        ]\n      }\n    }\n  }\n}',
            },
        ],
    },
    {
        cat: '映射类型',
        items: [
            {
                name: 'text + keyword',
                desc: '全文 + 精确双字段常见模式',
                code: '{\n  "mappings": {\n    "properties": {\n      "title": {\n        "type": "text",\n        "fields": {\n          "keyword": { "type": "keyword", "ignore_above": 256 }\n        }\n      }\n    }\n  }\n}',
            },
            {
                name: 'keyword',
                desc: '精确值、聚合、排序',
                code: '{ "status": { "type": "keyword" } }',
            },
            {
                name: 'date / long / boolean',
                desc: '常用标量类型',
                code: '{\n  "created_at": { "type": "date", "format": "strict_date_optional_time||epoch_millis" },\n  "count": { "type": "long" },\n  "deleted": { "type": "boolean" }\n}',
            },
            {
                name: 'object / nested',
                desc: '对象 vs 嵌套（数组对象独立检索用 nested）',
                code: '{\n  "profile": { "type": "object" },\n  "tags": {\n    "type": "nested",\n    "properties": {\n      "name": { "type": "keyword" },\n      "score": { "type": "integer" }\n    }\n  }\n}',
            },
            {
                name: 'dense_vector',
                desc: '向量字段（kNN / 语义检索）',
                code: '{\n  "embedding": {\n    "type": "dense_vector",\n    "dims": 768,\n    "index": true,\n    "similarity": "cosine"\n  }\n}',
            },
            {
                name: 'dynamic mapping',
                desc: '动态映射策略',
                code: '{\n  "mappings": {\n    "dynamic": "strict",\n    "properties": { "id": { "type": "keyword" } }\n  }\n}',
                examples: ['dynamic: true | false | strict | runtime'],
            },
        ],
    },
    {
        cat: '常用 API 路径',
        items: [
            {
                name: 'GET /{index}/_search',
                desc: '搜索',
                code: 'GET /my-index/_search\n{\n  "from": 0,\n  "size": 20,\n  "query": { "match_all": {} },\n  "sort": [{ "created_at": "desc" }]\n}',
            },
            {
                name: 'POST /{index}/_doc',
                desc: '写入文档（自动 _id）',
                code: 'POST /my-index/_doc\n{ "title": "hello", "created_at": "2024-01-01T00:00:00Z" }',
                examples: ['PUT /my-index/_doc/1  # 指定 id', 'POST /my-index/_create/1'],
            },
            {
                name: 'POST /{index}/_bulk',
                desc: '批量写入 / 更新 / 删除',
                code: 'POST /_bulk\n{ "index": { "_index": "my-index", "_id": "1" } }\n{ "title": "a" }\n{ "delete": { "_index": "my-index", "_id": "2" } }\n',
            },
            {
                name: 'PUT /{index}',
                desc: '创建索引（settings + mappings）',
                code: 'PUT /my-index\n{\n  "settings": { "number_of_shards": 1, "number_of_replicas": 1 },\n  "mappings": { "properties": { "title": { "type": "text" } } }\n}',
            },
            {
                name: 'GET /{index}/_mapping',
                desc: '查看映射',
                code: 'GET /my-index/_mapping\nGET /my-index/_settings',
            },
            {
                name: 'POST /{index}/_update/{id}',
                desc: '部分更新 / 脚本更新',
                code: 'POST /my-index/_update/1\n{\n  "doc": { "status": "ok" }\n}',
                examples: ['{ "script": { "source": "ctx._source.count++" } }'],
            },
            {
                name: 'POST /{index}/_delete_by_query',
                desc: '按查询删除',
                code: 'POST /my-index/_delete_by_query\n{\n  "query": { "term": { "deleted": true } }\n}',
            },
            {
                name: 'GET /_cat / 集群健康',
                desc: '运维速览',
                code: 'GET /_cat/indices?v\nGET /_cluster/health\nGET /_nodes/stats',
            },
        ],
    },
];

function esdslrefToGroups() {
    return ESDSLREF_DATA;
}

let _esdslrefApi = null;

function esdslrefRender() {
    if (typeof RefEngine === 'undefined' || !RefEngine.mount) {
        return;
    }
    _esdslrefApi = RefEngine.mount({
        containerId: 'esdslrefContent',
        data: esdslrefToGroups(),
        searchId: 'esdslrefSearch',
    });
}

function esdslrefSearch() {
    if (_esdslrefApi) {
        _esdslrefApi.search();
    }
}

if (typeof registerInit === 'function') {
    registerInit('esdslref', esdslrefRender);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ESDSLREF_DATA: ESDSLREF_DATA,
        esdslrefToGroups: esdslrefToGroups,
    };
}
