#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readVersionLog } from './readVersionLog.mjs';

/**
 * 规范化版本列表。
 * @param {string|string[]} input 输入版本。
 * @returns {string[]} 版本数组。
 */
function normalizeVersions(input) {
  if (Array.isArray(input)) {
    return input;
  }

  return String(input)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 构建单个版本的祖先集合。
 * @param {Record<string, {extends?: string | string[], branches?: Record<string, string>}>>} log 版本记录。
 * @param {string} version 版本号。
 * @param {Map<string, Set<string>>} cache 祖先缓存。
 * @returns {Set<string>} 祖先集合。
 */
function getAncestors(log, version, cache) {
  if (cache.has(version)) {
    return cache.get(version);
  }

  const record = log[version];
  if (!record) {
    throw new Error(`Version not found: ${version}`);
  }

  const ancestors = new Set([version]);
  const parents = record.extends ? (Array.isArray(record.extends) ? record.extends : [record.extends]) : [];

  for (const parent of parents) {
    const parentAncestors = getAncestors(log, parent, cache);
    for (const item of parentAncestors) {
      ancestors.add(item);
    }
  }

  cache.set(version, ancestors);
  return ancestors;
}

/**
 * 找到输入版本里最上层的版本。
 * @param {Record<string, {extends?: string | string[], branches?: Record<string, string>}>>} log 版本记录。
 * @param {string[]} versions 输入版本。
 * @returns {string} 最高版本号。
 */
function resolveTopVersion(log, versions) {
  const cache = new Map();
  const candidate = versions.find((version) =>
    versions.every((otherVersion) => getAncestors(log, version, cache).has(otherVersion)),
  );

  if (!candidate) {
    throw new Error(`Input versions are not on the same inheritance chain: ${versions.join(', ')}`);
  }

  return candidate;
}

/**
 * 从基线引用生成 mix 分支名。
 * @param {string} baseRef 基线分支或 tag。
 * @param {string} userName git user.name。
 * @returns {string} 新分支名。
 */
function deriveNextMixBranchName(baseRef, userName) {
  const match = String(baseRef).match(/^v(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid base ref for branch naming: ${baseRef}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  return `v${major}.${minor}.0_mix_${userName}`;
}

/**
 * 解析版本引用中的主次修订号。
 * @param {string} ref 版本引用。
 * @returns {{major: number, minor: number, patch: number} | null} 解析结果。
 */
function parseVersionRef(ref) {
  const match = String(ref).match(/^v(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * 比较两个版本引用的高低。
 * @param {string} left 左侧版本引用。
 * @param {string} right 右侧版本引用。
 * @returns {number} 左侧更低返回负数，相等返回 0，更高返回正数。
 */
function compareVersionRef(left, right) {
  const leftRef = parseVersionRef(left);
  const rightRef = parseVersionRef(right);

  if (!leftRef || !rightRef) {
    throw new Error(`Invalid version ref for comparison: ${left} / ${right}`);
  }

  if (leftRef.major !== rightRef.major) {
    return leftRef.major - rightRef.major;
  }

  if (leftRef.minor !== rightRef.minor) {
    return leftRef.minor - rightRef.minor;
  }

  return leftRef.patch - rightRef.patch;
}

/**
 * 解析包的合并基线和命名基线。
 * @param {Record<string, string>} targetBranches 目标版本的 branches。
 * @param {{sourceRef: string}} sourceInfo 包的最终源信息。
 * @param {string} packageName 包名。
 * @returns {{baselineRef: string|null, baselineSource: string, branchNameBaseRef: string}} 基线信息。
 */
function resolvePackageBaseline(targetBranches, sourceInfo, packageName) {
  const targetRef = targetBranches[packageName] || '';
  const baselineRef = targetRef || null;
  const baselineSource = targetRef ? 'target-version' : 'target-checkout';
  const branchNameBaseRef = targetRef
    ? (compareVersionRef(sourceInfo.sourceRef, targetRef) >= 0 ? sourceInfo.sourceRef : targetRef)
    : sourceInfo.sourceRef;

  return { baselineRef, baselineSource, branchNameBaseRef };
}

/**
 * 读取 git user.name。
 * @returns {string} git 用户名。
 */
function readGitUserName() {
  return execSync('git config user.name', { encoding: 'utf8' }).trim();
}

/**
 * 构建继承链。
 * @param {Record<string, {extends?: string | string[], branches?: Record<string, string>}>>} log 版本记录。
 * @param {string} version 版本号。
 * @returns {{chain: string[], entries: Array<{version: string, branches: Record<string, string>}>}}
 */
function buildInheritanceChain(log, version) {
  const chain = [];
  const visiting = new Set();
  const visited = new Set();

  /**
   * 递归展开单个版本及其父版本。
   * @param {string} currentVersion 版本号。
   */
  const walk = (currentVersion) => {
    if (visited.has(currentVersion)) {
      return;
    }

    if (visiting.has(currentVersion)) {
      throw new Error(`Circular extends detected at ${currentVersion}`);
    }

    const record = log[currentVersion];
    if (!record) {
      throw new Error(`Version not found: ${currentVersion}`);
    }

    visiting.add(currentVersion);
    const parents = record.extends ? (Array.isArray(record.extends) ? record.extends : [record.extends]) : [];
    for (const parent of parents) {
      walk(parent);
    }
    visiting.delete(currentVersion);

    visited.add(currentVersion);
    chain.push(currentVersion);
  };

  walk(version);

  return {
    chain,
    entries: chain.map((item) => ({
      version: item,
      branches: log[item]?.branches || {},
    })),
  };
}

/**
 * 构建最终待合并清单。
 * @param {string[]} versions 输入版本。
 * @param {string} targetVersion 目标版本。
 * @param {string} env 环境名称。
 * @param {string} userName git 用户名。
 * @returns {Promise<Array<{packageName: string, sourceVersion: string, sourceRef: string, baselineRef: string|null, baselineSource: string, branchNameBaseRef: string, branchName: string}>>}
 */
async function buildMergeManifest(versions, targetVersion, env = 'prod', userName = '') {
  const log = await readVersionLog(env);
  const topVersion = resolveTopVersion(log, versions);
  const { entries } = buildInheritanceChain(log, topVersion);
  const targetRecord = log[targetVersion];
  if (!targetRecord) {
    throw new Error(`Target version not found: ${targetVersion}`);
  }

  const targetBranches = targetRecord.branches || {};
  const finalUserName = userName || readGitUserName();
  const latestByPackage = new Map();

  for (const entry of entries) {
    for (const [packageName, sourceRef] of Object.entries(entry.branches)) {
      latestByPackage.set(packageName, {
        packageName,
        sourceVersion: entry.version,
        sourceRef,
      });
    }
  }

  return Array.from(latestByPackage.entries()).map(([packageName, sourceInfo]) => {
    const { baselineRef, baselineSource, branchNameBaseRef } = resolvePackageBaseline(targetBranches, sourceInfo, packageName);
    return {
      packageName,
      sourceVersion: sourceInfo.sourceVersion,
      sourceRef: sourceInfo.sourceRef,
      baselineRef,
      baselineSource,
      branchNameBaseRef,
      branchName: deriveNextMixBranchName(branchNameBaseRef, finalUserName),
    };
  });
}

/**
 * 命令行入口。
 * @returns {Promise<void>} 执行结果。
 */
async function main() {
  const env = process.argv[2] || 'prod';
  const targetVersion = process.argv[3];
  const versions = normalizeVersions(process.argv[4] || '');
  const userName = process.argv[5] || '';

  if (!targetVersion) {
    throw new Error('Missing target version input');
  }

  if (!versions.length) {
    throw new Error('Missing versions input');
  }

  const manifest = await buildMergeManifest(versions, targetVersion, env, userName);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export {
  buildMergeManifest,
  buildInheritanceChain,
  normalizeVersions,
  resolveTopVersion,
  deriveNextMixBranchName,
  readGitUserName,
};
