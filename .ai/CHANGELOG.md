# CHANGELOG

Chronological record of meaningful changes to: source code, architecture, business policy, security model, and this knowledge base. Newest entries at the bottom of each date block; never delete entries. If a change is later corrected, add a new entry that references the old one.

Entry format: `[date] [area] [agent] — description (refs)`.

---

## 2026-10-07

### Knowledge base initialization (Claude)

- `[2026-10-07] [knowledge base] [Claude]` Created `.ai/` as the single permanent AI engineering knowledge base. Repository HEAD at creation: `94fe721`; working tree was clean before `.ai/` was added. Evidence basis: static reading only (no code executed; no Firebase/Google/GitHub/Vercel consoles accessed).
- Files created: `README.md`, `PROJECT_STATE.md`, `FLOWEXA_BUSINESS_POLICY.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY_MODEL.md`, `ROLE_PERMISSION_MATRIX.md`, `WEB_ANDROID_PARITY.md`, `DECISIONS.md`, `IMPLEMENTATION_HISTORY.md`, `FAILED_ATTEMPTS.md`, `TESTING_STATUS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md`, `claude/AUDIT_REPORT.md`, `claude/REVIEW_REPORT.md`, `claude/VERIFICATION_REPORT.md`, `deepseek/IMPLEMENTATION_REPORT.md`, `deepseek/CODE_CHANGES.md`, `deepseek/TEST_RESULTS.md`, `deepseek/FAILED_IMPLEMENTATIONS.md`.
- Imported the Claude audit of 2026-10-06/07 as `claude/AUDIT_REPORT.md` (historical, condensed; level 5 in the source-of-truth hierarchy).

**What did NOT change (explicit):**
- No application source code was modified (Web or `android-app/`).
- No Firebase configuration was modified or accessed.
- `firestore.rules` was not modified and nothing was published.
- No Android signing material, keystore, CI workflow, `scripts/ci/*`, `google-services.json`, `opencode.json`, env file or `assetlinks.json` entry was modified.
- Legacy `android/` was not modified.
- Nothing was committed or pushed.

### Contradictions recorded (details in `PROJECT_STATE.md` → Contradictions)

- C-01 client-read leak remediation scope (completion report vs Web/Android code)
- C-02 repo rules vs Web client flows (deployed rules unknown)
- C-03 order `source` value: Web `'customer'` vs Android `'client'`
- C-04 order status vocabulary: Web order-stage names vs Android fixed `pending`
- C-05 early audit statement about client baseline exposure corrected (conditional on profile `companyId`)
- C-06 `PermissionManager` "implemented" vs not used by any screen
- C-07 stale root artifacts (`onsnapshot_usages.txt`, `test.js`, `res.txt`) vs current source
- C-08 Web "remove employee" payload (`role: null`) vs rules validation
- C-09 Android register pre-creating a `client` profile vs routing and the self-role-change rule

### Known issues recorded (details in `KNOWN_ISSUES.md`)

KI-001 … KI-026. Severity summary (static, deployment not verified): Critical — KI-001, KI-002; High — KI-003, KI-005, KI-006, KI-007; Medium — KI-012 (and KI-020 as a policy-blocked integrity item); Low/Medium — KI-013; Low — KI-018, KI-025, KI-026, KI-023. Functional/parity — KI-004, KI-008 … KI-011, KI-014 … KI-017, KI-019, KI-021, KI-022, KI-024.

### Tasks proposed (details in `claude/AUDIT_REPORT.md`; NONE implemented)

T01 … T14 from the audit, plus T15 added during KB initialization (Web employee removal payload; blocked on OPEN-008). T01 carries an amendment pending OPEN-008. Tasks T02, T05, T06, T11, T13, T15 are gated on decisions or on reading screens not yet read.

### Open product questions recorded (details in `DECISIONS.md` Part 2; user decides)

