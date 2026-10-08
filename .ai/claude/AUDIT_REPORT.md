# CLAUDE AUDIT REPORT — Flowexa (preserved)

Audit date: 2026-10-06/07. Auditor: Claude (architect/reviewer; did not implement). Repository HEAD audited: `94fe721`, clean tree. Scope: Web, `android-app/`, `firestore.rules`, CI/scripts, docs. Excluded by instruction: `android/`, secrets, keystores, `google-services.json`, `opencode.json`, env files.
Method: static, read-only. No code executed; no console/Actions/Vercel access. Therefore nothing here is a runtime or deployment claim.
This file is a faithful, condensed preservation of the audit (the original was a very long chat report). Details that live in other `.ai/` files are summarized and cross-referenced instead of duplicated. This report is historical (level 5 in the source-of-truth hierarchy). **Do not assume it is still current — re-verify against source.** Later knowledge-base corrections: C-05 (baseline wording), C-08/KI-019 (employee removal) are recorded in `PROJECT_STATE.md`.

## 1. Executive summary

Overall: two Critical Firestore privilege-escalation paths in the repo rules; a role-blind membership rule that, combined with Android assigning `companyId` to clients and pending employees, exposes private data; a rules-vs-Web-client mismatch; Android onboarding/profile/notification writes that are likely rejected; Android logout/backup/cache exposure; an unauthenticated AI API route; and public join codes (already documented by the repo as known). CI and most Android runtime behavior have never been verified.

Major confirmed issues (all static): KI-001..KI-011, KI-012, KI-013 (see `KNOWN_ISSUES.md`).
Parity: auth, onboarding, notifications and order data conventions differ materially (see `WEB_ANDROID_PARITY.md`).
Remaining verification: deployed rules, Google Sign-In, app links, CI, Storage rules, Android runtime (V1–V8).

## 2–4. Policy, role matrix, data visibility

Moved to `FLOWEXA_BUSINESS_POLICY.md`, `ROLE_PERMISSION_MATRIX.md`, `DATA_MODEL.md`.

## 5. Firestore security audit (summary)

- Tenant isolation: membership by `profile.companyId` only; self-created owner and self-changed `companyId` break it (KI-001/002).
- Client isolation: profile reads protected; orders/customers readable by members (role-blind) (KI-003); `customerPhones` is the only staff-only collection.
- Orders: `clientUid`, `customerId`, `status`, `items`, totals unvalidated on create (KI-020); creator cannot change status/items/totals later.
- User profiles: `permissions` and `companyId` not protected on self-update; admin can set any role/company (KI-002).
- Secondary collections: `notifications` update and `auditLogs` create open to any member; `orderStages`/`locations` member-wide (KI-025, OPEN-005).
- Rule evaluation: 1–3 `get()` per rule (below the 10 limit); list queries like Web `findClientByPhone` cannot satisfy the profile read rule.
- Deployment unknown. No rules tests.

## 6–7. Web and Android security (summary)

Web: services are company/user scoped (UI aligned with policy) but rules are the only real boundary; `/api/generate-description` unauthenticated (KI-012); logout leaves offline queue (KI-018); build ignores TS/ESLint errors (KI-023).
Android: sync pulls all by `companyId` for any non-pending role (KI-006); cache survives logout, `allowBackup=true` (KI-007/013); `PermissionManager` unused (C-06); sync correctness defects (KI-009).

## 8–14. Parity, UI, auth, offline, domain, deep links, CI

See `WEB_ANDROID_PARITY.md`, `ARCHITECTURE.md`, `TESTING_STATUS.md`, `SECURITY_MODEL.md`. Key facts: real logo exists as `res/drawable/flowexa_logo.png` and visually matches `public/logo.jpg`; Android lacks email-link send; Room migration test is synthetic; CI never run; assetlinks has one entry/one fingerprint; email-link intent filter lacks `autoVerify`.

## 15. DeepSeek (previous audit) findings verification

