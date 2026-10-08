# FAILED_ATTEMPTS

Never delete entries. Each entry states how strong the evidence is: **DOCUMENTED** (stated in repo docs/comments/commit history), **OBSERVED** (seen in source), or **HYPOTHESIZED** (inferred, not tested). Nothing below was reproduced by running code. Format: Attempt ID / Date / Agent / Task / Approach / Files Changed / Result / Failure / Root Cause / How It Was Diagnosed / Successful Alternative / Do Not Repeat.

**Attempt ID:** FA-001
**Date:** 2026-10-05
**Agent:** UNKNOWN
**Task:** Close the "any authenticated user can read everything" Firestore rules (commit `95e1066`)
**Approach:** Tighten reads to `isCompanyMember(companyId)` and make `isCompanyClient` require `profile.companyId == companyId`; restrict `userProfiles` reads to self/company admin.
**Files Changed:** `firestore.rules`
**Result:** PARTIAL — evidence level HYPOTHESIZED (static reading, not tested, deployment unknown).
**Failure:** (1) Web clients have `companyId ''`, so by the rules Web client order/notification creation and `orderStages` reads are denied and Web `findClientByPhone` (list query on `userProfiles`) is not satisfiable. (2) `isCompanyMember` is role-blind, so Android clients/pending employees (who get a `companyId`) remain members and still read customers/orders. (3) The profile create/update rules still allow self-escalation.
**Root Cause:** The rules were written against the Android model (clients with `companyId`) without reconciling the Web model (clients with `companyId ''`) and without rules tests.
**How It Was Diagnosed:** Claude audit comparing `firestore.rules` with `onboardingService`, `orderService.placeClientOrder`, `ClientProducts`, `CompanyRepository.joinAsClient/joinAsEmployee`.
**Successful Alternative:** NOT YET ESTABLISHED. Proposed (unimplemented): T01 (profile rules) + T02 (role-aware membership; client branch independent of `companyId`), with emulator tests.
**Do Not Repeat:** Do not change Firestore rules without (a) rules unit tests in the Emulator covering Web-model and Android-model profiles, (b) checking Web client flows, (c) deciding deploy order against shipped Android builds.

**Attempt ID:** FA-002
**Date:** before 2026-10-05
**Agent:** UNKNOWN
**Task:** Android `BonusCalculator` tiered bonus
**Approach:** Parse tier JSON with `org.json` inside the calculator; swallow parse errors with `catch` returning 0.
**Files Changed:** `domain/BonusCalculator.kt` (replaced in `95e1066`)
**Result:** FAILED tier tests (DOCUMENTED).
**Failure:** JVM unit tests failed for tier calculations.
**Root Cause:** `org.json` in the Android stub jar throws "Method not mocked" in JVM tests; the exception was swallowed and returned 0.
**How It Was Diagnosed:** `docs/android-completion-report.md` §1.
**Successful Alternative:** `BonusTier` + `BonusTierParser` (single `org.json` boundary) + pure calculator; test-only `org.json:json:20240303`; parse errors reported via `parseErrorReporter`. Implemented, NOT RUN here.
**Do Not Repeat:** Do not swallow parse errors silently; do not depend on `org.json` in pure JVM tests without the test-only dependency.

**Attempt ID:** FA-003
**Date:** before 2026-10-05
**Agent:** UNKNOWN
**Task:** Android sync concurrency
**Approach:** A lock that, when already held, returned success without running a sync.
**Files Changed:** `sync/SyncEngine.kt`
**Result:** FAILED (DOCUMENTED in the `SyncEngine.syncOutbox` KDoc: "previous implementation silently returned success when locked").
**Failure:** Concurrent callers were silently dropped and reported success.
**Root Cause:** Mutex try-lock semantics.
**How It Was Diagnosed:** KDoc/commit `95e1066`.
**Successful Alternative:** Single-flight `Deferred` shared by concurrent callers. Implemented, NOT RUN here.
**Do Not Repeat:** Do not report success for a sync that did not run.

**Attempt ID:** FA-004
**Date:** before 2026-10-05
**Agent:** UNKNOWN
**Task:** Android auth/profile loading offline
**Approach:** Treat any profile-load failure as "no profile" and route to Onboarding / fabricate a profile.
**Files Changed:** `data/repository/AuthRepository.kt`, `navigation/FlowexaApp.kt`
**Result:** FAILED (DOCUMENTED only by comments: `ProfileLoadResult` KDoc "the four cases the app must NEVER confuse", "NEVER fabricates a profile"). The old code itself was not examined.
**Failure/Root Cause:** Network failure confused with missing profile (inferred from the new design).
**Successful Alternative:** `ProfileLoadResult.Found/NotFound/Unavailable` + `ProfileRetry` screen. Implemented, NOT RUN here.
**Do Not Repeat:** Do not route to onboarding on a network/cache-only miss.

