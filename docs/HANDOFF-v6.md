# 考前提分助手 v6 交接

日期：2026-10-12（Asia/Shanghai）。接手人：FishingQ。此交付通过 PR 审查，不自动合并、注册或发布。

## 目标与范围

校园生活赛道作品，基于团队原 `Study-for-Exam` 工作流。目标是帮助基础薄弱、材料零散、时间不足的大学生，把有限可学习时间投入最可能改善真实考试表现的任务。提分是优化目标，不保证分数、命中率或“必考”。

此次上传最新 v6 源码与已验证压缩包，只增加仓库入口和交接说明，不继续改功能。

| 位置 | 用途 |
|---|---|
| `exam-score-maximizer/SKILL.md` | 最新 Skill 入口；随完整目录导入 |
| `exam-score-maximizer/references/` | 证据、计划、数据契约、隐私、来源及评测资料 |
| `exam-score-maximizer/scripts/build_study_report.mjs` | 本地 HTML/Markdown 报告生成器 |
| `exam-score-maximizer/scripts/tests/report.test.mjs` | Node 自动回归测试 |
| `releases/exam-score-maximizer-teleagent-v6.zip` | 已验证 TeleAgent 交付包，根目录为 `exam-score-maximizer/` |
| 根目录 `SKILL.md`、`references/response-patterns.md` | 原版保留，仅用于溯源，不是 v6 入口 |

压缩包大小：40,473 字节。

SHA-256：`A453A6EFE62ACF5B742D63198A2761C4D18DE9EF6390A69545922B33CAED39E8`。

## 已完成

- 带来源和证据等级的考试地图，限时预算、必要前置知识与复测闭环。
- 初学者得分讲解、匹配已知卷型的模拟卷、单知识点闪卡和错因变式。
- 工作区 `study-state.json` 契约与增量续用规则。状态读写由宿主模型执行；报告脚本不承担状态管理。
- 首次三问、交付物菜单、今日三件事与复测队列、实际状态保存路径提示、材料提交顺序与 OCR 不确定性规则。
- 自包含离线 HTML，Markdown 回退；显式 `--redact` 只脱敏报告载荷，不修改输入 JSON。
- 作答 JSON 导出与“复制作答记录”本地回流，复制失败时提供可手动复制的内容。
- 导出前要求选择并检查作答；再次修改选项需重新检查；重复导出不累积旧记录。
- v6 修复报告规范的 Markdown 代码块，并增加 6 个无 JavaScript 可用的章节锚点及目录导航。

## 工程验证证据与限制

开发环境：Windows、Node.js v24.19.0。当前回归为 9/9 通过；无须安装 npm 依赖。

- Node 脚本语法、生成的内嵌脚本语法已检查。
- HTML/Markdown 双格式烟测已通过，默认 Markdown 与提供的生成示例逐字节一致。
- 12 条 `references/evals.json` 的编号及 JSON 语法已核验。它们是提示/预期输出场景，不是自动执行并评分的 12 个模型测试。
- 现有自动测试覆盖输入类型、预算/时区约束、XSS 转义、隐私告警、显式脱敏不改输入、路径穿越/不覆盖行为及回流格式化；目录 href 与目标 id 有静态断言。
- 压缩包解压后 9/9 测试与烟测再次通过。
- 静态扫描未发现脚本密钥、外部请求、跟踪或持久存储；这不是形式化安全证明。

前序 TeleAgent 分数来自用户转述：v5 为 97.4/100、S；本次上传不含原评审报告，也不把 v5 分数当作 v6 重新评审结果。

仍待验证：TeleAgent 注册与实际工具权限、跨会话模型状态写回、桌面/移动端浏览器滚动与键盘体验、剪贴板权限拒绝与 fallback、真实材料到学习闭环的行为评测。声明兼容 Node.js 18+，但此交付未在每个 Node 版本上运行。

## 接手任务（FishingQ）

