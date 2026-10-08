# DEEPSEEK TEST RESULTS

STATUS: **HAS RECORDED RESULTS (T01-FIX, 2026-10-07 — awaiting independent Claude verification).** A real T01-FIX test session was executed and recorded below. Earlier "not yet established" statements reflect the pre-session state and are preserved below as history.

## Rules

- Record only tests that were actually executed, with the exact command, environment, date, and a result summary. Paste the relevant tail of the output (no secrets).
- Allowed result values: PASS / FAIL / NOT RUN / NOT AVAILABLE / EXTERNAL VERIFICATION REQUIRED.
- A test that does not exist yet and was added by the task is recorded as such (file path, number of cases).
- Failing tests are recorded as FAIL, never removed. If a test was changed to make it pass, say what changed and why.
- Also copy the summary row into `.ai/TESTING_STATUS.md`.

## Expected test commands (reference)

| Area | Command | Notes |
|---|---|---|
| Firestore rules (canonical) | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts"` (or `npm run test:rules`) | Runs entirely against the local Firestore Emulator; never publishes rules |
| Android JVM unit tests | `cd android-app && ./gradlew testDebugUnitTest` | CI uses `testReleaseUnitTest` (needs signing env) |
| Android instrumented | `cd android-app && ./gradlew connectedDebugAndroidTest` | Needs emulator/device |
| Web lint | `npm run lint` | Only Web script; no Web tests exist |

## Results

### Result 1 — Firestore rules regression suite (T01-FIX)

Date: 2026-10-07.
Task ID(s): T01-FIX.
HEAD / commit: `94fe721` (HEAD unchanged; working tree = T01 rules change + T01-FIX test/dependency files). Commit: NO COMMIT RECORDED.
Command: `cd /root/- && npm run test:rules`
  (expands to `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts"`)
Environment: Linux; Node v22.23.3; OpenJDK 21.0.12.1; firebase-tools 15.32.1 (via `^15.0.0`); vitest 3.2.7; `@firebase/rules-unit-testing` 5.0.2; firebase JS SDK 12.12.0; Firestore Emulator v1.22.0 (auto-downloaded to `~/.cache/firebase/emulators`); emulator host 127.0.0.1:8080 (from `firebase.json`).
Result: PASS.
Summary (counts: run/passed/failed/skipped): 83 run / 83 passed / 0 failed / 0 skipped. 1 test file passed. Exit code 0.
Failures and diagnosis: none.
Evidence (relevant output excerpt):
```
 RUN  v3.2.7 /root/-
 ✓ tests/firestore.rules.test.ts (83 tests) 21979ms
 Test Files  1 passed (1)
      Tests  83 passed (83)
   Start at  05:26:54
   Duration  26.48s (transform 279ms, setup 0ms, collect 1.13s, tests 21.98s, ...)
✔  Script exited successfully (code 0)
i  emulators: Shutting down emulators.
```
Emulator status: started locally (Firestore Emulator standard edition), ran, clean shutdown. `i  emulators: Detected demo project ID "demo-no-project", emulated services will use a demo configuration` — no production connection. The SDK contexts in the suite use project `demo-flowexa-t01`.

### Result 2 — Clean dependency install verification (T01-FIX)

Date: 2026-10-07.
Task ID(s): T01-FIX.
Command: `npm ci --no-audit --no-fund` in an isolated clean copy `/tmp/opencode/t01-clean-check` (tracked files + new untracked files: `firebase.json`, `tests/`, `.ai/`; NO `node_modules`, NO stale caches).
Environment: Linux; Node v22.23.3; npm 10.9.9.
Result: PASS.
Summary: `npm ci` succeeded — `added 1335 packages in 4m`. `npm ci --dry-run` also resolved without ERESOLVE (`added 1446 packages in 4s`).
Failures and diagnosis: none. (The previously recorded `vitest@5.0.3` ↔ `@types/node ^20` ERESOLVE conflict does not reproduce with vitest `^3.2.7`.)
Evidence: npm output tails saved in the shell logs (see `deepseek/IMPLEMENTATION_REPORT.md` entry).

### Result 3 — In-repo lockfile regeneration

Date: 2026-10-07.
Command: `npm install --no-audit --no-fund` in `/root/-`.
Result: PASS — `added 1334 packages in 4m`; `package-lock.json` regenerated (vitest 3.2.7, rules-unit-testing 5.0.2).
Note: package-lock.json is tracked and now includes the two new devDependencies.

## Overall

- Dependency graph: normal, reproducible from a clean checkout.
- Rules suite: 83/83 PASS on the current (unchanged) T01 rules.
- Negative control (against old HEAD rules) was performed earlier by the reviewer (24 expected failures) and is recorded in `.ai/TESTING_STATUS.md`; it was NOT re-run in this session (the permanent suite targets the current rules as the intended behavior).

### Entry template

```
Date:
Task ID(s):
HEAD / commit:
Command:
Environment (OS, JDK, Gradle, Node, emulator/device, Firebase Emulator version):
Result: PASS / FAIL / NOT RUN / NOT AVAILABLE
Summary (counts: run/passed/failed/skipped):
Failures and diagnosis:
Evidence (relevant output excerpt):
```
