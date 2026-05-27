#!/usr/bin/env node
/** Lightweight structural checker for software patent disclosure Markdown. */

import fs from 'node:fs';

const REQUIRED_HEADINGS = [
  '一、发明名称',
  '二、发明背景',
  '三、发明内容',
  '四、说明书附图',
  '五、应用领域',
  '六、具体实施方式',
  '七、引证资料',
  '八、其它说明',
];

const SOFT_COPYRIGHT_TERMS = [
  '软件著作权申请表',
  '著作权登记',
  '操作手册',
  '前30页',
  '后30页',
  '前 30 页',
  '后 30 页',
  '软著代码材料',
];

function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('usage: check_patent_material.mjs <markdown-file>');
  }

  const text = fs.readFileSync(file, 'utf8');
  const missingHeadings = REQUIRED_HEADINGS.filter((heading) => !text.includes(heading));
  const todoMarkerCount = (text.match(/【待确认/g) || []).length + (text.match(/待确认】/g) || []).length;
  const figureReferenceCount = (text.match(/图\s*\d+|图[一二三四五六七八九十]+/g) || []).length;
  const codeFenceCount = (text.match(/^```/gm) || []).length;
  const possibleSoftCopyrightTerms = SOFT_COPYRIGHT_TERMS.filter((term) => text.includes(term));
  const warnings = [];

  if (figureReferenceCount < 3) {
    warnings.push('说明书附图引用少于 3 处，请确认是否覆盖核心结构、流程和数据。');
  }
  if (todoMarkerCount > 0) {
    warnings.push('仍存在待确认标记，正式输出前应让用户确认是否保留。');
  }
  if (codeFenceCount % 2 !== 0) {
    warnings.push('代码块围栏数量为奇数，可能存在未闭合代码块。');
  }
  if (possibleSoftCopyrightTerms.length > 0) {
    warnings.push('检测到疑似软著材料术语，请确认是否误混入专利材料。');
  }

  const result = {
    ok: missingHeadings.length === 0 && possibleSoftCopyrightTerms.length === 0,
    missing_headings: missingHeadings,
    todo_marker_count: todoMarkerCount,
    figure_reference_count: figureReferenceCount,
    code_fence_count: codeFenceCount,
    possible_soft_copyright_terms: possibleSoftCopyrightTerms,
    warnings,
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
