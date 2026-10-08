# DEEPSEEK FAILED IMPLEMENTATIONS

STATUS: **NOT YET ESTABLISHED.** No DeepSeek implementation session has occurred (as of 2026-10-07); no DeepSeek failed attempt is recorded. Historical failed approaches that predate this knowledge base (author unknown) are in `.ai/FAILED_ATTEMPTS.md` (FA-001 … FA-009). Read both files before implementing.

## Rules

- Never delete entries. Record every failed or abandoned implementation attempt, including ones that "worked but were reverted".
- Say whether the failure was observed (test/build output, with evidence) or only hypothesized.
- Record the root cause and how it was diagnosed; record the successful alternative if one exists.
- State clearly what must NOT be repeated.
- Also add a corresponding entry to `.ai/FAILED_ATTEMPTS.md` (cross-reference the Attempt ID).

## Failed implementations

None recorded yet.

### Entry template

```
Attempt ID:                 (DFI-001, DFI-002, ...)
Date:
Agent:                      DeepSeek
Task:                       (T-number)
Approach:
Files changed (and whether reverted):
Result:                     FAILED / ABANDONED / REVERTED
Failure:                    (observed: command + output excerpt; or hypothesized)
Root cause:
How it was diagnosed:
Successful alternative:     (or NOT YET ESTABLISHED)
Do not repeat:
Related: KI-xxx, FA-xxx, DEC-xxx
```

---

## Recorded by the reviewer (Claude), 2026-10-07 — DeepSeek filed nothing itself

**Attempt ID:** DFI-001
**Date:** 2026-10-07
**Agent:** DeepSeek (attribution from the user; the repository carries no self-report)
**Task:** T01
**Approach:** Implemented the T01 rules change; edited `package.json` (devDependencies `vitest ^5.0.3`, `@firebase/rules-unit-testing ^5.0.2`, script `test:rules`); did not create tests, emulator config or lockfile update.
**Files changed (uncommitted):** `firestore.rules`, `package.json`
**Result:** FAILED review gate (VER-001).
**Failure (observed):** `npm ci` / `npm install` → `ERESOLVE` (vitest 5.0.3 peerOptional `@types/node ^22 || >=24` vs `@types/node ^20`); `tests/firestore.rules.test.ts` absent; `firebase.json` absent.
**Root cause:** dependencies and script added without installing, resolving or running them.
**How diagnosed:** reviewer's scratch `npm ci --dry-run`, `ls tests`, Emulator runs.
**Successful alternative:** keep the (verified-correct) rules change; deliver the missing items listed in `claude/VERIFICATION_REPORT.md` VER-001 "Required to reach PASS".
**Do not repeat:** adding unresolvable dependencies; shipping scripts without their targets; skipping `.ai` updates.
**Related:** FA-010, KI-001, KI-002.
