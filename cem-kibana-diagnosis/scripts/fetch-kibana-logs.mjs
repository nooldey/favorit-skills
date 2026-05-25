#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_KIBANA_URL = "https://kibana.ops.skieer.com";
const DEFAULT_SPACE = "cem";
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_OUTPUT = "jsonl";
const DEFAULT_ENVIRONMENT_FIELD = "project.keyword";
const DEFAULT_SERVICE_FIELD = "kubernetes.labels.k8s-app.keyword";
const DEFAULT_SOURCE_FIELDS = [
  "@timestamp",
  "project",
  "kubernetes.pod.name",
  "kubernetes.labels.k8s-app",
  "message",
];
const READ_ONLY_SEARCH_PATH_SUFFIX = "/_search";

/**
 * 输出帮助信息。
 */
function writeHelp() {
  process.stdout.write(`用法:
node scripts/fetch-kibana-logs.mjs --from <UTC_ISO> --to <UTC_ISO> --environment <env> --service <service> [options]

必填三要素:
  --from <UTC_ISO>             日志开始时间
  --to <UTC_ISO>               日志结束时间
  --environment <env>          分析环境，例如 ss3/prd/sv/bsd
  --service <service>          服务名

常用选项:
  --kibanaUrl <url>            默认 ${DEFAULT_KIBANA_URL}
  --space <space>              默认 ${DEFAULT_SPACE}
  --index <pattern>            默认 cem-<environment>-log-*
  --project <project>          默认 cem-<environment>
  --environmentField <field>   默认 ${DEFAULT_ENVIRONMENT_FIELD}
  --serviceField <field>       默认 ${DEFAULT_SERVICE_FIELD}
  --filter <field=value>       精确筛选，可重复
  --messageIncludes <text>     message 短语筛选，可重复
  --exists <field>             字段存在筛选，可重复
  --source <csv>               _source 字段列表
  --includeSource              在输出行中包含原始 _source
  --size <n>                   单页数量，默认 ${DEFAULT_PAGE_SIZE}
  --maxRows <n>                最多输出行数
  --output <jsonl|json>        默认 ${DEFAULT_OUTPUT}
`);
}

/**
 * 解析命令行参数，支持重复参数。
 *
 * @param {string[]} argv 命令行参数。
 * @returns {Record<string, string | boolean | string[]>} 解析后的参数。
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    const value = !next || next.startsWith("--") ? true : next;
    if (value !== true) i += 1;

    if (Object.hasOwn(args, key)) {
      const existing = args[key];
      args[key] = Array.isArray(existing)
        ? [...existing, String(value)]
        : [String(existing), String(value)];
    } else {
      args[key] = value;
    }
  }
  return args;
}

/**
 * 将参数值转换为字符串数组。
 *
 * @param {string | boolean | string[] | undefined} value 参数值。
 * @returns {string[]} 字符串数组。
 */
function toArray(value) {
  if (value === undefined || value === false) return [];
  if (Array.isArray(value)) return value.map(String);
  if (value === true) return [];
  return [String(value)];
}

/**
 * 读取 .env 文件，不向控制台输出任何敏感值。
 *
 * @param {string} envPath .env 文件路径。
 * @returns {Record<string, string>} 环境变量。
 */
function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/**
 * 检查三要素是否完整。
 *
 * @param {Record<string, string | boolean | string[]>} args 命令行参数。
 */
function assertRequiredDiagnosisArgs(args) {
  const missing = [];
  if (!args.from) missing.push("--from 日志开始时间");
  if (!args.to) missing.push("--to 日志结束时间");
  if (!args.service) missing.push("--service 服务名");
  if (!args.environment) missing.push("--environment 分析环境");

  if (missing.length > 0) {
    throw new Error(
      `缺少查询前三要素：${missing.join("、")}。请由用户明确提供后再查询。`,
    );
  }
}

/**
 * 校验时间范围。
 *
 * @param {string} from 起始时间。
 * @param {string} to 结束时间。
 */
