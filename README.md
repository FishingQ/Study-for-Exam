# Study-for-Exam

## 最新交付：考前提分助手 v6

基于原 `exam-prep-workflow` 改进的 TeleAgent Skill，面向基础薄弱、材料零散、时间不足的大学生，帮助在有限时间内安排复习并改善考试表现，不承诺分数或命中率。

- [Skill 入口](exam-score-maximizer/SKILL.md)：本次最新版本；安装或注册时使用整个 `exam-score-maximizer/` 目录。
- [v6 压缩包](releases/exam-score-maximizer-teleagent-v6.zip)：用于 TeleAgent 导入，不含仓库 README 与交接说明。
- [交接任务与验证记录](docs/HANDOFF-v6.md)：接手人、复现命令、安全边界和待实机验证项。

v6 包含可溯源考试地图、限时提分计划、初学者讲解、模拟卷、闪卡、错题复测、工作区状态续用，以及离线 HTML 报告、复制作答回流和无脚本目录导航。报告生成器无第三方依赖、无网络调用；可选脚本需要 Node.js 18+。

当前本地工程回归：9/9 自动测试通过，12 条评测提示 JSON 合法；提示集尚不等于已执行的模型评测。v6 的 TeleAgent 注册与浏览器实机体验由接手人继续验证，详见交接文档。

## 原版：exam-prep-workflow

下列说明对应仓库根目录的原版 `SKILL.md` 与 `references/response-patterns.md`，本次保留它们用于溯源；请不要把原版误当成 v6 安装入口，也不要混装两个版本。

把零散课程材料变成可追溯证据的考试地图，再变成练习、反馈和冲刺包——为「基础薄弱也能拿分」优化。

Turn scattered course materials into an evidence-traceable exam map, then into practice, feedback, and a final sprint pack — optimized for scoring when starting from a weak foundation.

## Triggers / 触发时机

- 新开一门课；确定考试重点
- 推断题型、大题、必考内容
- 还原老师口述的试卷
- 整理知识点、制作错题本 / 练习网站
- 生成与真实试卷结构一致的模拟卷（含答案与详解）
- 诊断薄弱点、考前 48 小时冲刺

## Pipeline / 流程

侦查与溯源 → 构建考试地图 → 锁定大题 → 核心学习包 → 逐题打分讲解 → 变式卷（不跑偏）→ 错因反馈闭环 → 48 小时冲刺。

## Files / 文件

- `SKILL.md` — 主流程（workflow）
- `references/response-patterns.md` — 题目、讲解、评分细则、覆盖检查、冲刺包的可复用模板
- `README.md` — 本简介

## Rules / 铁律

- 老师原话、页码、分值为绑定证据；预测永远标注 confirmed / high probability / supplementary / unknown
- 已知试卷结构时逐项对齐（题型、题量、分值、范围、难度、排除章节）
- 每题答案与详解紧跟其后；大必题给可复用步骤 + 得分点
- 用户纠错优先级高于一切后续生成物
