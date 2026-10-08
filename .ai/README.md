# .ai/ — Flowexa Permanent Engineering Knowledge Base

Created: 2026-10-07 (repository HEAD at creation: `94fe721`, working tree clean before this directory was added).
Status: INITIALIZED from the Claude audit of 2026-10-06/07. See `claude/AUDIT_REPORT.md`.

## What this directory is

`.ai/` is the single, version-controlled knowledge base shared by:

- **Claude** — architect, auditor, reviewer. Finds and verifies issues, writes implementation specifications. Does NOT implement.
- **DeepSeek** — implementation agent. Implements only confirmed tasks written by Claude/the user, then records what it did.
- **Future AI agents and sessions** — must start here instead of re-discovering the project.
- **The user** — the final decision-maker for every unresolved product-policy question (see `DECISIONS.md` → OPEN QUESTIONS). No agent may silently decide policy.

Do not create any competing knowledge directory. Existing human docs in `docs/` are historical inputs, not the knowledge base (see "Related documents").

## Status vocabulary (used everywhere in `.ai/`)

| Tag | Meaning |
|---|---|
| VERIFIED | Confirmed by reading current source/config in this repository (static), or by an executed test whose result is recorded in `TESTING_STATUS.md` |
| PARTIALLY VERIFIED | Part of the claim is confirmed; the rest is not |
| NOT VERIFIED | Believed or inferred, not confirmed |
| EXTERNAL VERIFICATION REQUIRED | Depends on Firebase Console, Google Cloud/OAuth, GitHub Secrets/Actions, Vercel, production Firestore, a real device or an emulator |
| UNKNOWN | No evidence either way |
| NOT YET ESTABLISHED | The file/section exists but has no real content yet |

IMPORTANT: "VERIFIED" for a code claim means *static* reading. It never means runtime behavior, and never means the deployed Firebase state. Runtime and deployment claims need an entry in `TESTING_STATUS.md`.

## MANDATORY SESSION PROTOCOL

### Before ANY audit or implementation (all agents)

Read, in this order:

1. `.ai/README.md`
2. `.ai/PROJECT_STATE.md`
3. `.ai/FLOWEXA_BUSINESS_POLICY.md`
4. `.ai/ARCHITECTURE.md`
5. `.ai/DATA_MODEL.md`
6. `.ai/SECURITY_MODEL.md`
7. `.ai/ROLE_PERMISSION_MATRIX.md`
8. `.ai/DECISIONS.md`
9. `.ai/IMPLEMENTATION_HISTORY.md`
10. `.ai/FAILED_ATTEMPTS.md`
11. `.ai/TESTING_STATUS.md`
12. `.ai/KNOWN_ISSUES.md`

Then inspect the CURRENT source code. **Never assume the knowledge base is newer than the source code.**

If the current source code contradicts the knowledge base: **STOP AND REPORT THE CONTRADICTION. Do not guess.** Record it (see "Knowledge consistency rule").

### DeepSeek — before implementation

1. Complete the reading list above.
2. Confirm the task is a CONFIRMED implementation task (not NEEDS VERIFICATION, not POLICY DECISION, not a suspicion).
3. Check `FAILED_ATTEMPTS.md` and `deepseek/FAILED_IMPLEMENTATIONS.md` so you do not repeat a known failed approach.
4. Inspect the current source for every file you will touch. If it contradicts this knowledge base or the task: stop and report.

### DeepSeek — after implementation (NOT optional; part of the task)

1. Record the task.
2. Record changed files.
3. Explain the implementation.
4. Record the tests that were run.
5. Record the actual test results (PASS/FAIL, command, date). Never record a test you did not run.
6. Record failed attempts.
7. Record the successful approach.
8. Update `PROJECT_STATE.md`.
9. Update `IMPLEMENTATION_HISTORY.md`.
10. Update `TESTING_STATUS.md`.
11. Update `FAILED_ATTEMPTS.md` if applicable (and `deepseek/FAILED_IMPLEMENTATIONS.md`).
12. Update `CHANGELOG.md`.
13. Update `ARCHITECTURE.md`, `SECURITY_MODEL.md`, `DATA_MODEL.md`, `ROLE_PERMISSION_MATRIX.md`, `WEB_ANDROID_PARITY.md`, `KNOWN_ISSUES.md` if affected.
14. Fill `deepseek/IMPLEMENTATION_REPORT.md`, `deepseek/CODE_CHANGES.md`, `deepseek/TEST_RESULTS.md`.

### Claude — future session protocol

1. Read the knowledge base.
2. Inspect current source code.
3. Compare current source against the knowledge base.
4. Identify changes since the last known state (compare `git log` against "Last known state" in `PROJECT_STATE.md`).
5. Review DeepSeek implementation reports.
6. Review failed attempts.
7. Verify tests (re-run or request results; do not trust recorded results blindly).
8. Update audit knowledge (`claude/*`, `KNOWN_ISSUES.md`, `SECURITY_MODEL.md`, ...).
9. Produce new implementation tasks ONLY for confirmed issues.

Claude must never assume an old audit is still current.

## Source-of-truth hierarchy