**Attempt ID:** FA-005
**Date:** 2026-10-05
**Agent:** UNKNOWN
**Task:** Room migration test
**Approach:** Use `MigrationTestHelper` with the exported `1.json` schema.
**Result:** NOT USABLE (DOCUMENTED in `Migration1To2Test` KDoc): the exported schema is not in the repository (`android-app/app/schemas` absent).
**Successful Alternative (partial):** Synthetic v1 DB with only the two tables the migration alters; never run; not a release gate. Does not prove the whole v1 schema migrates.
**Do Not Repeat:** Do not claim the Room migration is verified; export and commit schemas (build config already sets `room.schemaLocation`) before relying on `MigrationTestHelper`.

**Attempt ID:** FA-006
**Date:** before 2026-10-05
**Agent:** UNKNOWN
**Task:** Local APK build script
**Approach:** `scripts/build-apk.sh` claimed a local build.
**Result:** CORRECTED (DOCUMENTED in report: "no longer claims local build; static checks + guidance for GitHub Actions"). **Do Not Repeat:** do not claim builds that cannot run locally.

**Attempt ID:** FA-007
**Date:** 2026-10-05
**Agent:** UNKNOWN
**Task:** Release signer fingerprint / assetlinks
**Approach:** Initially a fingerprint supplied in a request was only 18 bytes (SHA-256 needs 32) and was deliberately NOT written to any file (DOCUMENTED, completion report §1). Later commits `6914503` and `26c435d` update the fingerprint and make validation robust.
**Result:** Final state NOT VERIFIED (no CI run seen). **Do Not Repeat:** never write a partial/guessed certificate fingerprint into `assetlinks.json` or `expected-signer-sha256.txt`; the validated value must come from the real release keystore/CI output.

**Attempt ID:** FA-008
**Date:** 2026-10-02/03
**Agent:** UNKNOWN
**Task:** Android Gradle build
**Approach:** Initial Gradle/Kotlin configuration and sources (`47e11bf` "Fix Android Gradle configuration", `1404449` "Fix Android compilation errors").
**Result:** Compilation/Gradle configuration errors existed at those commits (OBSERVED from commit subjects only; details not reviewed). **Do Not Repeat:** do not commit large Android edits without a successful local/CI compile (the completion report admits no Android tools were available in the authoring environment).

**Attempt ID:** FA-009
**Date:** 2026-10-07
**Agent:** Claude
**Task:** First audit pass summary
**Approach:** Stated early in the audit that "client role may read all company customers/orders" as a baseline fact.
**Result:** OVERSTATED (corrected in the full audit; see C-05). **Do Not Repeat:** state the condition (profile has `companyId`); verify onboarding code for each platform before declaring baseline exposure.

## Pending-risk notes (not failures)

- T01 as originally specified does not cover Web employee removal (`{companyId:null, role:null}`); implementing T01 without the addendum would keep removal broken (KI-019). Recorded here so DeepSeek does not "fix" it silently.

**Attempt ID:** FA-010
**Date:** 2026-10-07
**Agent:** DeepSeek (attributed by the user; not self-reported)
**Task:** T01 (profile self-escalation rules + test harness)
**Approach:** Rules change per spec, plus `package.json` edits adding `vitest ^5.0.3`, `@firebase/rules-unit-testing ^5.0.2` and a `test:rules` script — without creating the test file, an emulator config, or a regenerated lockfile.
**Files Changed:** `firestore.rules`, `package.json` (uncommitted)
**Result:** REJECTED at the review gate. Evidence level: OBSERVED (reviewer ran `npm ci --dry-run`/`npm install --dry-run` in a scratch copy and the Emulator suites).
**Failure:** (1) `npm ci`/`npm install` fail with ERESOLVE: `vitest@5.0.3` peerOptional `@types/node "^22.0.0 || >=24.0.0"` vs project `@types/node "^20"`. (2) `tests/firestore.rules.test.ts` missing, so `test:rules` has nothing to run; no `firebase.json`. (3) No `.ai` records.
**Root Cause:** Dependencies were added without installing/resolving them, and the test deliverable was not produced or run.
**How It Was Diagnosed:** `git diff`, `ls tests`, scratch `npm ci --dry-run`, independent Emulator run.
**Successful Alternative:** The rules change itself is correct and may be kept; remaining work is to add the test file, an emulator config, compatible dev-dependency versions (or an explicit `@types/node` decision) and a regenerated lockfile — proving `npm ci` and the suite in a clean checkout.
**Do Not Repeat:** Never add dependencies to `package.json` without running the install and committing a matching lockfile; never add an npm script that points to files that do not exist; never claim tests without running and recording them.
