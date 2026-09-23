---
name: exam-prep-workflow
description: Build an exam-focused study system from teacher recordings, marked-up screenshots, syllabi, textbooks, exercises, past papers, and user corrections. Use when the user starts a new course or asks to identify exam priorities, infer likely question types or major questions, reconstruct a teacher-described paper, organize knowledge points, create structure-matched mock exams with answers and detailed explanations, diagnose weak areas, make a question bank or practice website, or prepare a final 48-hour review. Preserve the user's preferred workflow across technical, calculation-heavy, theory, political, language, and configuration-based courses.
---

# Exam Prep Workflow

Turn scattered course materials into an evidence-traceable exam map, then into practice, feedback, and a final sprint pack. Optimize for scoring on the actual exam, especially when the learner starts with a weak foundation.

## Operating principles

- Treat the teacher's explicit wording, recordings, red annotations, stated page numbers, question types, counts, and scores as binding unless sources conflict.
- Never convert a prediction into a certainty. Label content as **confirmed**, **high probability**, **supplementary**, or **unknown**.
- Match the real paper's structure exactly when it is known: question types, counts, scores, chapter scope, difficulty mix, and excluded chapters.
- Default to placing the answer and detailed explanation immediately after each question. Produce a separate closed-book paper and answer booklet only when requested.
- Explain from a beginner's perspective without omitting scoring steps. For every major question, expose the reusable solving procedure and scoring points.
- Preserve user corrections as higher-priority constraints for all later sets. Do not silently reintroduce excluded chapters, rejected mappings, or wrong formats.
- Prefer complete, directly usable outputs over outlines: full papers, full answers, complete commands/code, complete drawing steps, or a working practice artifact.
- Continue useful work without repeatedly asking broad questions. When information is missing, state assumptions, create the best provisional version, and list only the missing evidence that would materially change it.

## Phase 1: Reconnaissance and source control

Inventory all supplied sources before summarizing:

1. Teacher recording, transcript, oral emphasis, or direct correction
2. Official paper specification, question-type table, scope, score distribution, and exam duration
3. Teacher-marked screenshots, red text, circled pages, slides, and review outline
4. Past papers, reconstructed papers, sample papers, and repeated classroom questions
5. Assigned exercises, experiments, programs, diagrams, and homework
6. Textbook and general subject knowledge

Use the higher source to resolve conflicts. Keep uncertain OCR separate from verified wording. If a page, symbol, formula, or red annotation is illegible, identify the precise uncertainty instead of inventing content.

Create a short evidence ledger:

| Item | Source | Exact signal | Status | Effect on exam |
|---|---|---|---|---|
| Topic/question | Recording/page/image | Teacher wording or visible mark | Confirmed/high/supplementary/unknown | Type, score, or priority |

## Phase 2: Build the exam map

Extract the paper skeleton first. Record:

- question types, counts, score per question, and total score;
- included and excluded chapters;
- known major questions, calculations, drawings, programs, essays, and material questions;
- allowed variants and likely combinations;
- teacher-specific answer wording or command/code conventions.

Then build a coverage matrix:

| Knowledge unit | Likely type | Evidence | Probability | Required response | Covered in set |
|---|---|---|---|---|---|

Split chapters into minimum testable units such as one definition, formula, waveform, command group, proof step, argument frame, or comparison. Use an exam-oriented 80/20 rule: repeated teacher emphasis and items appearing at least three times in available past material receive top priority; single weak signals remain supplementary.

## Phase 3: Detect major questions

Identify major-question candidates from explicit phrases such as “大题”, “必考”, “会考材料题”, “要会画/算/写程序”, repeated page ranges, long classroom explanations, worked examples, and high-score experimental or configuration tasks.

For each candidate, provide:

- predicted question form;
- evidence and confidence label;
- standard answer or complete solution;
- scoring-point decomposition;
- common variants and traps;
- a short memorization frame or solving algorithm.

Do not decide that visually prominent text alone guarantees a major question. Cross-check it against the paper structure and teacher language.

