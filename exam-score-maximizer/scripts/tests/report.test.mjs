import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { formatAttemptPasteback, renderHtml, renderMarkdown, validateData } from '../build_study_report.mjs';

const valid = {
  title: '冲刺 <报告>', course: '离散数学', exam_at: '2026-10-31T09:00:00+08:00', generated_at: '2026-10-12T10:00:00+08:00', available_minutes: 60,
  priorities: [{ topic: '集合', band: 'A', weight: 0.8, evidence: 'confirmed', source: 'lecture.pdf p.1' }],
  today_tasks: [{ topic: '闭卷回忆', minutes: 30, done: '正确复述 4/5' }],
  weaknesses: [{ topic: '证明', score: 0.35, cause: '条件遗漏' }],
  errors: [{ question: 'x</script>', cause: '误读', fix: '圈出目标量' }],
  sprint_cards: [{ question: '定义？', answer: '<script>alert(1)</script>', source: '讲义 p.2' }],
  quiz: [{ id: 'q1', question: '1+1?', options: ['1', '2'], correct_index: 1, explanation: '加法结果为 2', source: '讲义 p.3' }]
};

test('validates numeric and timezone constraints', () => {
  assert.equal(validateData(valid).ok, true);
  assert.equal(validateData({ ...valid, available_minutes: Infinity }).ok, false);
  assert.equal(validateData({ ...valid, exam_at: '2026-10-31' }).ok, false);
  assert.equal(validateData({ ...valid, today_tasks: [{ ...valid.today_tasks[0], minutes: 61 }] }).ok, false);
  assert.equal(validateData({ ...valid, weaknesses: [{ ...valid.weaknesses[0], score: 2 }] }).ok, false);
});