OPEN-001 (clients as company members), OPEN-002 (Android landing page), OPEN-003 (existing Android-created profiles), OPEN-004 (staff global client lookup by phone), OPEN-005 (client visibility of order stages/locations), OPEN-006 (server validation of client-supplied order values), OPEN-007 (canonical bonus tier rule), OPEN-008 (what a removed employee becomes).

### Decisions recorded (details in `DECISIONS.md` Part 1)

DEC-001 … DEC-010 (canonical Android path, Web as reference, public catalog visibility, privacy boundary, protected files, agent roles, offline-first Android, soft delete, staged public-data plan [planned, not executed], KB conventions).

### Verification requirements recorded

V1 … V8 (deployed rules, Google Sign-In/OAuth, app links, CI run, production profile data shape, join-code rotation, Android runtime matrix, Storage rules) — all EXTERNAL VERIFICATION REQUIRED or NOT RUN; see `TESTING_STATUS.md`.

---

## 2026-10-13

### Web-Android parity audit & implementation batch (Claude)

- `[2026-10-13] [android-app] [Claude]` Committed P0/P1 parity fixes to resolve 7 critical gaps between Web and Android apps (commits `4067bf4`, `3541ad3`).
  - **C-09** (P0): Removed pre-created `client` profile from `AuthRepository.register()`; email-registered users now route to Onboarding instead of being locked into ClientHome.
  - **C-04** (P1): Orders now use the first order-stage name (from Firestore) as initial status instead of hardcoded `"pending"`. Added `getFirstStageName()` to `OrderStageRepository`.
  - **KI-007** (P1): Logout now clears all Room tables and cancels WorkManager jobs to prevent stale data across sessions.
  - **KI-010** (P1): Employee join notification type changed from `"staff_join"` to `"join_request"` with correct payload (`userId`, `userEmail`, `userName`, `isDeleted=false`). Extended `NotificationEntity` with new fields (commit `3541ad3`).
  - **KI-014** (P1): Client order source value changed from `"client"` to `"customer"` to match web canonical.
  - **KI-011** (P2): Added userProfiles sync step to `SyncEngine.syncCompanyData()` for owner/admin roles so StaffScreen can display pending approvals.
  - **KI-016** (P2): Added `sendSignInLinkToEmail()` to `AuthRepository` and "إرسال رابط الدخول إلى بريدي" button to `LoginScreen`.
  - Fixed compilation error: added `import androidx.work.WorkManager` and corrected `android.work.WorkManager` → `WorkManager` in `FlowexaApp.kt` (commit `3541ad3`).
  - CI build `38339290232`: Build job PASSED; instrumented test and smoke test running.
- `[2026-10-13] [documentation] [Claude]` Created `.ai/WEB_ANDROID_PARITY_AUDIT.md` — comprehensive 38-item parity matrix with severity classification and implementation plan.
- `[2026-10-13] [knowledge base] [Claude]` Updated `PROJECT_STATE.md` — resolved contradictions C-04 and C-09; updated last-known state to HEAD `3541ad3`.
- `[2026-10-13] [knowledge base] [Claude]` Updated `KNOWN_ISSUES.md` — marked KI-007, KI-010, KI-011, KI-014, KI-016 as FIXED with commit references.

---

## 2026-10-14

### CI/Release pipeline repair (Claude)

- `[2026-10-14] [ci] [Claude]` Repaired "Publish GitHub Release" workflow to support both `push` and `workflow_dispatch` events.
  - **Issue:** `publish-release` job had `if: github.event_name == 'push'` condition (line 307), causing manual (workflow_dispatch) releases to skip publishing to GitHub Releases. This left users with an outdated APK from the website download (`https://orderflow-topaz.vercel.app/Flowexa.apk`).
  - **Fix:** Updated `.github/workflows/build-flowexa-apk.yml` (commit `87a05e4`) to change condition to `if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'`.
  - **Verification:** v2.0.66 release published successfully (Run `38616307067`, 2026-10-14T18:39:36Z). All 4 jobs passed: Build and Validate, Instrumented Room migration test, Runtime Smoke Test, Publish GitHub Release.
  - **Website download chain verified:** `/api/download-apk` → GitHub release asset via `GITHUB_RELEASE_APK_URL` (confirmed working for v2.0.65 and v2.0.66).
  - **Note:** v2.0.67 release exists; its origin was external to this repair effort.
  - **Startup crash investigation:** UNCONFIRMED - app crashes ~2 seconds after launch. No runtime logs available. Crash requires ADB/device logs to diagnose. Fixing release workflow does NOT diagnose or fix this crash.
