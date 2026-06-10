#!/usr/bin/env node

const { spawn } = require('child_process');

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
 * @returns {{cwd: string, branchName: string}} 解析结果。
 */
function parseArgs(argv) {
  const result = {
    cwd: process.cwd(),
    branchName: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--cwd') {
      result.cwd = argv[i + 1] || result.cwd;
      i += 1;
      continue;
    }

    if (current === '--branch') {
      result.branchName = argv[i + 1] || result.branchName;
      i += 1;
      continue;
    }

    if (!result.branchName) {
      result.branchName = current;
    }
  }

  return result;
}

/**
 * 创建基础新分支。
 * @param {string} cwd 工作目录。
 * @param {string} branchName 分支名。
 * @returns {Promise<void>} 执行结果。
 */
async function createBaseBranch(cwd, branchName) {
  if (!branchName) {
    throw new Error('缺少分支名');
  }

  await runCommandAsync('git', ['checkout', '-b', branchName], { cwd });
}

/**
 * 命令行入口。
 * @returns {Promise<void>} 执行结果。
 */
async function main() {
  const { cwd, branchName } = parseArgs(process.argv.slice(2));
  await createBaseBranch(cwd, branchName);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  runCommandAsync,
  parseArgs,
  createBaseBranch,
};
