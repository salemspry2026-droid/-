# TESTING_STATUS

Statuses: PASS / FAIL / NOT RUN / NOT AVAILABLE / EXTERNAL VERIFICATION REQUIRED. Date and evidence are required for PASS/FAIL entries.
As of 2026-10-07 **no test of any kind has been executed by the knowledge-base author or recorded anywhere in the repository.** The Claude audit was static; Gradle, Android emulator, Firebase Emulator, GitHub Actions and Firebase/Google consoles were not accessed. Test existence ≠ test passing.

| Area | Status | Evidence / notes |
|---|---|---|
| Android JVM unit tests | NOT RUN | Files exist: `BonusCalculatorTest` (15 `@Test`), `DomainUnitTests` (8), `PermissionCeilingTest` (4), `DeepLinkParserTest` (7). Run with `cd android-app && ./gradlew testDebugUnitTest` (CI uses `testReleaseUnitTest` and needs signing env). Docs: "not run in authoring environment". |
| Android instrumented: `Migration1To2Test` | NOT RUN | Synthetic v1 DB; not a publish gate; no exported Room schema in repo |
| Android full-schema Room migration | NOT AVAILABLE | `app/schemas/` absent |
| Android sync / outbox behavior | NOT AVAILABLE (no tests exist) | No `SyncEngine` tests seen |
| Android UI / Compose tests | NOT AVAILABLE | None seen |
| Web unit/integration tests | NOT AVAILABLE | `package.json` scripts: `lint` only; no test framework; root `test.js` is a scratch script |
| Web lint | NOT RUN | `npm run lint` (eslint) |
| Web build | NOT RUN | `next.config.ts` ignores TS/ESLint build errors, so a green build is weak evidence |
| Firestore rules tests | NOT AVAILABLE | No `firebase.json`, no `@firebase/rules-unit-testing`; `firebase-tools` is a devDependency; tests proposed in T01/T02 |
| Firebase Emulator run | NOT RUN | — |
| CI: build/unit/validate/smoke/publish | EXTERNAL VERIFICATION REQUIRED | Workflows exist; `docs/android-completion-report.md` §4 states "not yet run"; Actions history not queried |
| CI: emulator runtime smoke | EXTERNAL VERIFICATION REQUIRED | `scripts/ci/emulator-smoke.sh` covers install, launch, crash/ANR scan, 2 deep links only (no auth/sync/rules) |
| CI: release signer validation | EXTERNAL VERIFICATION REQUIRED | `validate-release-apk.sh` + `expected-signer-sha256.txt`; secrets not available |
| Release APK signing | EXTERNAL VERIFICATION REQUIRED | Needs GitHub Secrets and a CI run |
| Production Firestore rules (deployed) vs repo | EXTERNAL VERIFICATION REQUIRED | V1 |
| Storage rules | EXTERNAL VERIFICATION REQUIRED | Not in repo; V8 |
| Firebase Auth providers / authorized domains | EXTERNAL VERIFICATION REQUIRED | Console |
| OAuth / Google Sign-In on release APK | EXTERNAL VERIFICATION REQUIRED | V2 (SHA-1/256 for debug, release, Play signing; `default_web_client_id`) |
| Email-link sign-in end to end | EXTERNAL VERIFICATION REQUIRED | Needs a real link on a device (V3) |
| Live `assetlinks.json` on Vercel | EXTERNAL VERIFICATION REQUIRED | `verify-assetlinks-live.yml` exists, results unknown (V3) |
| Firebase Hosting `assetlinks` on the auth domain | EXTERNAL VERIFICATION REQUIRED | V3 |
| Deep link `/c/{id}` on a device | EXTERNAL VERIFICATION REQUIRED | `adb shell pm get-app-links com.flowexa.app` |
| Real-device Android flows (register, onboarding, approval, order sync, logout) | NOT RUN | V7 |
| Offline sync reconnect behavior (Android and Web) | NOT RUN | — |
| Vercel deployment / `/api/*` | EXTERNAL VERIFICATION REQUIRED | — |

## Static verifications (these are readings, not tests)

Recorded with date 2026-10-06/07 by Claude. They show what the code says and are labelled VERIFIED (static) elsewhere in `.ai/`; they are NOT test results.

## Required next tests (from the proposed tasks; none exist yet)

1. Firestore rules suite (Emulator) — T01/T02: negative and positive cases listed in `claude/AUDIT_REPORT.md`.
2. Android: role-scoped sync unit test (T03), logout wipe instrumented test (T04), payload builders (T06), bonus parity (T13).
3. Web: auth check for `/api/generate-description` (T08), logout queue clear (T14).

When a test is run, add a dated row with the exact command, environment and output summary. Keep old rows; add new rows with newer dates.

## Update 2026-10-07 — T01 review (Claude, reviewer)

These are the first executed tests recorded in this knowledge base. They are Firestore Emulator tests of `firestore.rules` only, run from a scratch directory outside the repository; they are NOT repository tests.

| Area | Status | Evidence |
|---|---|---|
| Firestore rules, userProfiles boundary, working-tree rules (T01 change) | PASS (83/83) | 2026-10-07; `firebase emulators:exec --only firestore --project demo-flowexa-t01 "npx vitest run t01.rules.test.js --reporter=verbose"` in `/tmp/opencode/t01-verify`; Node 22.23.3, Java 21.0.12.1, firebase-tools 15.32.1, vitest 5.0.3, rules-unit-testing 5.0.2; suite copy at `.ai/claude/evidence/T01-review-rules-test.js` |
| Same suite against `HEAD:firestore.rules` (negative control) | 59 pass / 24 FAIL (expected: proves the tests detect KI-001/KI-002) | same command with `RULES_PATH` pointing at `git show HEAD:firestore.rules` |
| Repository rules test suite `tests/firestore.rules.test.ts` | NOT AVAILABLE | file does not exist (T01 deliverable missing) |
| `npm run test:rules` (added to package.json by the T01 working-tree change) | FAIL / NOT RUNNABLE | script references the missing test file; no `firebase.json` |
| `npm ci` / `npm install` with the T01 working-tree `package.json` | FAIL | scratch copy `/tmp/opencode/lockcheck`: `ERESOLVE` (`vitest@5.0.3` peerOptional `@types/node ^22.0.0 || >=24.0.0` vs project `^20`); `package-lock.json` unchanged |
| GitHub Actions / CI for T01 | NOT RUN | nothing committed or pushed |
| Android build / APK for T01 | NOT RUN | not applicable (rules/package.json only; no push) |
| Real-device verification | NOT RUN | pending; not applicable until a build exists |

Rules in this working tree are NOT deployed and nothing was published (deployed rules remain EXTERNAL VERIFICATION REQUIRED).