- `[2026-10-14] [knowledge base] [Claude]` Updated `PROJECT_STATE.md` — HEAD updated to `5dfcc0e`; CI section marked "CI green, manual trigger verified".

---

## 2026-10-07 (later) — T01 review

- `[2026-10-07] [security/tests/knowledge base] [Claude]` Reviewed the uncommitted T01 working-tree change (`firestore.rules`, `package.json`). Rules logic verified correct by independent Emulator tests (83/83 PASS; 24 attack cases fail against HEAD rules). Release gate: **FAIL** because the required repo test suite is missing, `test:rules` is unusable, and `package.json` breaks `npm ci`/`npm install` (ERESOLVE, lockfile unchanged); DeepSeek filed no `.ai` records. No commit, push or deploy performed. T02 not started.
  Refs: T01, KI-001, KI-002, VER-001, REV-001, FA-010, DFI-001. Commit: NO COMMIT RECORDED.
  Files: `.ai/claude/VERIFICATION_REPORT.md`, `.ai/claude/REVIEW_REPORT.md`, `.ai/claude/evidence/T01-review-rules-test.js` (new), `.ai/TESTING_STATUS.md`, `.ai/IMPLEMENTATION_HISTORY.md`, `.ai/FAILED_ATTEMPTS.md`, `.ai/KNOWN_ISSUES.md`, `.ai/PROJECT_STATE.md`, `.ai/CHANGELOG.md`, `.ai/claude/AUDIT_REPORT.md`, `.ai/deepseek/IMPLEMENTATION_REPORT.md`, `.ai/deepseek/FAILED_IMPLEMENTATIONS.md`.
  Tests: see `TESTING_STATUS.md`.

## 2026-10-13

- [2026-10-13] [ci/android/knowledge base] [Claude] Completed Android build-readiness audit. Verified project structure, CI pipeline integrity, and APK-delivery mechanism. Updated project knowledge base.
  Refs: KI-001, KI-002, T01-FIX (95752bc). Commit: [hash to be added]
  Files: .ai/PROJECT_STATE.md, .ai/CHANGELOG.md.
  Tests: Static inspection only.
  KB files updated: .ai/PROJECT_STATE.md, .ai/CHANGELOG.md.

## 2026-10-13

- [2026-10-13] [ui/navigation/auth] [Claude] Implemented Android UX parity with the web landing page; fixed AppLogoView to use local resource; updated Auth nav flow.
  Refs: Android UX parity requirement.
  Files: android-app/app/src/main/java/com/flowexa/app/navigation/FlowexaApp.kt, android-app/app/src/main/java/com/flowexa/app/navigation/Routes.kt, android-app/app/src/main/java/com/flowexa/app/ui/components/AppLogoView.kt, android-app/app/src/main/java/com/flowexa/app/ui/auth/LandingScreen.kt (new).
  Tests: Static inspection only.
  KB files updated: .ai/CHANGELOG.md.

## 2026-10-13 (fix)

- [2026-10-13] [ui/navigation/auth] [Claude] Fixed compilation error in AppLogoView due to missing imports.
  Refs: KI-?? (auto-generated fix).
  Files: android-app/app/src/main/java/com/flowexa/app/ui/components/AppLogoView.kt.
  Tests: Static inspection; CI build in progress.
  KB files updated: .ai/CHANGELOG.md.

```
## YYYY-MM-DD
- [area: source|architecture|policy|security|knowledge base|tests|ci] [agent] — what changed, why
  Refs: Task ID(s), KI-/DEC-/OPEN-/C- IDs, commit hash (or NO COMMIT RECORDED)
  Files: ...
  Tests: command + result (or NOT RUN)
  KB files updated: ...
```