| Finding | Evidence | Result | Classification |
|---|---|---|---|
| Android lacks Web landing | Splash → Login | CONFIRMED | POLICY DECISION (OPEN-002) |
| AppLogoView uses AutoGraph | `AppLogoView.kt:41` | CONFIRMED | UI/UX PARITY GAP |
| Auth flows differ | register/join/email-link/profile model | CONFIRMED | IMPLEMENTATION BUG |
| Google Sign-In config | console unreadable | NEEDS EXTERNAL VERIFICATION | NEEDS VERIFICATION |
| Android email-link UI | no send call | CONFIRMED | FUNCTIONAL PARITY GAP |
| PermissionManager unused | no main callers | CONFIRMED | IMPLEMENTATION BUG (UI ceiling only) |
| Clients read customers/orders | rules + Android model + SyncEngine | CONFIRMED (conditional on `companyId`) | SECURITY VULNERABILITY (High) |
| Order validation | status/totals/customerId/clientUid free-form | PARTIALLY CONFIRMED | POLICY DECISION REQUIRED |
| Broad company-scoped collections | notifications/auditLogs/stages/locations | CONFIRMED | SECURITY (Low/Medium) |
| Public company/product data | `allow read: if true` | CONFIRMED | INTENTIONAL (join codes excepted) |
| Room/sync/deep links/CI need runtime checks | never run | CONFIRMED | NEEDS VERIFICATION |
| Android backup | `allowBackup=true`, no rules | CONFIRMED | SECURITY (Low/Medium) |
| customerPhones rules not published | docs say so | UNVERIFIED deployed state | NEEDS VERIFICATION |
| createdBy/updatedBy implemented | `SyncEngine.applyOperation` | IMPLEMENTED BUT NOT RUNTIME VERIFIED | — |
| BonusCalculator fixed | code + 15 tests | IMPLEMENTED BUT NOT RUNTIME VERIFIED; parity differs | — |
| Offline auth | `ProfileLoadResult` | IMPLEMENTED BUT NOT RUNTIME VERIFIED | — |
| Room migration | synthetic test only | PARTIAL | — |
| Deep links/assetlinks | code + tests | IMPLEMENTED BUT NOT RUNTIME VERIFIED | — |
| CI smoke/signing | workflows exist | IMPLEMENTED BUT NOT RUNTIME VERIFIED | — |
| Order consistency | `saveOrderWithItems` | IMPLEMENTED BUT NOT RUNTIME VERIFIED | — |
| Sync permission handling | `markFailedPermanent` | IMPLEMENTED BUT NOT RUNTIME VERIFIED | — |

## 16. Confirmed security vulnerabilities (static)

CRITICAL: KI-001 (self-created owner), KI-002 (self/ admin company & role changes). HIGH: KI-003, KI-005, KI-006, KI-007. MEDIUM: KI-012 (+ KI-020 integrity, policy). LOW/MEDIUM: KI-013. LOW: KI-018, KI-025, KI-026.

## 18. Verification tasks

- **V1** Which Firestore rules are deployed on `ai-studio-c5fd0d2f-…` and whether Web client ordering works in staging (`firebase firestore:rules:get --database …` or console; diff vs repo). Decides deploy order of T02.
- **V2** Google Sign-In: SHA-1/256 for debug, release, Play App Signing; Android OAuth client; web client ID for `default_web_client_id`.
- **V3** App links: Vercel `assetlinks.json`; Firebase auth-domain `assetlinks`; `adb shell pm get-app-links com.flowexa.app`; real email link on device.
- **V4** Run `build-flowexa-apk.yml` (`workflow_dispatch`), the instrumented migration job, record results.
- **V5** Count production `userProfiles` with `role in [client, pending_employee]` and non-empty `companyId` (decides OPEN-003).
- **V6** Rotate all `joinCode`/`clientJoinCode` after a fix (they were publicly readable).
- **V7** Android runtime matrix: register, onboarding (3 paths), approval, order create/sync, logout + re-login as another user, offline/reconnect, deep links.
- **V8** Inspect Storage rules in the console (none in repo; Web uploads to `clientLogos/{uid}/…`).

