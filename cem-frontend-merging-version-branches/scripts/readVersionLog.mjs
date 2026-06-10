#!/usr/bin/env node

const cosurl = 'https://yunting-static-1251101074.cos.ap-shanghai.myqcloud.com/vers/';

/**
 * 读取远端版本记录文档。
 * @param {string} env 环境名称。
 * @returns {Promise<Record<string, {extends?: string | string[], branches?: Record<string, string>}>>} 版本记录。
 */
async function readVersionLog(env) {
  try {
    const remoteFile = `${cosurl}${env}-versions.json?timestamp=${Date.now()}`;
    console.info(`Fetching version records from: ${remoteFile}`);
    const resp = await fetch(remoteFile);

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }

    return await resp.json();
  } catch (error) {
    throw new Error(`Error reading ${env}-versions.json: ${error.message}`);
  }
}

/**
 * 命令行入口。
 * @returns {Promise<void>} 执行结果。
 */
async function main() {
  const env = process.argv[2] || 'prod';
  const data = await readVersionLog(env);
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export { readVersionLog };