function assertTimeRange(from, to) {
  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  if (Number.isNaN(fromTime) || Number.isNaN(toTime)) {
    throw new Error("--from 和 --to 必须是可解析的明确时间，建议使用 UTC ISO 字符串。");
  }
  if (fromTime > toTime) {
    throw new Error("--from 不能晚于 --to。");
  }
}

/**
 * 校验字段名，避免构造异常查询。
 *
 * @param {string} field 字段名。
 * @returns {string} 原字段名。
 */
function validateFieldName(field) {
  if (!/^[A-Za-z0-9@._-]+$/.test(field)) {
    throw new Error(`字段名不合法：${field}`);
  }
  return field;
}

/**
 * 校验索引表达式，禁止斜杠进入请求路径。
 *
 * @param {string} indexName 索引表达式。
 * @returns {string} 原索引表达式。
 */
function validateIndexName(indexName) {
  if (!/^[A-Za-z0-9*._,-]+$/.test(indexName)) {
    throw new Error(`索引表达式不合法：${indexName}`);
  }
  return indexName;
}

/**
 * 校验 Kibana space。
 *
 * @param {string} space Kibana space。
 * @returns {string} 原 space。
 */
function validateSpace(space) {
  if (!/^[A-Za-z0-9_-]+$/.test(space)) {
    throw new Error(`Kibana space 不合法：${space}`);
  }
  return space;
}

/**
 * 校验 Kibana URL，禁止在 URL 中携带凭证。
 *
 * @param {string} kibanaUrl Kibana 地址。
 * @returns {string} 标准化 URL 字符串。
 */
function validateKibanaUrl(kibanaUrl) {
  const url = new URL(kibanaUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Kibana URL 只允许 http 或 https。");
  }
  if (url.username || url.password) {
    throw new Error("Kibana URL 不能包含账号或密码。");
  }
  return url.toString();
}

/**
 * 解析 field=value 过滤条件。
 *
 * @param {string} raw 原始过滤条件。
 * @returns {{ field: string, value: string }} 过滤条件。
 */
function parseExactFilter(raw) {
  const index = raw.indexOf("=");
  if (index === -1) {
    throw new Error(`--filter 必须使用 field=value 格式：${raw}`);
  }
  const field = validateFieldName(raw.slice(0, index).trim());
  const value = raw.slice(index + 1).trim();
  if (!value) {
    throw new Error(`--filter 的值不能为空：${raw}`);
  }
  return { field, value };
}

/**
 * 生成 term 查询。
 *
 * @param {string} field 字段名。
 * @param {string} value 字段值。
 * @returns {object} Elasticsearch term 查询。
 */
function termFilter(field, value) {
  return { term: { [field]: value } };
}

/**
 * 生成默认 project 值。
 *
 * @param {string} environment 环境名。
 * @returns {string} project 值。
 */
function defaultProject(environment) {
  return `cem-${environment}`;
}

/**
 * 生成默认索引表达式。
 *
 * @param {string} environment 环境名。
 * @returns {string} 索引表达式。
 */
function defaultIndex(environment) {
  return `cem-${environment}-log-*`;
}

/**
 * 将 keyword 字段转换为 _source 路径。
 *
 * @param {string} field 字段名。
 * @returns {string} _source 路径。
 */
function sourcePath(field) {
  return field.replace(/\.keyword$/, "");
}

/**
 * 从对象中按点路径读取值。
 *
 * @param {object} source 原始对象。
 * @param {string} dottedPath 点路径。
 * @returns {unknown} 读取到的值。
 */
function readDottedPath(source, dottedPath) {
  return dottedPath.split(".").reduce((value, part) => {
    if (value && typeof value === "object" && Object.hasOwn(value, part)) {
      return value[part];
    }
    return undefined;
  }, source);
}

/**
 * 生成 Elasticsearch 查询体。
 *
 * @param {object} options 查询选项。
 * @param {string} options.from UTC 起始时间。
 * @param {string} options.to UTC 结束时间。
 * @param {string} options.environment 环境名。
 * @param {string} options.service 服务名。
 * @param {string} options.project project 值。
 * @param {string} options.environmentField 环境字段。
 * @param {string} options.serviceField 服务字段。
 * @param {{ field: string, value: string }[]} options.exactFilters 精确过滤。
 * @param {string[]} options.messageIncludes message 短语过滤。
 * @param {string[]} options.existsFields 存在性过滤。
 * @param {string[]} options.sourceFields _source 字段。
 * @param {number} options.size 单页数量。
 * @param {unknown[] | undefined} options.searchAfter search_after 游标。
 * @returns {object} 查询体。
 */
