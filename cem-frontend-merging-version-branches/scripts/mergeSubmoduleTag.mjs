#!/usr/bin/env node

import { spawn } from 'node:child_process';

/**
 * 异步执行命令。
 * @param {string} command 命令名称。
 * @param {string[]} args 命令参数。
 * @param {import('child_process').SpawnOptions} options 执行选项。
 * @returns {Promise<void>} 执行结果。
 */
function runCommandAsync(command, args, options = {}) {
  const commandText = `${command} ${args.join(' ')}`;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${commandText} 执行失败，退出码: ${code}`));
    });
  });
}

/**
 * 解析命令行参数。
 * @param {string[]} argv 命令行参数。
 * @returns {{cwd: string, ref: string}} 解析结果。
 */
function parseArgs(argv) {
  const result = {
    cwd: process.cwd(),
    ref: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--cwd') {
      result.cwd = argv[i + 1] || result.cwd;
      i += 1;
      continue;
    }

    if (current === '--ref') {
      result.ref = argv[i + 1] || result.ref;
      i += 1;
      continue;
    }

    if (!result.ref) {
      result.ref = current;
    }
  }

  return result;
}

/**
 * 在子模块目录合并 tag。
 * @param {string} cwd 工作目录。
 * @param {string} ref 分支或 tag 名。
 * @returns {Promise<void>} 执行结果。
 */
async function mergeSubmoduleTag(cwd, ref) {
  if (!ref) {
    throw new Error('缺少合并引用');
  }

  await runCommandAsync('git', ['merge', '--no-ff', ref], { cwd });
}

/**
 * 命令行入口。
 * @returns {Promise<void>} 执行结果。
 */
async function main() {
  const { cwd, ref } = parseArgs(process.argv.slice(2));
  await mergeSubmoduleTag(cwd, ref);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export {
  mergeSubmoduleTag,
  parseArgs,
  runCommandAsync,
};
