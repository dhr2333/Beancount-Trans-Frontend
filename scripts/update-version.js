#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const version = process.argv[2];

if (!version) {
  console.error('缺少版本号参数，示例：node scripts/update-version.js 1.2.3');
  process.exit(1);
}

const MODULE_LABELS = {
  'Beancount-Trans-Backend': '后端',
  'Beancount-Trans-Frontend': '前端',
  'Beancount-Trans-Docs': '文档',
  'Beancount-Trans-Assets': '资产样板'
};

const shortSha = (sha) => (sha ? sha.slice(0, 7) : '无');

const loadSubmoduleSummary = () => {
  const summaryPath = resolve(workspaceRoot, 'release', 'submodule-summary.json');
  if (!existsSync(summaryPath)) {
    console.warn('未找到 release/submodule-summary.json，跳过 CHANGELOG 注入');
    return null;
  }

  try {
    const content = readFileSync(summaryPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`读取子模块摘要失败：${error.message}`);
    return null;
  }
};

const buildModuleLines = (summary) =>
  summary.map((item) => {
    const label = MODULE_LABELS[item.module] ?? item.module;
    if (!item.changed) {
      return [`- **${label}**（${item.module}）：无更新`];
    }

    const lines = [
      `- **${label}**（${item.module}）：${shortSha(item.from)} → ${shortSha(
        item.to
      )}`
    ];

    if (item.commits.length === 0) {
      lines.push('  - 无可用提交记录（可能为快进或人工对齐）');
    } else {
      for (const commit of item.commits) {
        lines.push(
          `  - ${commit.date} ${commit.subject} (${commit.hash.slice(
            0,
            7
          )} · ${commit.author})`
        );
      }
    }

    return lines;
  });

const injectSummaryIntoChangelog = (summaryPayload) => {
  if (!summaryPayload || !Array.isArray(summaryPayload.summary)) {
    console.warn('子模块摘要为空，跳过 CHANGELOG 注入');
    return;
  }

  const changelogPath = resolve(workspaceRoot, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    console.warn('未找到 CHANGELOG.md，跳过注入子模块摘要');
    return;
  }

  const changelog = readFileSync(changelogPath, 'utf8');
  const firstSectionStart = changelog.startsWith('## ')
    ? 0
    : changelog.indexOf('\n## ');

  if (firstSectionStart === -1) {
    console.warn('CHANGELOG.md 缺少版本章节，跳过注入');
    return;
  }

  const secondSectionStart = changelog.indexOf('\n## ', firstSectionStart + 1);
  const sectionEnd =
    secondSectionStart === -1 ? changelog.length : secondSectionStart;

  const section = changelog.slice(firstSectionStart, sectionEnd);
  const cleanedSection = section.replace(
    /### 子模块更新[\s\S]*?(?=\n### |\n## |$)/,
    ''
  );

  const moduleLines = buildModuleLines(summaryPayload.summary).flat();
  const block = ['### 子模块更新', ...moduleLines, ''].join('\n');

  const headerLineEnd = cleanedSection.indexOf('\n');
  const sectionWithBlock =
    cleanedSection.slice(0, headerLineEnd + 1) +
    '\n' +
    block +
    cleanedSection.slice(headerLineEnd + 1);

  const updatedChangelog =
    changelog.slice(0, firstSectionStart) +
    sectionWithBlock +
    changelog.slice(sectionEnd);

  writeFileSync(changelogPath, updatedChangelog);
  console.log(`已根据子模块摘要更新 CHANGELOG (版本 ${version})`);
};

const summaryPayload = loadSubmoduleSummary();
injectSummaryIntoChangelog(summaryPayload);
 