function buildSearchBody({
  from,
  to,
  service,
  project,
  environmentField,
  serviceField,
  exactFilters,
  messageIncludes,
  existsFields,
  sourceFields,
  size,
  searchAfter,
}) {
  const filters = [
    termFilter(environmentField, project),
    termFilter(serviceField, service),
    {
      range: {
        "@timestamp": {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  for (const item of exactFilters) {
    filters.push(termFilter(item.field, item.value));
  }
  for (const text of messageIncludes) {
    filters.push({ match_phrase: { message: text } });
  }
  for (const field of existsFields) {
    filters.push({ exists: { field } });
  }

  const body = {
    size,
    sort: [{ "@timestamp": "asc" }, { _doc: "asc" }],
    _source: sourceFields,
    query: {
      bool: {
        filter: filters,
      },
    },
  };

  if (searchAfter) {
    body.search_after = searchAfter;
  }

  return body;
}

/**
 * 生成 Kibana Basic Auth 请求头。
 *
 * @param {string} account Kibana 账号。
 * @param {string} password Kibana 密码。
 * @returns {string} Authorization 请求头。
 */
function buildBasicAuth(account, password) {
  return `Basic ${Buffer.from(`${account}:${password}`).toString("base64")}`;
}

/**
 * 通过 Kibana Console proxy 发起只读搜索。
 *
 * @param {object} options 请求选项。
 * @param {string} options.kibanaUrl Kibana 根地址。
 * @param {string} options.space Kibana space。
 * @param {string} options.indexName Elasticsearch 索引表达式。
 * @param {string} options.authorization Authorization 请求头。
 * @param {object} options.body 查询体。
 * @returns {Promise<object>} Elasticsearch 响应 JSON。
 */
async function requestKibanaSearch({
  kibanaUrl,
  space,
  indexName,
  authorization,
  body,
}) {
  const proxyUrl = new URL(`/s/${space}/api/console/proxy`, kibanaUrl);
  const searchPath = `${indexName}${READ_ONLY_SEARCH_PATH_SUFFIX}`;
  if (!searchPath.endsWith(READ_ONLY_SEARCH_PATH_SUFFIX)) {
    throw new Error("拒绝执行非只读 Kibana API 请求。");
  }
  proxyUrl.searchParams.set("path", searchPath);
  proxyUrl.searchParams.set("method", "POST");

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
      "kbn-xsrf": "true",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { message: text.slice(0, 500) };
  }

  if (!response.ok) {
    const reason =
      payload?.error?.reason || payload?.message || response.statusText;
    throw new Error(`Kibana API 请求失败: ${response.status} ${reason}`);
  }

  return payload;
}

/**
 * 标准化 Elasticsearch hit。
 *
 * @param {object} hit Elasticsearch hit。
 * @param {object} options 标准化选项。
 * @param {string} options.serviceField 服务字段。
 * @param {string} options.environmentField 环境字段。
 * @param {boolean} options.includeSource 是否输出原始 _source。
 * @returns {object} 标准日志行。
 */
function normalizeHit(hit, { serviceField, environmentField, includeSource }) {
  const source = hit._source || {};
  const row = {
    timestamp: source["@timestamp"],
    pod: readDottedPath(source, "kubernetes.pod.name"),
    service: readDottedPath(source, sourcePath(serviceField)),
    environment: readDottedPath(source, sourcePath(environmentField)),
    message: source.message,
    sort: hit.sort,
  };

  if (includeSource) {
    row.source = source;
  }

  return row;
}

/**
 * 输出日志行。
 *
 * @param {object[]} rows 日志行。
 * @param {string} format 输出格式。
 */
function writeRows(rows, format) {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }

  for (const row of rows) {
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }
}

/**
 * 读取凭证。
 *
 * @returns {{ account: string | undefined, password: string | undefined }} Kibana 凭证。
 */
function readCredentials() {
  const currentRoot = process.cwd();
  const env = {
    ...readEnvFile(path.join(currentRoot, ".env")),
    ...readEnvFile(path.join(currentRoot, ".env.local")),
    ...process.env,
  };
  return {
    account: env.kibana_account || env.KIBANA_ACCOUNT,
    password: env.kibana_pwd || env.KIBANA_PWD,
  };
}

/**
 * 将 CSV 字段列表解析为数组。
 *
 * @param {string | boolean | string[] | undefined} value 参数值。
 * @returns {string[]} 字段数组。
 */
function parseSourceFields(value) {
  if (!value || value === true) return DEFAULT_SOURCE_FIELDS;
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  const fields = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(validateFieldName);
  return fields.length > 0 ? fields : DEFAULT_SOURCE_FIELDS;
}

/**
 * 入口函数。
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    writeHelp();
    return;
  }

  assertRequiredDiagnosisArgs(args);

  const from = String(args.from);
  const to = String(args.to);
  const environment = String(args.environment).trim();
  const service = String(args.service).trim();
  assertTimeRange(from, to);
  if (!environment) throw new Error("--environment 不能为空。");
  if (!service) throw new Error("--service 不能为空。");

  const kibanaUrl = validateKibanaUrl(
    String(args.kibanaUrl || DEFAULT_KIBANA_URL),
  );
  const space = validateSpace(String(args.space || DEFAULT_SPACE));
  const indexName = validateIndexName(
    String(args.index || defaultIndex(environment)),
  );
  const project = String(args.project || defaultProject(environment));
  const environmentField = validateFieldName(
    String(args.environmentField || DEFAULT_ENVIRONMENT_FIELD),
  );
  const serviceField = validateFieldName(
    String(args.serviceField || DEFAULT_SERVICE_FIELD),
  );
  const exactFilters = toArray(args.filter).map(parseExactFilter);
  const messageIncludes = toArray(args.messageIncludes);
  const existsFields = toArray(args.exists).map(validateFieldName);
  const sourceFields = parseSourceFields(args.source);
  const size = Number(args.size || DEFAULT_PAGE_SIZE);
  const output = String(args.output || DEFAULT_OUTPUT);
  const maxRows = args.maxRows
    ? Number(args.maxRows)
    : Number.POSITIVE_INFINITY;
  const includeSource = args.includeSource === true;

  if (!Number.isInteger(size) || size <= 0 || size > 10000) {
    throw new Error("--size 必须是 1 到 10000 的整数。");
  }
  if (
    maxRows !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(maxRows) || maxRows <= 0)
  ) {
    throw new Error("--maxRows 必须是正整数。");
  }
  if (!["jsonl", "json"].includes(output)) {
    throw new Error("--output 只支持 jsonl 或 json。");
  }

  const { account, password } = readCredentials();
  if (!account || !password) {
    throw new Error(
      "缺少 kibana_account 或 kibana_pwd，请在当前目录 .env/.env.local 或环境变量中配置。",
    );
  }

  const authorization = buildBasicAuth(account, password);
  let searchAfter;
  let total = 0;
  const jsonRows = [];

  while (total < maxRows) {
    const body = buildSearchBody({
      from,
      to,
      environment,
      service,
      project,
      environmentField,
      serviceField,
      exactFilters,
      messageIncludes,
      existsFields,
      sourceFields,
      size: Math.min(size, maxRows - total),
      searchAfter,
    });

    const payload = await requestKibanaSearch({
      kibanaUrl,
      space,
      indexName,
      authorization,
      body,
    });

    const hits = payload?.hits?.hits || [];
    if (hits.length === 0) break;

    const rows = hits.map((hit) =>
      normalizeHit(hit, { serviceField, environmentField, includeSource }),
    );
    if (output === "json") {
      jsonRows.push(...rows);
    } else {
      writeRows(rows, output);
    }

    total += rows.length;
    searchAfter = hits[hits.length - 1].sort;
  }

  if (output === "json") {
    writeRows(jsonRows, output);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