## 19. Policy decisions required

OPEN-001..OPEN-008 in `DECISIONS.md`.

## 20. Implementation tasks (PROPOSED — none implemented)

Authorization: editing `firestore.rules` (T01/T02/T05) requires explicit user authorization; rules must never be published by an agent. Never touch `android/`, `.github/workflows/*`, `scripts/ci/*`, keystores, `google-services.json`, `opencode.json`, `assetlinks` identity entries.

Index: P0 T01 (profile rules), T02 (staff-only membership + client create). P1 T03 (Android role-scoped sync), T04 (Android logout wipe), T05 (join codes out of public doc), T06 (Android onboarding/profile/notification writes). P2 T07 (backup), T08 (AI route auth), T09 (email-link send), T10 (`source:"customer"`), T11 (staff sync). P3 T12 (logo), T13 (bonus parity), T14 (Web logout queue clear). Addendum T15 (Web employee removal).

### TASK 01 — Block profile self-escalation (P0, SECURITY VULNERABILITY CRITICAL, confidence HIGH)
**STATUS UPDATE 2026-10-07 (added by reviewer; original audit text below is unchanged):** an uncommitted implementation exists; rules code matches this spec and was independently verified (83/83 Emulator tests). Review gate result: **FAIL** — missing `tests/firestore.rules.test.ts`, unusable `test:rules`, `package.json` ERESOLVE/lockfile problem, no `.ai` records. See `claude/VERIFICATION_REPORT.md` VER-001. Not committed/pushed/deployed.
Problem: KI-001/KI-002. Affected: `firestore.rules`; new `tests/firestore.rules.test.ts`; `package.json` devDependency `@firebase/rules-unit-testing` (and a runner such as vitest).
Required behavior: new self-created profile may be `client`, `pending_employee`, or `owner` of a company with `ownerId == uid`; self-update may not change `role`/`permissions`; self-update may change `companyId` only if current role is `client`/`pending_employee`; admin may update non-owner members only, never set `owner`, never move members to another company; approval (`companyId = pendingCompanyId`) and rejection (`companyId == ''`) keep working.
Code (rules):
```
function isSafeSelfProfileCreate(data) {
  return data.role in ['client', 'pending_employee'] ||
         (data.role == 'owner' && data.companyId is string &&
          exists(/databases/$(database)/documents/companies/$(data.companyId)) &&
          get(/databases/$(database)/documents/companies/$(data.companyId)).data.ownerId == request.auth.uid);
}
// create: add  && isSafeSelfProfileCreate(request.resource.data)
// update: replace the (self || admin || sysadmin) group with:
(
  (request.auth.uid == userId &&
   areImmutableFieldsUnchanged(['role', 'permissions']) &&
   (resource.data.role in ['client', 'pending_employee'] || areImmutableFieldsUnchanged(['companyId']))) ||
  (resource != null && resource.data.role != 'owner' && request.resource.data.role != 'owner' && (
    (isCompanyAdmin(resource.data.companyId) && request.resource.data.companyId == resource.data.companyId) ||
    (('pendingCompanyId' in resource.data) && resource.data.pendingCompanyId != null &&
     isCompanyAdmin(resource.data.pendingCompanyId) &&
     (request.resource.data.companyId == resource.data.pendingCompanyId || request.resource.data.companyId == ''))
  )) ||
  isSystemAdmin()
)
```
**AMENDMENT (KB initialization 2026-10-07, KI-019):** as written, the admin branch rejects Web's employee removal. Pending OPEN-008, extend the first admin clause to `request.resource.data.companyId == resource.data.companyId || (request.resource.data.companyId == '' && request.resource.data.role == 'client')`, and fix the Web payload in T15. Do not implement until the user decides OPEN-008.
Tests: positives — new `client`/`pending_employee` profile; company then `owner`; admin approves/rejects; admin changes `sales`→`admin`; client edits `storeName`. Negatives — owner of another's company; admin profile at create; admin sets own `companyId` to B; sales sets own `role`; user edits own `permissions`; admin sets `role: owner`; admin edits an `owner`; admin moves member to a foreign company. Regression — T02 suite, public catalog reads.
Verify: `firebase emulators:exec --only firestore "npx vitest run tests/firestore.rules.test.ts"`; do not publish.
Safe to deploy first (breaks no known flow).

