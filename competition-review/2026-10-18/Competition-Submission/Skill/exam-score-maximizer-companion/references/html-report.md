# 离线 HTML 报告

输入采用 output-contracts.md 中的 report，生成单文件；
不需要 React、Vite、npm 安装、外部 API 或在线发布。

在技能目录下执行（当前目录即授权根）：

```powershell
node scripts/build_study_report.mjs --workspace . --input references/examples/report-input.json --output references/examples/study-report.html
```

输出已存在时先选新文件名；只有用户明确要覆盖该产物才使用 --overwrite。
--input/--output 为工作区内相对路径，拒绝绝对路径、.. 和链接越界。
生成 Markdown：

```powershell
node scripts/build_study_report.mjs --workspace . --input references/examples/report-input.json --output references/examples/study-report.md --format markdown
```

需要生成可分享副本时，在 HTML 或 Markdown 命令末尾追加 `--redact`；它不会修改输入 JSON。

输入缺项不补造；错误 JSON、超预算、错误数组等先指出具体问题，
仍可由模型把用户原始有效内容整理为 Markdown 并标待修复字段。
脚本发现疑似姓名、学号或手机号时会在标准错误输出不含原值的脱敏提醒，但不会阻断生成。
如需生成分享副本，可追加 `--redact`；该选项只改报告载荷，不改输入 JSON。
没有 Node.js 或脚本失败不能阻断考试辅导。读取已有结果生成 Markdown，
保留优先级、任务、薄弱点、错因、卡片和来源。

报告提供时间信息、优先考点、任务完成标准、掌握度色块/数字、
错题原因、折叠回忆卡、可选选择题、无脚本可用的目录锚点和打印内容。
选择题先作答后看答案；核心计划无 JS 仍可读。打印时展开答案。
权重表示来源给出的分值占比，不是命中率；掌握度未提供就显示无数据。

### 手写 HTML 的复制回流标准片段

手写 HTML 需要回流按钮时复用下面的片段，保留 Clipboard API、`execCommand` 降级和失败时展示可手动复制文本的路径；`#export-status` 应设置 `aria-live="polite"`，状态更新使用 `textContent`：

```javascript
const status = document.getElementById('export-status');
const done = () => {
  if (status) status.textContent = '已复制，可直接粘贴回对话。';
};
const promptManualCopy = text => {
  if (status) status.textContent = `自动复制失败，请手动复制：${text}`;
};
const fallbackCopy = text => {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch {}
  ta.remove();
  return copied;
};
const copyPasteback = text => {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done, () => {
      if (!fallbackCopy(text)) promptManualCopy(text);
      else done();
    });
  } else if (!fallbackCopy(text)) promptManualCopy(text);
  else done();
};
```

片段只负责复制与反馈；题号、对/猜对/错状态和括号内理由仍按数据契约解析，不能把复制成功当成掌握证据。

浏览器只在当前页面记录作答；用户先选择并点击“检查答案”，再可点击“导出本次作答”下载 attempts.json，或点击“复制作答记录”复制一行可直接粘贴回对话的复测结果。返回模型后按错因和真实解释更新计划。浏览器仅判选项对错，不能理解自由文本，
含理由的正确题最多候选 graduate，需模型核验理由；不把字数当掌握证明。
本地 HTML 的答案可查看，不是防作弊的正式考试系统。

验收：桌面与手机视口无全页横向溢出、按钮可用键盘操作、答案初始隐藏、
文字转义、无远程脚本/字体/CDN/图片、无跟踪与存储、导出字段可回流、
打印样式可用。报告会根据带时区的考试时间显示剩余天/时/分，过去日期显示“已到期”。
浏览器结果与 Node.js 测试证据分别记录。根据 2026-10-12 实机验证记录，已覆盖照片/文档材料、手写 HTML（含本地状态与剪贴板回流）及粘贴回传写回状态；接手人仍需在目标 TeleAgent 注册环境复现并记录实际结果。
