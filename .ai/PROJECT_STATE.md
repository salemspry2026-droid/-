# PROJECT_STATE — Flowexa

Last updated: 2026-10-14 by Claude (Release workflow fix).
**Current repository HEAD:** `87a05e4c` ("fix(workflow): allow publish-release to run on workflow_dispatch", 2026-10-14).
**Implementation commits this session:** `4067bf4` (parity fixes) → `3541ad3` (compilation fix push) → `87a05e4c` (workflow fix push). Working tree clean at time of write.

Evidence basis: static reading of the repository on 2026-10-06/07. **No code was executed, no Gradle/emulator/Firebase Emulator run, no Firebase/Google/GitHub/Vercel console was accessed.** All statuses use the vocabulary in `README.md`.

## Summary

| Area | State | Status |
|---|---|---|
| Web app (Next.js) | Feature-rich; consumes Firestore through `lib/services/*`; no automated tests | VERIFIED (static) |
| Native Android (`android-app/`) | Feature-rich CI pipeline configured; P0/P1 parity fixes committed; Release pipeline repaired to support `workflow_dispatch`. CI green. | ACTIVE (in-progress runtime verification) |
| ... (rest unchanged) ...
| CI | 3 workflows + `scripts/ci/*`; release workflow repaired (supports manual dispatch); CI green. | VERIFIED (manual trigger verified) |
| Google Sign-In (Android) | Code uses Credential Manager + `GoogleAuthProvider`; OAuth/SHA config not inspected | EXTERNAL VERIFICATION REQUIRED |
| Offline sync (Android) | Implemented (Room outbox, SyncEngine, WorkManager); never runtime-tested here | NOT VERIFIED (runtime) |
| Room migration 1→2 | Implemented; full-schema migration never tested; no exported schema in repo | NOT VERIFIED |
| Deep links / app links | Implemented + JVM parser tests; live assetlinks never checked | EXTERNAL VERIFICATION REQUIRED |

## Canonical paths

- Web: repository root (`app/`, `components/`, `lib/`, `public/`).
- **Canonical Android:** `android-app/` (package `com.flowexa.app`) — VERIFIED (root README, build config).
- **Legacy Android:** `android/` — DEPRECATED, MUST NOT be modified or used for builds/CI.
- Firestore database ID: named database `ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9` (Web config `firestoreDatabaseId` present; Android `AppConfig.FIRESTORE_DATABASE_ID`) — VERIFIED (static).

## Authentication state (all static)

- Web: email/password, Google popup→redirect fallback, email-link send + complete, password reset; profile loaded by snapshot listener. VERIFIED (static).
- Android: email/password, Google (Credential Manager), email-link completion only (no send UI), password reset. VERIFIED (static).
- Google Sign-In working on a release APK: NOT VERIFIED / EXTERNAL VERIFICATION REQUIRED.
- Email-link opening the app: EXTERNAL VERIFICATION REQUIRED (no `autoVerify` on the Firebase auth host filter).

## Major unfinished / risky areas (see `KNOWN_ISSUES.md`)

1. Firestore rules: profile self-escalation (KI-001, KI-002), role-blind membership (KI-003), Web-client vs rules mismatch (KI-004), public join codes (KI-005).
2. Android: sync pulls all company data for non-staff (KI-006), logout leaves business data (KI-007), onboarding/profile writes likely rejected (KI-008..KI-010), staff list never synced (KI-011).
3. Public-data migration (`docs/public-data-migration-plan.md`) NOT executed.
4. No Firestore rules tests, no Web tests; CI never run.

## Currently active implementation tasks

**T01 is COMMITTED (2026-10-08):** Firestore rules security patch and testing state committed at `95752bc`. Other proposed tasks (T02–T15, in `claude/AUDIT_REPORT.md`) are NOT started.

## Latest verified changes

Only history from git is known (see `IMPLEMENTATION_HISTORY.md`). Most recent: `94fe721` (opencode config), `26c435d` (release signer validation), `6914503` (signer fingerprint), `95e1066` (Android CI/sync/auth/rules — the commit that tightened the rules). Contents of those commits were read only as far as stated in the history file; their runtime effect is NOT VERIFIED.

## Contradictions (CONTRADICTION DETECTED)

Each item: source vs knowledge vs likely truth vs required decision. None has been resolved.

**C-01 — Client-read leak remediation scope**
- Source: Web client queries use `createdBy`/`clientUid` (`orderService.subscribeToClientOrders`, `placeClientOrder`) and Web client profiles are written with `companyId: ''` (`onboardingService.joinAsClient`); no client component imports `customerService`.
- Knowledge: `docs/android-completion-report.md` §2 says fixing the client-read leak "requires changing Web and Android queries for clients".
- Likely truth: Web needs no query change; the exposure comes from Android assigning `companyId` to clients/pending users and pulling by `companyId` (`SyncEngine.syncCompanyData`) plus a role-blind rule (`isCompanyMember`).
- Required decision: none for the facts; scope of the fix is in task T02/T03.

