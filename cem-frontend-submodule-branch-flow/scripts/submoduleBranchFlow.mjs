#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const INPUT_RE = /^\s*(?<left>[^\s→=,]+(?:\/[^\s→=,]+)*)\s*(?:→|->|=>|=|,)\s*(?<branch>\S+)\s*$/;

/**
 * 执行命令并返回标准输出。
 * @param {string} cwd 工作目录。
 * @param {string} command 命令名。
 * @param {string[]} args 命令参数。
 * @param {{check?: boolean}} options 执行选项。
 * @returns {{ok: boolean, stdout: string, stderr: string}} 执行结果。
 */
function run(cwd, command, args, options = {}) {
  const check = options.check !== false;

  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    const result = {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || error.message || '').trim(),
    };
    if (check) {
      const message = result.stderr || result.stdout || `${command} ${args.join(' ')} failed`;
      throw new Error(message);
    }
    return result;
  }
}

/**
 * 执行 git 命令。
 * @param {string} cwd 工作目录。
 * @param {string[]} args git 参数。
 * @param {{check?: boolean}} options 执行选项。
 * @returns {string} 标准输出。
 */
function git(cwd, args, options = {}) {
  return run(cwd, 'git', args, options).stdout;
}

/**
 * 解析输入文本。
 * @param {string} text 输入文本。
 * @returns {Array<{raw: string, name: string, branch: string}>} 目标列表。
 */
function parseTargets(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const match = line.match(INPUT_RE);
      if (match?.groups) {
        return { raw: line, name: match.groups.left, branch: match.groups.branch };
      }

      const parts = line.split(/\s+/);
      if (parts.length === 2) {
        return { raw: line, name: parts[0], branch: parts[1] };
      }

      throw new Error(`无法解析输入行: ${line}`);
    });
}

/**
 * 读取 package.json 名称。
 * @param {string} filePath 文件路径。
 * @returns {string} 包名。
 */
function readPackageName(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')).name || '';
  } catch {
    return '';
  }
}

/**
 * 读取 .gitmodules 中的子模块信息。
 * @param {string} repo 仓库根目录。
 * @returns {Array<{path: string, url: string, packageName: string}>} 子模块列表。
 */
function readSubmodules(repo) {
  const output = git(repo, ['config', '--file', '.gitmodules', '--get-regexp', 'submodule\\..*\\.(path|url)'], {
    check: false,
  });
  const byName = new Map();

  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const [key, ...valueParts] = line.split(' ');
    const value = valueParts.join(' ').trim();
    const parts = key.split('.');
    const field = parts.at(-1);
    const name = parts.slice(1, -1).join('.');
    const item = byName.get(name) || { path: '', url: '', packageName: '' };

    if (field === 'path') {
      item.path = value;
    }
    if (field === 'url') {
      item.url = value;
    }
    byName.set(name, item);
  }

  return Array.from(byName.values())
    .filter((item) => item.path)
    .map((item) => ({
      ...item,
      packageName: readPackageName(`${repo}/${item.path}/package.json`),
    }));
}

/**
 * 解析子模块路径。
 * @param {string} targetName 输入名称。
 * @param {Array<{path: string, url: string, packageName: string}>} submodules 子模块列表。
 * @returns {{path: string, url: string, packageName: string} | null} 子模块。
 */