### TASK 02 — Staff-only membership; restore Web client order/notification creation (P0, SECURITY HIGH, HIGH rules / MEDIUM production)
Affected: `firestore.rules`, `tests/firestore.rules.test.ts`. Gate: deploy only after T03 ships and V1 is known (old Android client builds lose order sync; pull aborts at `locations`).
Code:
```
function isCompanyMember(companyId) {
  return isAuthenticated() && getUserCompanyId() == companyId &&
         getUserRole() in ['owner', 'admin', 'sales'];
}
// replace isCompanyClient with:
function isClientRole() { return isAuthenticated() && getUserRole() == 'client'; }
// orders create:
(isCompanyStaff(request.resource.data.companyId) ||
 (isClientRole() && request.resource.data.clientUid == request.auth.uid &&
  exists(/databases/$(database)/documents/companies/$(request.resource.data.companyId))))
// notifications create: replace isCompanyClient(...) with
(isClientRole() && request.resource.data.type == 'client_order')
```
Reads of customers/orders/locations/orderStages/notifications and `auditLogs` create/`notifications` update become staff-only automatically.
Tests: attack — client or pending with `companyId = X` reads customers/orders. Positive — staff read; Web-model client creates order + `client_order` notification for X and reads own orders; admin/owner still read all. Negative — client with `companyId = X` reads customers; client reads another client's order; pending reads orders; client sets another uid as `clientUid`; order for non-existent company. Regression — T01 suite, public catalog.
Risks: Web clients lose `orderStages` (initial status falls back to `pending`; add an `onError` to `ClientProducts` stage subscription); OPEN-005.

### TASK 03 — Role-scope Android sync pull and purge leaked cache (P1, SECURITY HIGH)
Affected: `sync/SyncEngine.kt`, DAOs (`CustomerDao`, `CustomerPhoneDao`, `OrderDao`, `NotificationDao`).
Required: staff unchanged; client = company, products, categories, brands + own orders (`createdBy == uid` and `clientUid == uid`, distinct by id) + own notifications (`clientUid == uid`); pending/unknown role = pull nothing; on client sync purge cached customers, phones, locations?, stages?, foreign orders.
Sketch: read role first; `if (!isStaff && !isClient) return success`; keep steps 1–4 for both; staff keeps 5–10; client branch as above; DAO additions `deleteAll()` for customers/customer_phones and `deleteForeignOrders(uid)` (`DELETE FROM orders WHERE createdBy != :uid AND (clientUid IS NULL OR clientUid != :uid)`), `deleteOrphanItems()`.
Blocked detail: `OrderItemEntity` foreign key/cascade not read — verify before writing purge. Tests: role-switch unit test; device check that a client has no customer/phone/foreign-order rows. Risks: client UI that used cached customers/locations (re-test `ClientCreateOrder`).

### TASK 04 — Wipe local data and stop sync on Android logout (P1, SECURITY HIGH)
Affected: `AuthRepository.kt`, `SyncScheduler.kt`, `FlowexaApp.kt` (two logout call sites).
Code: `SyncScheduler.cancelAll(context)` (cancel unique one-time and periodic work); `logout()` = `auth.signOut(); database.clearAllTables()`; `hasUnsyncedChanges()` (PENDING+PROCESSING+FAILED > 0) and a confirmation dialog before logout (UI not specified: call sites/Settings screen not read). `clearAllTables` also clears `call_recordings` — confirm local-only. Tests: instrumented — insert customer/order/outbox, log out, assert empty tables. Firestore SDK persistence is not cleared (needs `terminate`+`clearPersistence`; `FirebaseProvider` init not analyzed).

