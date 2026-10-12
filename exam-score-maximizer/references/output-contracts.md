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
    "score": 0.35,
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

The state is cumulative; a response or report is an immediate view. On each new
quiz attempt or error correction, update only the affected records, preserve existing
topic/card/question IDs, and keep source evidence available for review.

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