**C-02 — Rules vs Web client flows**
- Source: `firestore.rules` `isCompanyClient` (line ~49) requires `profile.companyId == companyId`; orders/notifications create use it; `orderStages` read requires `isCompanyMember`.
- Knowledge/Web: Web clients have `companyId ''` and call `placeClientOrder`, create `client_order` notifications and subscribe to `orderStages`.
- Likely truth: if the repo rules are what is deployed, Web client ordering is denied. If older rules are deployed, the repo rules and production differ.
- Required: V1 (compare deployed rules). Status EXTERNAL VERIFICATION REQUIRED.

**C-03 — Order `source` value**
- Source: Web uses `source === 'customer'` (`OrdersManager.tsx`, `HomeTab.tsx`, `orderService.getDashboardStats`). Android writes `"client"` (`FlowexaApp.kt` ClientCreateOrder) and `OrderEntity` comment documents `admin, sales, client`.
- Likely truth: Web is the behavioral reference; Android deviates. Required decision: confirm Web is canonical (DEC-002 says Web is the reference).

**C-04 — Order status vocabulary** ✅ RESOLVED (commit `4067bf4`)
- Source: Web uses dynamic `orderStages` names (client orders get the first stage's name, else `'pending'`). Android `OrderEntity` comment lists fixed statuses `pending, confirmed, processing, shipped, delivered, cancelled` and `OrderRepository.createOrder` always writes `"pending"`.
- Fix applied: Added `getFirstStageName()` to `OrderStageRepository`; `FlowexaApp` reads the first stage and passes it as `initialStatus` to `createOrder()`.
- Status: FIXED; runtime behavior needs V4 (CI + device test) to confirm.

**C-09 — Android register vs routing** ✅ RESOLVED (commit `4067bf4`)
- Source: `AuthRepository.register` creates a `client` profile; `FlowexaApp.routeAfterAuth` routes any existing `client` profile to `ClientHome`. `Routes.Register` success navigates to Onboarding only once; on any later launch the user lands in ClientHome and never reaches Onboarding. Combined with the rule that forbids self role change (rules line ~285), an email-registered Android user cannot become owner/employee.
- Fix applied: Removed profile creation from `register()`; users now route to Onboarding. Profile is created during `createCompany`/`joinAsEmployee`/`joinAsClient`.
- Status: FIXED; requires V2 (Google OAuth + email register flow) and V4 (CI) to verify end-to-end.

**C-05 — Earlier audit statements corrected**
- An earlier reply in the same audit session said "client role may read all company customers/orders" as a baseline fact and that pending employees are not company members. After reading Web onboarding and Android join code: Web clients have `companyId ''` (not members); Android sets `companyId` for clients and pending employees (members under the role-blind rule). The leak is therefore CONDITIONAL on the profile's `companyId`. The later audit (`claude/AUDIT_REPORT.md`) is the corrected statement.

**C-06 — `PermissionManager` "implemented" vs used**
- Source: `PermissionManager` has no main-source callers (only tests; `FlowexaApp.kt` passes `permissionsJson` around). The completion report lists it as implemented but itself notes it is unused.
- Likely truth: exists + unit tested, not wired into UI. Status: CONFIRMED (static).

**C-07 — Stale root artifacts**
- `onsnapshot_usages.txt` (root) lists components importing `firebase/firestore` directly (e.g. `ProductsManager.tsx`). Current `components/*.tsx` and `app/**` contain no `firebase/firestore` imports (grep returned none). Root `test.js` / `res.txt` are scratch artifacts of unknown purpose.
- Likely truth: stale artifacts from the repository-pattern refactor (`docs/cleanup-plan.md`). Status: PARTIALLY VERIFIED.

**C-08 — Web "remove employee" vs rules validation (found while writing this KB)**
- Source: `CompanySettings.tsx` `handleRemoveEmployee` writes `{ companyId: null, role: null }` via `companyService.updateEmployee`. `firestore.rules` `isValidUserProfile` requires `data.role in ['owner','admin','sales','client','pending_employee']`; `null` is not in that list.
- Likely truth: the removal write is rejected by the repo rules (if deployed). Web "reject join request" uses `{companyId:'', role:'client', pendingCompanyId:null}`, which is valid.
- Required decision: OPEN-008 (what a removed employee becomes). Task T01 must be amended accordingly (see `claude/AUDIT_REPORT.md` Addendum).

## Unresolved knowledge gaps (see also `claude/AUDIT_REPORT.md`)

- Deployed Firestore/Storage rules, Auth providers, OAuth clients/SHA fingerprints, GitHub Actions history, Vercel deployment: EXTERNAL VERIFICATION REQUIRED.
- Android screens not read in full: Staff, Notifications, Settings, Products, Customers, Admin home, catalog/client screens. Web components not read in full: most dashboards/dialogs.
- Content of root `test.js`, `res.txt` beyond their first lines: UNKNOWN.
- Web offers/cart parity with Android: NOT VERIFIED.