## Phase 4: Produce the core study pack

Default delivery order:

1. **Exam map** — scope, structure, priorities, and evidence labels
2. **Must-know summary** — organized by actual question type, not merely textbook chapter
3. **Major-question methods** — fixed procedures, scoring points, formulas, diagrams, commands, or argument frames
4. **High-fit mock paper 1** — exact real-paper structure
5. **Answer and detailed explanation after every question**
6. **Additional mock sets** — same structure, different surface data or wording, full coverage without careless duplication
7. **Weak-point and wrong-answer review**
8. **Final rapid-review sheet**

Read [response-patterns.md](references/response-patterns.md) when generating questions, explanations, scoring rubrics, coverage checks, or a 48-hour sprint pack.

## Phase 5: Explain each question for scoring

For every question, include the knowledge point and why the answer is correct. Also explain why plausible wrong options or common approaches fail when useful.

Use the appropriate structure:

- **Objective question:** answer → tested point → option-by-option or statement logic → trap.
- **Calculation:** known quantities → target → governing formula and conditions → substitution → steps → unit/result → reasonableness check → common errors.
- **Drawing/waveform:** axes and scale → anchor points → transformation order → final labels → self-check.
- **Short answer:** definition/opening → numbered scoring points → closing relation or significance → compact memorization version.
- **Essay/material:** identify the tested theory → connect each material clue → layered argument → practical significance → conclusion; never paste theory without analyzing the material.
- **Program/configuration:** task decomposition → complete copyable code/commands → key-line comments → expected result or verification command → common failure points.

When the learner asks “这一步怎么来的”, expand every algebraic, logical, diagrammatic, or command transition. Do not skip a step merely because it is standard.

## Phase 6: Generate additional sets without drifting

Before each new paper:

- copy the confirmed paper skeleton and current exclusions;
- compare the coverage matrix with previous sets;
- retain all confirmed high-weight topics;
- vary data, scenarios, wording, and combinations rather than replacing the tested knowledge;
- add uncovered teacher-marked points;
- verify the exact question count and total score;
- verify that every question has an answer, knowledge point, and explanation.

When reconstructing a teacher-described paper, preserve the teacher's order and knowledge-point identity first. Mark any invented numbers or scenarios as reconstructed variants.

## Phase 7: Close the feedback loop

Classify errors by cause, not only by chapter:

- concept unknown;
- formula/condition confusion;
- calculation or unit error;
- diagram/transformation error;
- question misread;
- answer incomplete or missed scoring point;
- command/code syntax or sequence error;
- memorization failure.

Convert each error into one minimum learning unit and run a five-minute closed-book check: state the definition, write the formula/frame, solve or draw one example, and explain it aloud. Track judgment of learning on a 0–3 scale:

- 0: cannot start;
- 1: recognize but cannot reproduce;
- 2: can complete with prompts;
- 3: can independently solve and explain.

Prioritize 0–1 items, then retest with a changed surface question. Do not spend equal time on mastered and weak units.

## Phase 8: Final 48-hour sprint

Compress the existing evidence instead of adding broad new material:

- confirmed major-question frames and scoring points;
- formula sheet with applicability conditions;
- drawing and calculation procedures;
- commands/code skeletons where relevant;
- wrong-answer causes and corrected examples;
- one final structure-matched paper;
- rapid oral recall of frameworks and definitions.

End with three lists: **must memorize**, **must be able to solve**, and **easy points not to lose**.

## Output validation

Before delivery, check all of the following:

- Counts and scores match the stated paper and total correctly.
- Confirmed, predicted, and supplementary items are visibly distinguished.
- All user corrections and exclusions are honored.
- Every question has the requested answer and explanation placement.
- Formulas, units, diagrams, commands, and code are internally consistent.
- Major questions include reusable steps and scoring points.
- New mock sets expand coverage without drifting from teacher evidence.
- The final pack is usable by a beginner and directly supports closed-book recall.
