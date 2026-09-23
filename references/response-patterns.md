# Response patterns

Reusable templates for generating questions, explanations, scoring rubrics, coverage checks, and the 48-hour sprint pack. Fill the `[slots]`; delete what the current course doesn't need. Keep labels consistent across every artifact.

## Confidence labels (always attach one)

| Label | Meaning | Use when |
|---|---|---|
| **confirmed** | Teacher said it or the spec states it | Wording, page, score, count straight from source |
| **high probability** | Repeated ≥3× or strongly implied | Major-question candidate, emphasized topic |
| **supplementary** | Single weak signal | Optional review, low priority |
| **unknown** | No evidence | Say so; never invent |

## Question templates

- **Objective** — `[stem]` → A `[distractor]` · B `[distractor]` · C `[correct]` · D `[distractor]`. Answer + tested point + one line on why each distractor fails + the trap.
- **Calculation** — Given `[knowns]`. Find `[target]`. Formula `[name + applicability condition]` → substitution → steps → `[result + unit]` → sanity check → common error.
- **Drawing / waveform** — axes `[labels + scale]` → anchor points → transformation order → final labels → self-check list.
- **Short answer** — definition/opening → numbered scoring points (one = one mark) → closing relation → one-line mnemonic.
- **Essay / material** — tested theory → each material clue → layered argument → practical significance → conclusion. Never paste theory without connecting every clue.
- **Program / configuration** — task decomposition → complete copyable code/commands → key-line comments → expected result or verify command → common failure points.

## Explanation structure

Always: answer → why correct → why the wrong alternative fails (when useful). On "这一步怎么来的", expand every algebraic / logical / diagrammatic / command transition in full.

## Scoring rubric

Per question: `[points] × [what earns each point]`. State the reusable procedure once, then mark which step carries each point. For essays, split content points from expression points.

## Coverage check (run before each new paper)

1. Copy the confirmed skeleton + current exclusions.
2. Diff the coverage matrix against previous sets.
3. Retain confirmed high-weight topics; vary only surface data / wording / combination.
4. Add uncovered teacher-marked points.
5. Verify question count + total score.
6. Verify every question has an answer + knowledge point + explanation.

## Learning check (0–3)

0 can't start · 1 recognize but can't reproduce · 2 completes with prompts · 3 solves + explains independently. Prioritize 0–1, retest with a changed surface question.

## 48-hour sprint pack

Compress, don't expand: confirmed major-question frames + scoring points, formula sheet with applicability conditions, drawing/calculation procedures, code skeletons, wrong-answer causes with corrected examples, one final structure-matched paper. End with three lists: **must memorize** · **must be able to solve** · **easy points not to lose**.