function resolveSubmodule(targetName, submodules) {
  const name = targetName.trim().replace(/^['"]|['"]$/g, '');
  const base = name.split('/').at(-1);

  return (
    submodules.find((item) => item.path.replace(/\/$/, '') === name.replace(/\/$/, '')) ||
    submodules.find((item) => item.packageName === name) ||
    submodules.find((item) => item.packageName.split('/').at(-1) === base) ||
    submodules.find((item) => basename(item.url.replace(/\.git$/, '')) === base) ||
    null
  );
}

/**
 * 分析单个目标。
 * @param {string} repo 仓库根目录。
 * @param {{name: string, branch: string}} target 目标。
 * @param {{path: string, url: string, packageName: string}} submodule 子模块。
 * @param {boolean} shouldFetch 是否拉取远端引用。
 * @returns {Record<string, unknown>} 分析结果。
 */
function analyzeOne(repo, target, submodule, shouldFetch) {
  const subrepo = `${repo}/${submodule.path}`;
  const targetRef = `origin/${target.branch}`;

  try {
    if (shouldFetch) {
      git(subrepo, ['fetch', 'origin', `${target.branch}:refs/remotes/${targetRef}`]);
    }

    const currentRef = git(subrepo, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { check: false }) || 'HEAD (detached)';
    const currentCommit = git(subrepo, ['rev-parse', 'HEAD']);
    const targetCommit = git(subrepo, ['rev-parse', targetRef]);
    const mergeBase = git(subrepo, ['merge-base', 'HEAD', targetRef]);
    const [currentOnly, targetOnly] = git(subrepo, ['rev-list', '--left-right', '--count', `HEAD...${targetRef}`])
      .split(/\s+/)
      .map(Number);
    const targetCommits = git(subrepo, ['log', '--oneline', '--decorate', '--no-merges', `HEAD..${targetRef}`], {
      check: false,
    })
      .split(/\r?\n/)
      .filter(Boolean);
    const currentCommits = git(subrepo, ['log', '--oneline', '--decorate', '--no-merges', `${targetRef}..HEAD`], {
      check: false,
    })
      .split(/\r?\n/)
      .filter(Boolean);
    const dirtyStatus = git(subrepo, ['status', '--porcelain=v1'], { check: false })
      .split(/\r?\n/)
      .filter(Boolean);

    return {
      inputName: target.name,
      branch: target.branch,
      path: submodule.path,
      packageName: submodule.packageName,
      currentRef,
      currentCommit,
      targetRef,
      targetCommit,
      mergeBase,
      targetNotInCurrent: targetOnly,
      currentNotInTarget: currentOnly,
      targetCommits,
      currentCommits,
      dirtyStatus,
      error: '',
    };
  } catch (error) {
    return {
      inputName: target.name,
      branch: target.branch,
      path: submodule.path,
      packageName: submodule.packageName,
      currentRef: '',
      currentCommit: '',
      targetRef,
      targetCommit: '',
      mergeBase: '',
      targetNotInCurrent: 0,
      currentNotInTarget: 0,
      targetCommits: [],
      currentCommits: [],
      dirtyStatus: [],
      error: error.message,
    };
  }
}

/**
 * 截短提交号。
 * @param {string} commit 提交号。
 * @returns {string} 短提交号。
 */
function shortCommit(commit) {
  return commit ? commit.slice(0, 8) : '';
}

/**
 * 输出 Markdown。
 * @param {Array<Record<string, unknown>>} results 分析结果。
 * @returns {string} Markdown 文本。
 */
function toMarkdown(results) {
  const lines = [
    '| 输入 | 路径 | 当前引用 | 当前提交 | 目标分支 | 目标提交 | 目标未覆盖 | 当前独有 | 状态 |',
    '|---|---|---|---:|---|---:|---:|---:|---|',
  ];

  for (const item of results) {
    const status = item.error ? '错误' : item.dirtyStatus.length ? '工作区有变更' : '干净';
    lines.push(
      `| \`${item.inputName}\` | \`${item.path}\` | \`${item.currentRef}\` | \`${shortCommit(item.currentCommit)}\` | ` +
        `\`${item.targetRef}\` | \`${shortCommit(item.targetCommit)}\` | ${item.targetNotInCurrent} | ${item.currentNotInTarget} | ${status} |`,
    );
  }

  for (const item of results) {
    lines.push('', `### ${item.inputName} -> ${item.branch}`);
    if (item.error) {
      lines.push(`错误: \`${item.error}\``);
      continue;
    }
    if (item.targetCommits.length) {
      lines.push('目标分支中当前未覆盖的提交:');
      lines.push(...item.targetCommits.map((line) => `- \`${line}\``));
    } else {
      lines.push('目标分支中没有当前未覆盖的提交。');
    }
    if (item.dirtyStatus.length) {
      lines.push('工作区状态:');
      lines.push(...item.dirtyStatus.map((line) => `- \`${line}\``));
    }
  }

  return lines.join('\n');
}

/**
 * 解析命令行参数。
 * @param {string[]} argv 参数。
 * @returns {Record<string, string | boolean>} 参数对象。
 */
function parseArgs(argv) {
  const result = { command: '', repo: process.cwd(), inputFile: '', format: 'json', noFetch: false };
  result.command = argv[0] || '';

  for (let i = 1; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--repo') {
      result.repo = argv[++i] || result.repo;
      continue;
    }
    if (current === '--input-file') {
      result.inputFile = argv[++i] || '';
      continue;
    }
    if (current === '--format') {
      result.format = argv[++i] || result.format;
      continue;
    }
    if (current === '--no-fetch') {
      result.noFetch = true;
    }
  }

  return result;
}

/**
 * 命令行入口。
 * @returns {number} 退出码。
 */
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== 'analyze' || !args.inputFile) {
    console.error('Usage: submoduleBranchFlow.mjs analyze --input-file <file> [--repo <repo>] [--format json|markdown] [--no-fetch]');
    return 2;
  }

  const targets = parseTargets(readFileSync(args.inputFile, 'utf8'));
  const submodules = readSubmodules(args.repo);
  const results = targets.map((target) => {
    const submodule = resolveSubmodule(target.name, submodules);
    if (!submodule) {
      return {
        inputName: target.name,
        branch: target.branch,
        path: '',
        packageName: '',
        currentRef: '',
        currentCommit: '',
        targetRef: `origin/${target.branch}`,
        targetCommit: '',
        mergeBase: '',
        targetNotInCurrent: 0,
        currentNotInTarget: 0,
        targetCommits: [],
        currentCommits: [],
        dirtyStatus: [],
        error: '无法定位对应子模块路径',
      };
    }
    return analyzeOne(args.repo, target, submodule, !args.noFetch);
  });

  if (args.format === 'markdown') {
    console.log(toMarkdown(results));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }

  return results.some((item) => item.error) ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}

export { analyzeOne, parseTargets, readSubmodules, resolveSubmodule, toMarkdown };