test('rejects malformed input and reports missing optional arrays as empty', () => {
  const result = validateData({ title: 'x', course: 'y', exam_at: valid.exam_at, generated_at: valid.generated_at, available_minutes: 1 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.priorities, []);
  assert.equal(validateData(null).ok, false);
  assert.equal(validateData({ ...valid, quiz: [{ ...valid.quiz[0], correct_index: 4 }] }).ok, false);
});

test('renders escaped HTML, safe inline JSON and markdown fallback', () => {
  const html = renderHtml(valid);
  assert.match(html, /<!doctype html>/i);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /\\u003c/);
  assert.match(html, /@media print/);
  assert.match(html, /id="countdown"/);
  assert.match(html, /setInterval\(updateCountdown, 60000\)/);
  assert.match(html, /attempts\.json/);
  assert.match(html, /id="copy-attempts"/);
  assert.match(html, /复制作答记录/);
  assert.match(html, /id="report-nav"/);
  for (const anchor of ['priorities', 'today-tasks', 'weaknesses', 'errors', 'cards', 'quiz']) {
    assert.match(html, new RegExp(`href="#${anchor}"`));
    assert.match(html, new RegExp(`id="${anchor}"`));
  }
  const markdown = renderMarkdown(valid);
  assert.match(markdown, /# 冲刺/);
  assert.match(markdown, /闭卷测验/);
});

test('formats checked attempts as pasteable feedback without exposing answer payloads', () => {
  const text = formatAttemptPasteback([
    { question_id: 'q1', correct: true, guessed: false, reasoning: '能说明公式条件' },
    { question_id: 'q2', correct: false, guessed: false, reasoning: '条件混淆' },
    { question_id: 'q3', correct: true, guessed: true, reasoning: '' }
  ]);
  assert.equal(text, '复测结果：q1 对（能说明公式条件）；q2 错（条件混淆）；q3 猜对');
  assert.equal(formatAttemptPasteback([]), '复测结果：暂无已检查作答');
});

test('warns about personal identifiers in nested fields without revealing values or changing input', () => {
  // Synthetic identifiers only; no real student data is used by these tests.
  for (const profile of [
    { 姓名: '测试同学' },
    { full_name: 'Example Student' },
    { 学号: '2026000001' },
    { studentId: 2026000001 },
    { mobile: 13800138000 }
  ]) {
    const input = { ...valid, profiles: [{ profile }] };
    const before = structuredClone(input);
    const result = validateData(input);
    assert.equal(result.ok, true, 'privacy warnings must not reject valid report data');
    assert.equal(result.warnings?.length, 1, 'emit one non-duplicated privacy warning');
    const warning = result.warnings.join('\n');
    assert.match(warning, /输入含疑似个人标识字段.*请确认已脱敏/);
    assert.doesNotMatch(warning, /测试同学|Example Student|2026000001|13800138000/);
    assert.deepEqual(input, before, 'detection must not silently redact or rewrite data');
  }
  const html = renderHtml({ ...valid, profiles: [{ 姓名: '测试同学', 学号: '2026000001' }], phone: '13800138000' });
  assert.doesNotMatch(html, /测试同学|2026000001|13800138000/, 'unknown personal fields must not be copied into the report payload');
});

test('detects identifiers inside text but not ordinary course names, IDs, dates or empty fields', () => {
  for (const note of ['请联系 13800138000', '联系 +86 138-0013-8000', '学号：2026000001', '姓名：测试同学', '邮箱：student@example.edu.cn', '身份证：11010519491231002X']) {
    assert.equal(validateData({ ...valid, note }).warnings?.length, 1, note);
  }
  const input = { ...valid, name: '', student_id: null, phone: '  ', note: '2024 卷 Q1，192.168.1.1，TCP 序列号 1234567890' };
  assert.deepEqual(validateData(input).warnings, []);
});

test('redact mode replaces email, ID and phone in report payload without changing input', () => {
  const input = {
    ...valid,
    title: '冲刺 student@example.edu.cn',
    priorities: [{ ...valid.priorities[0], source: '身份证 11010519491231002X；电话 13800138000' }]
  };
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'report-redact-'));
  try {
    const inputPath = path.join(root, 'input.json');
    fs.writeFileSync(inputPath, JSON.stringify(input));
    const before = fs.readFileSync(inputPath, 'utf8');
    const script = path.resolve('scripts/build_study_report.mjs');
    const result = spawnSync(process.execPath, [script, '--workspace', root, '--input', 'input.json', '--output', 'redacted.html', '--redact'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /已脱敏\s+3\s+处疑似个人标识字段/);
    const report = fs.readFileSync(path.join(root, 'redacted.html'), 'utf8');
    assert.match(report, /\[已脱敏\]/);
    assert.doesNotMatch(report, /student@example\.edu\.cn|11010519491231002X|13800138000/);
    assert.equal(fs.readFileSync(inputPath, 'utf8'), before, 'redact must not modify the source JSON');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CLI emits a value-free privacy warning once for both HTML and Markdown without blocking output', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'report-privacy-'));
  t.after(() => {
    for (const name of ['input.json', 'report.html', 'report.md']) {
      const file = path.join(root, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(root);
  });
  const input = { ...valid, profiles: [{ 姓名: '测试同学', 学号: '2026000001' }], note: '联系 13800138000' };
  fs.writeFileSync(path.join(root, 'input.json'), JSON.stringify(input));
  const script = path.resolve('scripts/build_study_report.mjs');
  for (const [format, output] of [['html', 'report.html'], ['markdown', 'report.md']]) {
    const result = spawnSync(process.execPath, [script, '--workspace', root, '--input', 'input.json', '--output', output, '--format', format], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /输入含疑似个人标识字段.*请确认已脱敏/);
    assert.equal(result.stderr.trim().split('\n').length, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /测试同学|2026000001|13800138000/);
    assert.ok(fs.existsSync(path.join(root, output)));
  }
});

test('CLI enforces paths, size, overwrite and both formats', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'report-'));
  fs.writeFileSync(path.join(root, 'input.json'), JSON.stringify(valid));
  const script = path.resolve('scripts/build_study_report.mjs');
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  let result = run(['--workspace', root, '--input', 'input.json', '--output', 'report.html']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(root, 'report.html'), 'utf8'), /<!doctype html>/i);
  result = run(['--workspace', root, '--input', 'input.json', '--output', 'report.html']);
  assert.notEqual(result.status, 0);
  result = run(['--workspace', root, '--input', 'input.json', '--output', 'report.html', '--overwrite']);
  assert.equal(result.status, 0, result.stderr);
  result = run(['--workspace', root, '--input', '..\\input.json', '--output', 'x.html']);
  assert.notEqual(result.status, 0);
  result = run(['--workspace', root, '--input', 'input.json', '--output', 'report.md', '--format', 'markdown']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(root, 'report.md'), 'utf8'), /# 冲刺/);
  const outside = path.join(os.tmpdir(), `outside-${Date.now()}.json`);
  fs.writeFileSync(outside, JSON.stringify(valid));
  try {
    fs.symlinkSync(outside, path.join(root, 'escape.json'), 'file');
    result = run(['--workspace', root, '--input', 'escape.json', '--output', 'escape.html']);
    assert.notEqual(result.status, 0);
  } catch (error) {
    // Windows may deny symlink creation without Developer Mode/admin rights;
    // path traversal and outside-workspace checks above remain covered.
    assert.equal(error.code, 'EPERM');
  }
});

