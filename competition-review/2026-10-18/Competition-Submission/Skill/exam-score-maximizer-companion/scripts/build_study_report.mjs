#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const PRIVACY_WARNING = '输入含疑似个人标识字段，请确认已脱敏；默认仅告警，需显式传入 --redact 才替换报告载荷。';
const REDACTION_LABEL = '[已脱敏]';
const PERSONAL_KEY_PATTERN = /^(?:姓名|名字|真实姓名|name|full[ _-]?name|student[ _-]?name|学号|学籍号|student[ _-]?(?:id|number)|手机号|手机|联系电话|电话|phone|mobile|tel)$/i;
const PHONE_PATTERN = /(?<!\d)(?:\+?86[\s-]?)?1[3-9](?:[\s-]?\d){9}(?!\d)/;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const NATIONAL_ID_PATTERN = /(?<!\d)\d{17}[\dXx](?!\d)/;
const PHONE_REDACTION_PATTERN = /(?<!\d)(?:\+?86[\s-]?)?1[3-9](?:[\s-]?\d){9}(?!\d)/g;
const EMAIL_REDACTION_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const NATIONAL_ID_REDACTION_PATTERN = /(?<!\d)\d{17}[\dXx](?!\d)/g;
const STUDENT_ID_TEXT_PATTERN = /(?:学号|学籍号|student[ _-]?(?:id|number))\s*[:：#]?\s*[A-Za-z0-9-]{4,20}/i;
const NAME_TEXT_PATTERN = /(?:姓名|真实姓名|full[ _-]?name|student[ _-]?name)\s*[:：]?\s*[^,，;；\n]{1,40}/i;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

function hasTimezone(value) {
  return typeof value === 'string' && /(Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function validDate(value) {
  if (!isNonEmptyString(value) || !hasTimezone(value) || !Number.isFinite(Date.parse(value))) return false;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth;
}

function escaped(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inlineJson(value) {
  // A JSON string embedded in a script element must not be able to close it.
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => {
    const code = character.codePointAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}

function arrayOf(value, name, validator, errors) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(`${name} must be an array`);
    return [];
  }
  return value.map((item, index) => validator(item, `${name}[${index}]`, errors)).filter(Boolean);
}

function hasSensitiveValue(value) {
  if (typeof value === 'string') {
    return PHONE_PATTERN.test(value) || EMAIL_PATTERN.test(value) || NATIONAL_ID_PATTERN.test(value) || STUDENT_ID_TEXT_PATTERN.test(value) || NAME_TEXT_PATTERN.test(value);
  }
  if (typeof value === 'number') return Number.isInteger(value) && /^1[3-9]\d{9}$/.test(String(value));
  return value !== null && value !== undefined;
}

function hasKeySensitiveValue(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return value !== null && value !== undefined;
}

function containsSensitiveIdentifiers(input) {
  const visited = new WeakSet();
  const visit = value => {
    if (typeof value === 'string') return hasSensitiveValue(value);
    if (value === null || typeof value !== 'object') return false;
    if (visited.has(value)) return false;
    visited.add(value);
    if (Array.isArray(value)) return value.some(visit);
    return Object.entries(value).some(([key, child]) => {
      if (PERSONAL_KEY_PATTERN.test(key) && hasKeySensitiveValue(child)) return true;
      return visit(child);
    });
  };
  return visit(input);
}

function redactString(value) {
  let count = 0;
  const replace = (text, pattern) => text.replace(pattern, () => {
    count += 1;
    return REDACTION_LABEL;
  });
  let redacted = replace(value, PHONE_REDACTION_PATTERN);
  redacted = replace(redacted, EMAIL_REDACTION_PATTERN);
  redacted = replace(redacted, NATIONAL_ID_REDACTION_PATTERN);
  return { value: redacted, count };
}

function redactPayload(input) {
  const visited = new WeakMap();
  const visit = value => {
    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'number') {
      if (Number.isInteger(value) && /^1[3-9]\d{9}$/.test(String(value))) return { value: REDACTION_LABEL, count: 1 };
      return { value, count: 0 };
    }
    if (value === null || typeof value !== 'object') return { value, count: 0 };
    if (visited.has(value)) return visited.get(value);
    const output = Array.isArray(value) ? [] : {};
    const result = { value: output, count: 0 };
    visited.set(value, result);
    for (const [key, child] of Object.entries(value)) {
      if (PERSONAL_KEY_PATTERN.test(key) && hasKeySensitiveValue(child)) {
        output[key] = REDACTION_LABEL;
        result.count += 1;
        continue;
      }
      const redacted = visit(child);
      output[key] = redacted.value;
      result.count += redacted.count;
    }
    return result;
  };
  return visit(input);
}

function validateData(input) {
  const errors = [];
  const warnings = containsSensitiveIdentifiers(input) ? [PRIVACY_WARNING] : [];
  if (!isObject(input)) return { ok: false, errors: ['input must be a JSON object'], warnings };

  for (const field of ['title', 'course']) {
    if (!isNonEmptyString(input[field])) errors.push(`${field} must be a non-empty string`);
  }
  for (const field of ['exam_at', 'generated_at']) {
    if (!validDate(input[field])) errors.push(`${field} must be an ISO date with timezone`);
  }
  if (!isFiniteNumber(input.available_minutes) || input.available_minutes < 0) {
    errors.push('available_minutes must be a finite number >= 0');
  }

  const priorities = arrayOf(input.priorities, 'priorities', (item, label, list) => {
    if (!isObject(item)) { list.push(`${label} must be an object`); return null; }
    for (const field of ['topic', 'band', 'evidence', 'source']) {
      if (!isNonEmptyString(item[field])) list.push(`${label}.${field} must be a non-empty string`);
    }
    if (!isFiniteNumber(item.weight) || item.weight < 0 || item.weight > 1) list.push(`${label}.weight must be between 0 and 1`);
    return item;
  }, errors);

  const todayTasks = arrayOf(input.today_tasks, 'today_tasks', (item, label, list) => {
    if (!isObject(item)) { list.push(`${label} must be an object`); return null; }
    if (!isNonEmptyString(item.topic)) list.push(`${label}.topic must be a non-empty string`);
    if (!isFiniteNumber(item.minutes) || item.minutes < 0) list.push(`${label}.minutes must be a finite number >= 0`);
    if (!isNonEmptyString(item.done)) list.push(`${label}.done must be a non-empty string`);
    return item;
  }, errors);
  if (isFiniteNumber(input.available_minutes) && todayTasks.every(task => isFiniteNumber(task?.minutes))) {
    const total = todayTasks.reduce((sum, task) => sum + task.minutes, 0);
    if (total > input.available_minutes) errors.push('today_tasks minutes exceed available_minutes');
  }

  const weaknesses = arrayOf(input.weaknesses, 'weaknesses', (item, label, list) => {
    if (!isObject(item)) { list.push(`${label} must be an object`); return null; }
    if (!isNonEmptyString(item.topic)) list.push(`${label}.topic must be a non-empty string`);
    if (!isFiniteNumber(item.score) || item.score < 0 || item.score > 1) list.push(`${label}.score must be between 0 and 1`);
    if (!isNonEmptyString(item.cause)) list.push(`${label}.cause must be a non-empty string`);
    return item;
  }, errors);
  const reportErrors = arrayOf(input.errors, 'errors', (item, label, list) => {
    if (!isObject(item)) { list.push(`${label} must be an object`); return null; }
    for (const field of ['question', 'cause', 'fix']) if (!isNonEmptyString(item[field])) list.push(`${label}.${field} must be a non-empty string`);
    return item;
  }, errors);
  const cards = arrayOf(input.sprint_cards, 'sprint_cards', (item, label, list) => {
    if (!isObject(item)) { list.push(`${label} must be an object`); return null; }
    for (const field of ['question', 'answer', 'source']) if (!isNonEmptyString(item[field])) list.push(`${label}.${field} must be a non-empty string`);
    return item;
  }, errors);
  const quiz = arrayOf(input.quiz, 'quiz', (item, label, list) => {
    if (!isObject(item)) { list.push(`${label} must be an object`); return null; }
    for (const field of ['id', 'question', 'explanation', 'source']) if (!isNonEmptyString(item[field])) list.push(`${label}.${field} must be a non-empty string`);
    if (!Array.isArray(item.options) || item.options.length < 2 || item.options.some(option => !isNonEmptyString(option))) list.push(`${label}.options must contain at least two non-empty strings`);
    if (!Number.isInteger(item.correct_index) || item.correct_index < 0 || !Array.isArray(item.options) || item.correct_index >= item.options.length) list.push(`${label}.correct_index must point to an option`);
    return item;
  }, errors);

  if (errors.length) return { ok: false, errors, warnings };
  const value = {
    title: input.title,
    course: input.course,
    exam_at: input.exam_at,
    generated_at: input.generated_at,
    available_minutes: input.available_minutes,
    priorities,
    today_tasks: todayTasks,
    weaknesses,
    errors: reportErrors,
    sprint_cards: cards,
    quiz
  };
  return { ok: true, errors: [], warnings, value };
}

function checkedData(input) {
  const result = validateData(input);
  if (!result.ok) throw new TypeError(result.errors.join('; '));
  return result.value;
}

const CSS = `
:root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f4f7fb; }
* { box-sizing: border-box; }
body { margin: 0; overflow-x: hidden; background: #f4f7fb; }
main { width: min(100% - 24px, 980px); margin: 0 auto; padding: 20px 0 48px; }
header, section { background: #fff; border: 1px solid #dce4f0; border-radius: 14px; padding: 18px; margin: 14px 0; box-shadow: 0 4px 16px rgb(37 57 90 / 7%); }
h1, h2, h3 { line-height: 1.2; margin: 0 0 10px; } h1 { font-size: clamp(1.45rem, 4vw, 2.2rem); } h2 { font-size: 1.25rem; }
.meta, .muted { color: #5c6980; font-size: .92rem; } .meta { display: flex; flex-wrap: wrap; gap: 10px 22px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 12px; }
.item { border: 1px solid #e1e7f0; border-radius: 10px; padding: 12px; min-width: 0; } .item p { overflow-wrap: anywhere; }
table { width: 100%; border-collapse: collapse; display: block; overflow-x: auto; } th, td { text-align: left; border-bottom: 1px solid #e4eaf2; padding: 8px; vertical-align: top; }
progress { width: 100%; height: 9px; } button, select { border: 1px solid #8ba3c5; border-radius: 7px; background: #f8fbff; padding: 7px 10px; color: #172033; cursor: pointer; }
button:hover { background: #e9f2ff; } .quiz-options { display: grid; gap: 7px; margin: 10px 0; } .quiz-result { margin-top: 8px; font-weight: 600; }
.report-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; background: #eef5ff; border: 1px solid #cbdcf4; border-radius: 10px; padding: 10px 12px; margin: 14px 0; }
.report-nav a { color: #145da0; border-radius: 6px; padding: 4px 7px; text-decoration: none; } .report-nav a:hover, .report-nav a:focus-visible { background: #dcecff; text-decoration: underline; }
section[id] { scroll-margin-top: 12px; }
details { border-top: 1px dashed #cbd6e6; padding-top: 8px; margin-top: 8px; } summary { cursor: pointer; font-weight: 600; } .source { color: #52647d; font-size: .86rem; }
@media print { body { background: #fff; } main { width: 100%; padding: 0; } header, section { box-shadow: none; break-inside: avoid; } details > * { display: block !important; } details > summary { list-style: none; } details > summary::-webkit-details-marker { display: none; } button, select { display: none; } }
`;

function renderPriorities(items) {
  if (!items.length) return '<p class="muted">暂无已确认的重点。</p>';
  return `<div class="grid">${items.map(item => `<article class="item"><h3>${escaped(item.topic)}</h3><p><strong>等级：</strong>${escaped(item.band)}　<strong>权重：</strong>${Math.round(item.weight * 100)}%</p><p>${escaped(item.evidence)}</p><p class="source">来源：${escaped(item.source)}</p></article>`).join('')}</div>`;
}

function renderTasks(items) {
  if (!items.length) return '<p class="muted">暂无今日任务，请先生成学习计划。</p>';
  return `<div class="grid">${items.map(item => `<article class="item"><h3>${escaped(item.topic)}</h3><p><strong>${escaped(item.minutes)} 分钟</strong></p><p>${escaped(item.done)}</p></article>`).join('')}</div>`;
}

function renderWeaknesses(items) {
  if (!items.length) return '<p class="muted">暂无薄弱点记录。</p>';
  return `<div class="grid">${items.map(item => `<article class="item"><h3>${escaped(item.topic)}</h3><p>掌握度：${Math.round(item.score * 100)}%</p><progress max="1" value="${item.score}"></progress><p class="muted">原因：${escaped(item.cause)}</p></article>`).join('')}</div>`;
}

function renderErrors(items) {
  if (!items.length) return '<p class="muted">暂无错题记录。</p>';
  return `<div class="grid">${items.map(item => `<article class="item"><p><strong>题目：</strong>${escaped(item.question)}</p><p><strong>原因：</strong>${escaped(item.cause)}</p><p><strong>修复：</strong>${escaped(item.fix)}</p></article>`).join('')}</div>`;
}

function renderCards(items) {
  if (!items.length) return '<p class="muted">暂无冲刺卡片。</p>';
  return `<div class="grid">${items.map(item => `<details class="item"><summary>${escaped(item.question)}</summary><p>${escaped(item.answer)}</p><p class="source">来源：${escaped(item.source)}</p></details>`).join('')}</div>`;
}

function renderQuiz(items) {
  if (!items.length) return '<p class="muted">暂无测验题。</p>';
  return items.map((item, index) => `<article class="item quiz" data-quiz-index="${index}"><h3>${escaped(item.question)}</h3><div class="quiz-options">${item.options.map((option, optionIndex) => `<label><input type="radio" name="quiz-${index}" value="${optionIndex}"> ${escaped(option)}</label>`).join('')}</div><label>作答理由（可选）：<input class="justification" type="text" maxlength="500" style="width:100%;margin-top:5px;padding:7px"></label><p><button type="button" class="check-answer">检查答案</button> <select class="action"><option value="retest">复测</option><option value="revamp">变式重练</option><option value="carryover">带入后续</option><option value="graduate">我能解释，标记掌握</option></select></p><p class="quiz-result" aria-live="polite"></p><p class="muted">来源：${escaped(item.source)}</p></article>`).join('');
}

function formatAttemptPasteback(attempts) {
  const parts = attempts.filter(Boolean).map(attempt => {
    const questionId = String(attempt.question_id ?? '').trim();
    const label = attempt.correct ? (attempt.guessed ? '猜对' : '对') : '错';
    const reasoning = String(attempt.reasoning ?? '').trim().replace(/\s+/g, ' ');
    return `${questionId} ${label}${reasoning ? `（${reasoning}）` : ''}`.trim();
  });
  return parts.length ? `复测结果：${parts.join('；')}` : '复测结果：暂无已检查作答';
}

function renderHtml(input) {
  const data = checkedData(input);
  const totalMinutes = data.today_tasks.reduce((sum, task) => sum + task.minutes, 0);
  const json = inlineJson(data);
  const quizActions = data.quiz.length ? '<p><button type="button" id="export-attempts">导出本次作答 attempts.json</button> <button type="button" id="copy-attempts">复制作答记录</button> <span id="export-status" class="muted" aria-live="polite"></span></p>' : '';
  const reportNav = '<nav class="report-nav" id="report-nav" aria-label="报告目录"><strong>目录：</strong><a href="#priorities">考点</a><a href="#today-tasks">今日任务</a><a href="#weaknesses">薄弱点</a><a href="#errors">错题</a><a href="#cards">冲刺卡片</a><a href="#quiz">闭卷测验</a></nav>';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaped(data.title)}</title><style>${CSS}</style></head><body><main><header><h1>${escaped(data.title)}</h1><p class="meta"><span>课程：${escaped(data.course)}</span><span>考试：${escaped(data.exam_at)}</span><span>距离考试：<span id="countdown">计算中…</span></span><span>生成：${escaped(data.generated_at)}</span><span>可用时间：${escaped(data.available_minutes)} 分钟</span></p><p class="muted">今日任务已分配 ${escaped(totalMinutes)} / ${escaped(data.available_minutes)} 分钟。答案默认折叠，适合先回忆再核对。</p></header>${reportNav}<section id="priorities"><h2>高频考点与分值权重</h2>${renderPriorities(data.priorities)}</section><section id="today-tasks"><h2>今日复习任务</h2>${renderTasks(data.today_tasks)}</section><section id="weaknesses"><h2>薄弱知识点</h2>${renderWeaknesses(data.weaknesses)}</section><section id="errors"><h2>错题与修复</h2>${renderErrors(data.errors)}</section><section id="cards"><h2>冲刺卡片</h2>${renderCards(data.sprint_cards)}</section><section id="quiz"><h2>闭卷测验</h2>${renderQuiz(data.quiz)}${quizActions}</section></main><script type="application/json" id="report-data">${json}</script><script>(() => { const data = JSON.parse(document.getElementById('report-data').textContent); const attempts = []; const status = document.getElementById('export-status'); const countdown = document.getElementById('countdown'); const updateCountdown = () => { if (!countdown) return; const remaining = Date.parse(data.exam_at) - Date.now(); if (remaining <= 0) { countdown.textContent = '已到期'; return; } const totalMinutes = Math.floor(remaining / 60000); const days = Math.floor(totalMinutes / 1440); const hours = Math.floor((totalMinutes % 1440) / 60); const minutes = totalMinutes % 60; countdown.textContent = (days ? days + '天 ' : '') + hours + '小时 ' + minutes + '分钟'; }; const collectAttempts = () => Array.from(document.querySelectorAll('.quiz')).flatMap((card, index) => { const selected = card.querySelector('input:checked'); if (!selected || card.dataset.checked !== 'true') return []; const item = data.quiz[index]; const correct = card.dataset.correct === 'true'; const reasoning = card.querySelector('.justification').value.trim(); const requested = card.querySelector('.action').value; const adequate = reasoning.length >= 10; const action = requested === 'graduate' && correct && adequate ? 'graduate' : (requested === 'graduate' ? (correct ? 'retest' : 'revamp') : requested); return [{ question_id: item.id, selected_index: Number(selected.value), correct, reasoning, action, guessed: correct && !adequate }]; }); const fallbackCopy = text => { const textarea = document.createElement('textarea'); textarea.value = text; textarea.setAttribute('readonly', ''); textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select(); let copied = false; try { copied = document.execCommand('copy'); } catch {} textarea.remove(); return copied; }; updateCountdown(); setInterval(updateCountdown, 60000); document.querySelectorAll('.quiz').forEach((card, index) => { const check = card.querySelector('.check-answer'); const result = card.querySelector('.quiz-result'); card.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', () => { card.dataset.checked = 'false'; result.textContent = ''; })); check?.addEventListener('click', () => { const selected = card.querySelector('input:checked'); if (!selected) { result.textContent = '请先选择答案。'; return; } const selectedIndex = Number(selected.value); const item = data.quiz[index]; const correct = selectedIndex === item.correct_index; result.textContent = (correct ? '回答正确。' : '回答错误。') + ' ' + item.explanation; card.dataset.correct = String(correct); card.dataset.checked = 'true'; }); }); document.getElementById('export-attempts')?.addEventListener('click', () => { const records = collectAttempts(); if (!records.length) { if (status) status.textContent = '请先选择并检查至少一道题。'; return; } attempts.length = 0; records.forEach(({ guessed, ...record }) => attempts.push(record)); const blob = new Blob([JSON.stringify({ attempts }, null, 2)], {type:'application/json'}); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'attempts.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); if (status) status.textContent = '已生成本地下载，不会上传或保存到外部服务。'; }); document.getElementById('copy-attempts')?.addEventListener('click', () => { const records = collectAttempts(); if (!records.length) { if (status) status.textContent = '请先选择并检查至少一道题。'; return; } const text = records.map(({ question_id, correct, guessed, reasoning }) => { const label = correct ? (guessed ? '猜对' : '对') : '错'; const cleanReasoning = String(reasoning || '').trim().replace(/\\s+/g, ' '); return String(question_id).trim() + ' ' + label + (cleanReasoning ? '（' + cleanReasoning + '）' : ''); }).join('；'); const pasteback = '复测结果：' + text; const done = () => { if (status) status.textContent = '已复制，可直接粘贴回对话。'; }; if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(pasteback).then(done).catch(() => { if (!fallbackCopy(pasteback) && status) status.textContent = '自动复制失败，请手动复制：' + pasteback; else done(); }); } else if (!fallbackCopy(pasteback) && status) { status.textContent = '自动复制失败，请手动复制：' + pasteback; } else { done(); } }); })();</script></body></html>`;
}

function renderMarkdown(input) {
  const data = checkedData(input);
  const lines = [`# ${data.title}`, '', `- 课程：${data.course}`, `- 考试时间：${data.exam_at}`, `- 生成时间：${data.generated_at}`, `- 可用学习时间：${data.available_minutes} 分钟`, ''];
  const section = (title, body) => { lines.push(`## ${title}`, '', ...(body.length ? body : ['暂无数据']), ''); };
  section('高频考点与分值权重', data.priorities.map(item => `- **${item.topic}**（${item.band}，${Math.round(item.weight * 100)}%）：${item.evidence}；来源：${item.source}`));
  section('今日复习任务', data.today_tasks.map(item => `- [ ] ${item.topic}（${item.minutes} 分钟）：${item.done}`));
  section('薄弱知识点', data.weaknesses.map(item => `- ${item.topic}：掌握度 ${Math.round(item.score * 100)}%，原因：${item.cause}`));
  section('错题与修复', data.errors.map(item => `- 题目：${item.question}\n  - 原因：${item.cause}\n  - 修复：${item.fix}`));
  section('冲刺卡片', data.sprint_cards.map(item => `- **问：** ${item.question}\n  **答：** ${item.answer}\n  来源：${item.source}`));
  section('闭卷测验', data.quiz.map(item => `- ${item.question}\n  - 选项：${item.options.join(' / ')}\n  - 解析：${item.explanation}\n  - 来源：${item.source}`));
  return lines.join('\n').trimEnd() + '\n';
}

function pathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function rejectTraversal(relative, label) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || path.win32.isAbsolute(relative)) throw new Error(`${label} must be a relative path`);
  const parts = relative.split(/[\\/]+/);
  if (parts.includes('..')) throw new Error(`${label} contains path traversal`);
}

function resolveWorkspacePath(root, relative, label, extension) {
  rejectTraversal(relative, label);
  if (path.extname(relative).toLowerCase() !== extension) throw new Error(`${label} must use ${extension} extension`);
  const candidate = path.resolve(root, relative);
  if (!pathInside(root, candidate)) throw new Error(`${label} escapes workspace`);
  return candidate;
}

function realpathIfExists(candidate) {
  try { return fs.realpathSync(candidate); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function checkCliPaths(workspaceArg, inputArg, outputArg, format, overwrite) {
  if (!workspaceArg || !inputArg || !outputArg) throw new Error('--workspace, --input and --output are required');
  const root = fs.realpathSync(workspaceArg);
  if (!fs.statSync(root).isDirectory()) throw new Error('workspace must be a directory');
  const expectedExtension = format === 'markdown' ? '.md' : '.html';
  const inputPath = resolveWorkspacePath(root, inputArg, '--input', '.json');
  const outputPath = resolveWorkspacePath(root, outputArg, '--output', expectedExtension);
  if (path.resolve(inputPath) === path.resolve(outputPath)) throw new Error('input and output must differ');
  const inputReal = realpathIfExists(inputPath);
  if (!inputReal || !pathInside(root, inputReal)) throw new Error('input must exist inside workspace');
  const parent = realpathIfExists(path.dirname(outputPath));
  if (!parent || !pathInside(root, parent)) throw new Error('output parent must exist inside workspace');
  const outputReal = realpathIfExists(outputPath);
  if (outputReal && !pathInside(root, outputReal)) throw new Error('output symlink escapes workspace');
  if (outputReal && !overwrite) throw new Error('output exists; pass --overwrite to replace it');
  const inputStat = fs.statSync(inputReal);
  if (!inputStat.isFile()) throw new Error('input must be a regular file');
  if (inputStat.size > MAX_INPUT_BYTES) throw new Error('input exceeds 2 MiB limit');
  return { root, inputPath: inputReal, outputPath };
}

function parseArgs(argv) {
  const args = { format: 'html', overwrite: false, redact: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--overwrite') { args.overwrite = true; continue; }
    if (arg === '--redact') { args.redact = true; continue; }
    if (arg.startsWith('--')) { const key = arg.slice(2); if (!['workspace', 'input', 'output', 'format'].includes(key)) throw new Error(`unknown option ${arg}`); args[key] = argv[++i]; continue; }
    throw new Error(`unexpected argument ${arg}`);
  }
  if (!['html', 'markdown'].includes(args.format)) throw new Error('--format must be html or markdown');
  return args;
}

function cli(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    const paths = checkCliPaths(args.workspace, args.input, args.output, args.format, args.overwrite);
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(paths.inputPath, 'utf8')); } catch (error) { throw new Error(`invalid JSON: ${error.message}`); }
    const result = validateData(parsed);
    if (result.warnings.length) process.stderr.write(`${result.warnings.join('\n')}\n`);
    if (!result.ok) throw new Error(result.errors.join('; '));
    let reportInput = result.value;
    if (args.redact && result.warnings.length) {
      const redacted = redactPayload(result.value);
      reportInput = redacted.value;
      if (redacted.count > 0) process.stderr.write(`已脱敏 ${redacted.count} 处疑似个人标识字段\n`);
    }
    const output = args.format === 'markdown' ? renderMarkdown(reportInput) : renderHtml(reportInput);
    fs.writeFileSync(paths.outputPath, output, { encoding: 'utf8', flag: 'w' });
    process.stdout.write(`Wrote ${path.relative(paths.root, paths.outputPath)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    return 1;
  }
}

export { formatAttemptPasteback, validateData, renderHtml, renderMarkdown, cli };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = cli();