| Level | Source | Answers |
|---|---|---|
| 1 | Current source code (and Firebase config in the repo) | What is actually implemented |
| 2 | `FLOWEXA_BUSINESS_POLICY.md` + `DECISIONS.md` | What Flowexa is intended to do |
| 3 | `TESTING_STATUS.md` (executed, recorded tests) | What has actually been verified by running something |
| 4 | `IMPLEMENTATION_HISTORY.md` | What was done and when |
| 5 | `claude/*` audit/review findings | What a reviewer believed at a point in time |
| 6 | `FAILED_ATTEMPTS.md` | What was tried and did not work |

Historical information must never override current source code or an explicit current product decision. The repository does NOT contain Firebase production state: deployed Firestore rules, Storage rules, Auth/OAuth configuration are always EXTERNAL VERIFICATION REQUIRED unless a dated entry in `TESTING_STATUS.md` says otherwise.

## Knowledge consistency rule

If any of these disagree — Knowledge Base vs Source Code vs Tests vs Product Decision — do NOT silently resolve it. Record:

```
CONTRADICTION DETECTED
Source:            (file/line or test)
Knowledge:         (which .ai file says what)
Test evidence:     (if any)
Likely current truth:
Required decision: (who decides: user / verification)
```

Add it to `PROJECT_STATE.md` → "Contradictions" and to `CHANGELOG.md`. Do not delete the older statement; mark it SUPERSEDED or CONTRADICTED and explain. Decisions are append-only (`DECISIONS.md`): supersede, never edit away.

## Hard rules for every agent

- No guessing. If unknown, write `UNKNOWN`. If untested, `NOT VERIFIED`. If external, `EXTERNAL VERIFICATION REQUIRED`.
- Do not invent architecture, business rules, test results, commit IDs, production behavior, Firebase/OAuth configuration or security guarantees.
- Do not silently change product policy. Policy changes require a new entry in `DECISIONS.md` approved by the user.
- Do not treat intentionally public company-facing information (company name/logo/contact, catalog, products, prices, offers, bonuses, categories, brands, availability) as a vulnerability. The privacy boundary is client-to-client and tenant-to-tenant private data (see `FLOWEXA_BUSINESS_POLICY.md`).
- Do not write secrets into `.ai/`: no keys, passwords, tokens, keystore material, `google-services.json` contents, env values. (Public identifiers such as the package name `com.flowexa.app` and the Firestore database ID are already in committed config and are fine.)
- Protected paths (never modify without explicit user authorization): `android/` (legacy, deprecated), `android-app/app/flowexa-release.keystore`, any signing material, `.github/workflows/*`, `scripts/ci/*`, `firestore.rules` (only the tasks that explicitly say so, and never publish), `android-app/app/google-services.json`, `opencode.json`, env/API secret files, identity entries in `public/.well-known/assetlinks.json`.
- Never run deploy/publish commands (Firebase deploy, rules publish, release workflows) unless the user explicitly asks.

## File index

| File | Purpose |
|---|---|
| `PROJECT_STATE.md` | Current verified state, last known commit, contradictions, active tasks |
| `FLOWEXA_BUSINESS_POLICY.md` | What Flowexa does, derived from Web; privacy boundary |
| `ARCHITECTURE.md` | Web + Android architecture and key paths |
| `DATA_MODEL.md` | Firestore/Room entities, fields, invariants |
| `SECURITY_MODEL.md` | Policy vs implementation vs verification status |
| `ROLE_PERMISSION_MATRIX.md` | Role × capability matrix |
| `WEB_ANDROID_PARITY.md` | Parity gaps with status |
| `DECISIONS.md` | Append-only decision log + open policy questions |
| `IMPLEMENTATION_HISTORY.md` | What has been implemented (historical commits + future entries) |
| `FAILED_ATTEMPTS.md` | Known failed approaches — do not repeat |
| `TESTING_STATUS.md` | What has/has not been run |
| `KNOWN_ISSUES.md` | Verified or explicitly unresolved issues |
| `CHANGELOG.md` | Chronological knowledge-base/source/policy changes |
| `claude/AUDIT_REPORT.md` | The 2026-10-07 Claude audit (preserved) incl. task specs T01–T14 |
| `claude/REVIEW_REPORT.md` | Future Claude reviews |
| `claude/VERIFICATION_REPORT.md` | Claude verification of DeepSeek work |
| `deepseek/IMPLEMENTATION_REPORT.md` | DeepSeek completed implementations |
| `deepseek/CODE_CHANGES.md` | DeepSeek source change summaries |
| `deepseek/TEST_RESULTS.md` | DeepSeek real test results |
| `deepseek/FAILED_IMPLEMENTATIONS.md` | DeepSeek failed attempts |

## Related documents (historical, may be stale — source code wins)

- `README.md` (repo root) — states `android-app/` is canonical and `android/` is legacy.
- `docs/project-architecture.md`, `docs/android-native-architecture.md`, `docs/android-completion-report.md`, `docs/public-data-migration-plan.md`, `docs/cleanup-plan.md` — written by earlier sessions, mostly in Arabic. Useful as evidence of intent and prior claims; verify against code before relying on them.