## 2026-10-20

### Continued Android repair — session evidence record (Claude)

- `[2026-10-20] [android|knowledge base] [Claude]` Resumed the repair workflow from the `flowexa-audit.txt` stopping point. The KB (last recorded HEAD `87a05e4c`) was six commits behind (`72ac378`→`bb1a202`), and the working tree carries an **uncommitted** Android/web batch: AuthRepository email normalization + Arabic `authErrorMessage`; GoogleAuthManager cancellation/no-credential handling; permission-gated Products/Customers screens (`PermissionManager`, closing C-06); `data_extraction_rules.xml` (T07/KI-013); deep-link `pathPrefix="/__/auth/"`; Customers/Products form-dialog rework; matched web email-link fixes (`app/page.tsx`, `components/AuthProvider.tsx`). Two defects were found and fixed in that batch:
  1. `android-app/app/build.gradle.kts` — the `release` signing config demanded CI secrets at configuration time whenever a (gitignored, locally present) keystore file existed, failing even `assembleDebug`. Credential validation is now deferred behind the file's existing `isReleasePackagingRequested` guard; release builds still fail hard with the same messages. Config-level effect VERIFIED (the build progressed past configuration into task execution).
  2. `FlowexaApp.kt` — the new `userProfile` params on `ProductsScreen`/`CustomersScreen` were never passed, so `hasPermission(null, …)` returned false for everyone and the gating would hide create/edit/delete even for owners/admins. Both call sites now pass `userProfile = userProfile`.
  Refs: T04, T07, KI-007, KI-013, C-06. Commit: NO COMMIT RECORDED (uncommitted).
  Files: `android-app/app/build.gradle.kts`, `android-app/app/src/main/java/com/flowexa/app/navigation/FlowexaApp.kt`.
  Tests: full uncommitted diff statically reviewed PASS (imports, named args, entity fields, call sites); Gradle compile NOT AVAILABLE locally — see blocker below.
  KB files updated: `.ai/CHANGELOG.md`.

### Environment blocker (must be preserved in all future audits)

- `[2026-10-20] [environment|build] [Claude]` **This host is aarch64.** `uname -m` = `aarch64`; the JVM and the system loaders are aarch64 (`/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1`). AGP 8.7.0's AAPT2 (Maven `aapt2-8.7.0-12006047-linux.jar`, and SDK `build-tools/35.0.0/aapt2`) are **x86-64 ELF** binaries needing `/lib64/ld-linux-x86-64.so.2`, which does not exist; both fail `cannot execute: required file not found`. Probes confirm **no ARM64-Linux aapt2 artifact exists** on Google Maven for aapt2 `8.7.0-12006047` or even `8.11.1` (`-linux-arm64` / `-arm64-linux` / `-linux_aarch64` all HTTP 404). Therefore no Gradle task that needs resource processing (`processDebugResources`, then `compileDebugKotlin`, `assembleDebug`, `testDebugUnitTest`) can run on this host at any AGP version. This **corrects** the earlier assumption that a debug build "should work locally if JDK + Android SDK are present" (`claude/AUDIT_REPORT.md` / `PROJECT_STATE.md`): on this host that is false by architecture. APK production and code compilation verification must flow through CI (GitHub Actions, x86-64 runners). Secondary constraints: RAM (~0.2–0.6 GB free, swap exhausted) and disk (`/` and `/dev/shm` at ~98%).
  Refs: none. Commit: NO COMMIT RECORDED.
  Tests: `./gradlew :app:assembleDebug` → `BUILD FAILED` at `:app:processDebugResources` (AAPT2 Daemon startup failed, 8m 31s); `build-tools/35.0.0/aapt2 version` → `cannot execute: required file not found`; `curl` HEAD on aapt2 arm64 jar names → HTTP 404.
  KB files updated: `.ai/CHANGELOG.md`, `.ai/PROJECT_STATE.md`, `.ai/TESTING_STATUS.md`.
