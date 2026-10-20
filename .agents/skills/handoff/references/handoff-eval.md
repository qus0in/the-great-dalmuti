# Handoff suitability evaluation
Read-only trial for candidate orchestrator panes. The current orchestrator keeps the role during the trial; this is an exam, never a real handoff.

## Trial tasks (identical set per candidate)
1. Situation table: in-progress units (who, what, brief path), pending user decisions, last dev commits, open issues plus current milestone — every row with an evidence path; mark guesses as guesses.
2. Next-unit brief draft: draft one brief in orchestrate brief form (why -> what -> how, ownership, prohibitions, frozen criteria, report path, summary block) plus worker/reviewer assignment with rationale; reviewer differs in model family from author when possible.
3. Judgment: read one past brief plus its report, rule accept vs demand-more with evidence paths, then compare the ruling against later repo history.
4. Self-check: state explicitly that no orchestrator-forbidden action occurred (no edits outside own draft/report, no dispatch/notify except one completion callback, no operating other panes, no takeover run, no commit/push, no gh writes, no headless browser). Candidates must not read each other's reports.

## Grading
- t1 (handoff-capable): situation table matches the answer key including missed-callback evidence; brief form complete with grounded assignment and order; judgment names a causal line plus a failure class; zero forbidden actions; inside the timebox.
- t2 (worker/review only): accurate but misses callback-loss evidence, or refiles resolved items as pending decisions, or any forbidden action even when self-disclosed — needs assisted verification before any handoff.
- Answer key: live state frozen at trial time (dispatch/callback logs, git log, issue tracker); record it before grading.

## Recording
- Durable outcome only: model name plus provider path plus effort plus date plus grade goes to the calibration table in orchestrate `references/models.md`.
- Trial artifacts stay ephemeral; durable docs never cite concrete ephemeral paths.