### TASK 05 — Move join codes out of the public company document (P1, SECURITY HIGH; phases A/B only)
Affected: `firestore.rules`, Web `onboardingService.ts`, `CompanySettings.tsx`, Android `CompanyRepository.kt`. Relation to DEC-009: this is a PROPOSED variant of the repo's plan.
Rules (phase A):
```
match /joinCodes/{code} {
  allow get: if isAuthenticated();
  allow list: if false;
  allow create, update: if isAuthenticated() &&
    request.resource.data.keys().hasOnly(['companyId','kind','createdAt','createdBy','updatedAt','updatedBy']) &&
    request.resource.data.kind in ['employee','client'] &&
    isCompanyAdmin(request.resource.data.companyId);
  allow delete: if false;
}
match /companyPrivate/{companyId} {
  allow read: if isAuthenticated() && (isCompanyAdmin(companyId) || isSystemAdmin());
  allow create, update: if isAuthenticated() && isCompanyAdmin(companyId);
}
```
Blocked: Web/Android lookup changes and backfill not specified until `CompanySettings.tsx` and Android company settings are read and V5/V6 are answered. Phase C (restrict `companies` read) blocked on OPEN-001/V6.

### TASK 06 — Fix Android register/onboarding/join/notification writes (P1, IMPLEMENTATION BUG, MEDIUM)
Affected: `AuthRepository.kt`, `CompanyRepository.kt`, `FlowexaApp.kt`, maybe `UserProfileEntity.kt` (+Room migration 2→3 if `pendingCompanyId` is added).
Required: `register` creates the Firebase account only (`Result<Unit>`; set display name via profile change request); profile writes use `OutboxOp.CREATE` when no remote profile exists; employee join payload = `role pending_employee`, `companyId ""`, `pendingCompanyId X`, `companyName`; notification = doc `join_<uid>`, `type join_request`, `userId`, `userEmail`, `userName`, `isDeleted false`, `readBy []`; reject payload = `pendingCompanyId null`, `companyId ""`, `role client`.
Blocked: local `pendingCompanyId` storage decision (Room migration vs remote-only) and Staff/Pending screens not read; existing profiles = OPEN-003.
Tests: payload-builder unit tests; manual — email register → create company; Google first sign-in → join as employee; Web admin sees `join_request` and approves.

### TASK 07 — Disable Android backup (P2, LOW–MEDIUM)
`AndroidManifest.xml`: `android:allowBackup="true"` → `"false"`. Test: `aapt2 dump xmltree`. Risk: reinstall no longer restores local data (Firestore remains source of truth).

### TASK 08 — Authenticate `/api/generate-description` (P2, MEDIUM)
Affected: `app/api/generate-description/route.ts`, `components/ProductFormDialog.tsx` (line ~283 fetch; lines 275-300 not read). Approach: require `Authorization: Bearer <Firebase ID token>`, verify via Identity Toolkit REST `accounts:lookup?key=<public web apiKey from firebase-applet-config.json>` (no new dependency), cap `name` ≤200 and `categoryId` ≤100; client sends `await auth.currentUser?.getIdToken()`. Tests: 401 without token, 200 with, 400 oversize. Rate limiting out of scope.

### TASK 09 — Android email sign-in link send UI (P2, PARITY GAP)
Affected: `AuthRepository.kt`, `LoginScreen.kt`, `FlowexaApp.kt`. Use `actionCodeSettings { url = WEB_BASE_URL; handleCodeInApp = true; setAndroidPackageName("com.flowexa.app", false, "1"); linkDomain = FIREBASE_AUTH_LINK_HOST }` then `sendSignInLinkToEmail`. UI blocked until `LoginScreen.kt` is read; confirm `linkDomain` exists in the pinned BoM. Depends on V3.

