# Output contracts

Use these compact contracts to keep planning, practice, feedback, and reports composable.
Add fields only when needed; preserve required fields when passing data between modes.

## Evidence item

```json
{
  "id": "unit-2-definition-03",
  "text": "Define ...",
  "source": {"file": "lecture.pdf", "location": "p. 14", "quote": "..."},
  "status": "confirmed",
  "syllabus_unit": "Unit 2",
  "question_type": "theory",
  "marks": 4,
  "difficulty": "easy"
}
```

Allowed `status`: `confirmed`, `high probability`, `supplementary`, `unknown`, or
`out-of-syllabus`. A predicted item must keep its source as `null` and explain why it
was inferred.

## Study plan

```json
{
  "course": "Course name",
  "exam_at": "2026-10-31T09:00:00+08:00",
  "available_minutes": 240,
  "mode": "sprint",
  "priority_bands": [{"band": "A", "items": ["unit-2-definition-03"]}],
  "blocks": [{
    "id": "block-01",
    "topic": "Unit 2 definitions",
    "activity": "closed-book recall, then check against source",
    "minutes": 25,
    "done_criterion": "reproduce 4/5 definitions with key terms",
    "source_ids": ["unit-2-definition-03"],
    "next_review": "2026-10-12"
  }]
}
```

## Flashcard

```json
{
  "id": "card-001",
  "question": "What is ...?",
  "answer": "...",
  "source_ids": ["unit-2-definition-03"],
  "difficulty": "easy",
  "confidence": "confirmed",
  "next_review": "2026-10-12"
}
```

One card tests one atom. Do not combine unrelated facts into a single card.

## Quiz question and attempt

```json
{
  "id": "q-001",
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correct_index": 1,
  "explanation": "...",
  "source_ids": ["unit-2-definition-03"],
  "difficulty": "medium"
}
```

```json
{
  "question_id": "q-001",
  "selected_index": 2,
  "correct": false,
  "reasoning": "I confused ...",
  "error_cause": "condition confusion",
  "action": "revamp"
}
```

Allowed `action`: `graduate`, `retest`, `revamp`, or `carryover`.

## Attempt paste-back

HTML 报告的“复制作答记录”生成一行可直接粘贴回对话的文本，例如：

```text
复测结果：q1 对（能说明公式条件）；q2 错（条件混淆）；q3 猜对
```

解析规则：题号沿用 quiz 的 `id`；“对”表示答对且给出可核验理由，“猜对”表示答对但理由缺失或不足，“错”进入 `revamp`，“跳过/未作答”进入 `carryover`；括号内文字是用户提供的错因或理由，不当作模型已核验的事实。缺少题号、题号不存在或状态含糊时先追问，不直接写回掌握度。

闪卡回流使用同一行结构：

```text
闪卡结果：card-002 对；card-005 错（未说明错因）；card-007 猜对
```

题号沿用 Flashcard 契约的 `id`；“对”映射为 `graduate` 候选，“猜对”映射为 `retest`，“错”进入 `revamp`。未说明错因时不得推断并填充 `error_log.cause`，应标记为待用户确认；缺少题号、题号不存在或状态含糊时先追问。

## Study state

Use a workspace-local `study-state.json` to carry exam evidence and feedback across
sessions. The model may read and write this file only inside the authorized workspace;
it must not be uploaded or sent to external services. Reuse the IDs from the evidence,
flashcard, quiz-question, and quiz-attempt contracts instead of inventing a second ID
format.

