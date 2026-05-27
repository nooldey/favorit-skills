#!/usr/bin/env node
/**
 * Generate a patent core-code appendix from a user-confirmed selection JSON.
 *
 * This script is intentionally deterministic: it does not decide which code is
 * important. The model/user must prepare the selection JSON first.
 *
 * Selection JSON format:
 * {
 *   "items": [
 *     {
 *       "path": "src/foo.ts",
 *       "start_line": 10,
 *       "end_line": 80,
 *       "title": "递归合并算法",
 *       "invention_point": "创新点1：...",
 *       "reason": "体现..."
 *     }
 *   ]
 * }
 */

import fs from 'node:fs';
import path from 'node:path';

const SENSITIVE_HINTS = [
  'password',
  'passwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_key',
  'private_key',
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function requireArg(args, name) {
  if (!args[name]) {
    throw new Error(`Missing required argument --${name}`);
  }
  return args[name];
}

function loadSelection(selectionPath) {
  const data = JSON.parse(fs.readFileSync(selectionPath, 'utf8'));
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  throw new Error('selection JSON must be a list or contain an items list');
}

function readLines(filePath, startLine, endLine) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const total = lines.length;
  const start = Number.isInteger(startLine) && startLine > 0 ? startLine : 1;
  const end = Number.isInteger(endLine) && endLine > 0 ? Math.min(endLine, total) : total;
  if (start > end) {
    throw new Error(`Invalid line range ${start}-${end} for ${filePath}`);
  }
  return {
    lines: lines.slice(start - 1, end),
    start,
    end,
  };
}

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.php': 'php',
    '.rb': 'ruby',
    '.cs': 'csharp',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sql': 'sql',
    '.sh': 'bash',
  };
  return map[ext] || 'text';
}

function hasSensitiveHint(text) {
  const lower = text.toLowerCase();
  return SENSITIVE_HINTS.some((hint) => lower.includes(hint));
}

function ensureInsideProject(projectRoot, targetPath) {
  const relative = path.relative(projectRoot, targetPath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function main() {
  const args = parseArgs(process.argv);
  const projectRoot = path.resolve(requireArg(args, 'project'));
  const selectionPath = path.resolve(requireArg(args, 'selection'));
  const outMd = requireArg(args, 'out-md');
  const outJson = requireArg(args, 'out-json');

  const items = loadSelection(selectionPath);
  const md = [
    '# 核心代码片段附录',
    '',
    '> 本附录仅包含用户确认可公开、且用于支撑发明点的核心代码片段。',
    '',
  ];
  const manifest = { items: [], warnings: [] };

  items.forEach((item, index) => {
    const displayIndex = index + 1;
    if (!item.path) {
      throw new Error(`item ${displayIndex} missing path`);
    }

    const filePath = path.resolve(projectRoot, item.path);
    if (!ensureInsideProject(projectRoot, filePath)) {
      throw new Error(`item ${displayIndex} path escapes project root: ${item.path}`);
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`item ${displayIndex} file not found: ${item.path}`);
    }

    const startLine = Number.isInteger(item.start_line) ? item.start_line : Number.parseInt(item.start_line, 10);
    const endLine = Number.isInteger(item.end_line) ? item.end_line : Number.parseInt(item.end_line, 10);
    const { lines, start, end } = readLines(
      filePath,
      Number.isNaN(startLine) ? undefined : startLine,
      Number.isNaN(endLine) ? undefined : endLine,
    );
    const code = lines.join('\n');
    const title = item.title || `代码片段${displayIndex}`;
    const inventionPoint = item.invention_point || '【待确认：对应发明点】';
    const reason = item.reason || '【待确认：选择理由】';
    const language = detectLanguage(filePath);
    const sensitive = hasSensitiveHint(code);

    md.push(
      `## A.${displayIndex} ${title}`,
      '',
      `- 文件路径：\`${item.path}\``,
      `- 行号范围：${start}-${end}`,
      `- 对应发明点：${inventionPoint}`,
      `- 选择理由：${reason}`,
    );

    if (sensitive) {
      md.push('- 脱敏提示：【待确认】片段中出现疑似密钥/令牌/敏感字段命名，请人工复核。');
      manifest.warnings.push({
        path: item.path,
        range: [start, end],
        warning: 'possible sensitive identifier',
      });
    }

    md.push('', `\`\`\`${language}`, code, '\`\`\`', '');

    manifest.items.push({
      index: displayIndex,
      path: item.path,
      start_line: start,
      end_line: end,
      title,
      invention_point: inventionPoint,
      reason,
      possible_sensitive_identifier: sensitive,
    });
  });

  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outMd, md.join('\n'), 'utf8');
  fs.writeFileSync(outJson, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, out_md: outMd, out_json: outJson, items: items.length }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