### TASK 10 — Android client orders `source: "customer"` (P2, IMPLEMENTATION BUG)
`FlowexaApp.kt` ClientCreateOrder: `source = "client"` → `source = "customer"`. No other Android code checks `"client"` as a source (grep). Existing Android orders with `"client"` remain misclassified (backfill not specified).

### TASK 11 — Android staff profile sync and join-request-driven approval (P2, PARITY GAP)
Add an admin/owner pull of `userProfiles where companyId == X`; pending web-model users (`companyId ''`) are not listable by admins under the rules, so approval must be driven by `join_request` notifications (`userId`), as on Web. Code blocked until `StaffScreen.kt`, `NotificationsScreen.kt`, `NotificationDao` are read and T06 model is chosen.

### TASK 12 — Real logo in `AppLogoView` (P3, UI/UX)
Replace the blue `Box` + `Icon` with `Image(painterResource(R.drawable.flowexa_logo), …, ContentScale.Fit)` clipped to a rounded rect; remove unused imports; asset is small (~192 px) — check sharpness at 64 dp.

### TASK 13 — Bonus tier selection parity (P3, BLOCKED on OPEN-007)
`BonusCalculator.calculateTieredBonus`: `val chosen = tiers.firstOrNull { it.appliesTo(quantity, invoiceType) } ?: return 0.0` (keep `fixedBonus` only when `percent == 0`); verify `BonusTierParser` preserves array order; update `BonusCalculatorTest` cases that assert highest-`minQty`-wins.

### TASK 14 — Clear Web offline queue on logout (P3, LOW)
`writeQueue.ts`: add `clearWriteQueue()` (`store.removeItem(QUEUE_KEY)`, `setPendingCount(0)`); `authService.logout`: after `signOut`, call it; warn first if `getPendingCount() > 0`. Firestore IndexedDB persistence not cleared (needs `terminate` + `clearIndexedDbPersistence` + reload).

### TASK 15 (ADDENDUM, KB initialization) — Web employee removal payload (BLOCKED on OPEN-008)
`components/CompanySettings.tsx` `handleRemoveEmployee` writes `{companyId:null, role:null}`; `isValidUserProfile` rejects `role: null`. Proposed (after the user decides): write `{companyId:'', role:'client'}` (precedent: join-request rejection) and amend T01's admin branch as above. Evidence: KI-019. Not implemented.

## 21. Implementation order (proposed)

T01 (+ rules test harness) → T03 → T04 → T07 → T06 → ship an Android release → answer V1, V5, V6 → T02 (deploy gated on shipped T03/T06 and V1) → T05 phases A/B → T08 → T10 → T09 (needs V3) → T11 (needs T06) → T12 → T13 (needs OPEN-007) → T14 → T15 (needs OPEN-008).

## 22. Handoff to DeepSeek (as issued)

Do not invent requirements; do not fix unconfirmed issues; do not change intentional Flowexa behavior (public catalog data); do not modify `android/`; do not modify signing/keystore material; do not expose secrets; follow confirmed tasks exactly; run specified tests after each logical group; if the repository contradicts the plan, stop and report; stop and ask on any "CODE CANNOT BE SAFELY GENERATED" note, a Room schema change, an unanswered OPEN decision, or any step needing external consoles/devices.

## Reading coverage and limits (for future auditors)

Read in full: `firestore.rules`, all `lib/services/*`, `lib/offline/*`, `lib/store.ts`, `AuthProvider`, `app/page.tsx` auth logic, Android sync/auth/company/order repositories, `PermissionManager`, `BonusCalculator`, `OrderRules`, `DeepLink`, `MainActivity`, `AppLogoView`, manifest, key parts of `FlowexaApp.kt`, CI workflows/scripts. Partial or not read: most Web dashboard components; Android Staff/Notifications/Settings/Products/Customers/Admin/Client/Catalog screens; `CustomerRepository`; `FirestoreMappers` beyond a few lines; legacy `android/`; protected files.