```json
{
  "course": "Course name",
  "exam_at": "2026-10-31T09:00:00+08:00",
  "updated_at": "2026-10-12T10:00:00+08:00",
  "exam_map_snapshot": [{
    "topic": "Unit 2",
    "band": "A",
    "status": "confirmed",
    "source_ids": ["unit-2-definition-03"]
  }],
  "mastery": [{
    "topic_id": "unit-2-definition-03",
    "score": 3,
    "last_action": "revamp",
    "updated_at": "2026-10-12T10:00:00+08:00"
  }],
  "error_log": [{
    "question_id": "q-001",
    "cause": "condition confusion",
    "fix": "underline target quantity",
    "at": "2026-10-12T10:00:00+08:00"
  }],
  "review_queue": [{
    "card_id": "card-001",
    "next_review": "2026-10-15"
  }]
}
```

`mastery.score` uses one scale everywhere: `0` 不会，`1` 需讲解后能做，`2` 提示后能做，`3` 独立能做；答错或待修复可记录 `0`–`0.5`。`topic_id`、`score`、`last_action` 和 `updated_at` 是必填字段；`last_action` 只能取 `graduate`、`retest`、`revamp` 或 `carryover`。不要把报告中的 `weaknesses[].score`（0–1 掌握度展示值）与状态中的 mastery 刻度混用。

状态是累积的；回答或报告只是即时视图。每次覆写 `study-state.json` 前，先将当前文件复制为工作区内的 `study-state.backup.json`，仅保留最近一份；发现状态被误更新时以 backup 为准回滚并重放有效记录。每次新的测验作答或错题修复只更新受影响记录，保留已有 topic/card/question ID 和来源证据。

### 状态写入边界（Stage6 隔离修订）

- 只续用当前授权工作区的状态。旧实验、其他课程或工作区的状态即使可访问或附为参考，也不是当前档案，不自行读取、兜底或合并；真正的数据迁移须另获明确授权和核对。用户未授权写入或指定只读时，不创建、覆盖或备份状态，也不写其他配置或个人记忆。
- 用户明确指定种子初始化时，必须先真实读取本轮指定、位于当前工作区的种子文件并成功解析；缺失、读取失败或无效时停止初始化和状态写入，不以空对象、空数组、旧状态或自造记录替代。未指定种子的正常首次使用仍可按原流程建档，不强制所有用户提供种子。初始化保留种子的全部 ID、原始来源、掌握度刻度、错题与复习队列；仅初始化且没有新作答时，不改已有记录或增加推测事实，用户另有更严格复制要求时遵守。讲解或请求答案不算学生提交，不据此更新掌握度。
- 写入前检查候选对象，任何层级均不保存人格开关、偏好、情绪或关系字段，包括 `companion`、`companion.state`、`persona`、`hermione` 等变体；不要以关闭值或调试备注为例外，也不另建此类文件。已有档案含此类字段或越界来源时，保留原件、停止写入并报告，不擅自删除后重写。通过检查后，已有文件仍先按原契约备份；首次创建不虚构备份。写入后实际回读、解析并核对本轮允许的变更以及未受影响记录；失败即停止后续写入，不用模型自述代替工具回执。普通交付如实说明保存结果，严格 JSON/指定 schema 不加尾注或状态字段。

## HTML report input

```json
{
  "title": "Course exam sprint",
  "course": "Course name",
  "exam_at": "2026-10-31T09:00:00+08:00",
  "generated_at": "2026-10-11T12:00:00+08:00",
  "available_minutes": 180,
  "priorities": [{
    "topic": "Unit 2",
    "band": "A",
    "weight": 0.24,
    "evidence": "confirmed",
    "source": "lecture.pdf p.14"
  }],
  "today_tasks": [{
    "topic": "Unit 2 definitions",
    "minutes": 25,
    "done": "recall 4/5 without notes"
  }],
  "weaknesses": [{"topic": "Unit 3 calculations", "score": 0.35, "cause": "unit error"}],
  "errors": [{"question": "...", "cause": "misread", "fix": "underline target quantity"}],
  "sprint_cards": [{"question": "...", "answer": "...", "source": "lecture.pdf p.14"}]
}
```

The report builder treats missing optional arrays as empty. It escapes user content,
rejects malformed JSON, and never fetches URLs.