- [ ] 检查 PR 差异：原版 Skill 保留，最新入口为独立目录，压缩包内容与源码一致。
- [ ] 运行下列工程验证，保存环境版本、命令、退出码和失败信息。
- [ ] 使用合成材料与合成错题，在 TeleAgent 导入 v6，验证“触发 → 三问/已有材料续用 → 今日计划 → 学习/测验 → 粘贴复测结果 → 状态写回 → 新会话续用”。状态路径须实际可读写，不能只口头宣称已保存。
- [ ] 在桌面和手机窄屏测试目录跳转；关闭 JavaScript 后再次测试，确认无全页横向溢出且目录可键盘访问。
- [ ] 使用含 quiz 的输入测试检查答案、修改选项后失效、重复导出不重复记录、复制成功/权限拒绝/手动复制回退。现有默认报告示例没有 quiz，不能用它证明按钮实测通过。
- [ ] 按数据契约回查 `q1 对 / q2 错（条件混淆）/ q3 猜对`，确认候选 graduate/ revamp/ retest；未知题号先追问，括号理由仍需核验。
- [ ] 运行 12 个评测场景并记录实际响应，区分静态规范与模型行为证据；随后进行 v6 复审、安全复核和注册。若通过，再由维护者决定合并/上线。

## 可直接复现的命令

从仓库根目录进入最新 Skill；测试依赖当前目录，不能在仓库根直接执行测试文件。

```powershell
cd exam-score-maximizer
node --version
node --check scripts/build_study_report.mjs
node --test scripts/tests/report.test.mjs
node -e "const fs=require('fs'); const x=JSON.parse(fs.readFileSync('references/evals.json','utf8')); if(x.evals.length!==12) process.exit(1); console.log(x.evals.length);"
node scripts/build_study_report.mjs --workspace . --input references/examples/report-input.json --output smoke.html
node scripts/build_study_report.mjs --workspace . --input references/examples/report-input.json --output smoke.md --format markdown
Get-FileHash -Algorithm SHA256 smoke.md
Get-FileHash -Algorithm SHA256 references/examples/generated-study-report.md
```

预期：测试 9/9；evals 为 12；首次双格式生成成功；两份 Markdown 哈希均为 `E75D621AE575EFA05EE236F6E9687D0AFA617E452F0892871BE5BA18318D3117`。第二次同名生成和路径穿越命令应返回退出码 1；不要为了通过测试给它们加 `--overwrite`。

```powershell
node scripts/build_study_report.mjs --workspace . --input references/examples/report-input.json --output smoke.html
node scripts/build_study_report.mjs --workspace . --input references/examples/report-input.json --output ..\escape.html
```

测试完仅清理自己生成的 `smoke.html`、`smoke.md`，不要覆盖已提交示例或真实学习状态。分享含个人信息的报告时可加 `--redact`，但模式识别并不保证识别全部敏感内容，分享前还需检查实际载荷。

## 不可破坏的边界与已知限制

- 不代答正在进行的正式考试，不自动操作教务系统；证据不足不编造，冲突不静默裁决。
- 不上传课程敏感资料、学习状态或真实作答记录；本仓库与 PR 只包含 Skill、合成样例及发布包。
- 报告脚本零第三方依赖、零网络；保留路径 realpath 检查、输入上限、类型/范围验证、HTML/JSON 转义、显式脱敏及默认不覆盖。
- 状态管理不接平台长期记忆 API，也未加入备份/回滚、自动提醒、企业备考扩展或游戏化功能；这些不是本次交接要求。
- 浏览器不能判断自由文本理由是否真正正确。长度阈值只筛选候选记录，不能据此认定掌握；模型仍需核验。
- 来源说明见 `references/provenance.md`。本次未替团队选择 LICENSE，也不将参考项目的许可证自动套用于当前作品。若后续复制第三方实现或正式对外发布，维护者需核实对应许可与声明。

## 提交修订时的返回格式

请在 PR 中返回 `changes`（文件与修改）、`verification`（命令/环境/实际结果）、`leftovers`（未解决问题及下一步）。不把文件存在、静态断言、提示集数量或旧分数当作实机成功证据。源码改变后重新打包并更新压缩包 SHA-256，避免交接两套不同版本。
